'use strict';
// api/coach.js — AI 调用（截图回复教练 / 纯知识问答）
// RAG 架构：不再全量倒知识库，改为智能搜索相关条目再传给 Claude

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const MODELS = {
  screenshot: 'claude-sonnet-4-6',
  qa:         'claude-haiku-4-5-20251001',
};
const MAX_TOKENS = {
  screenshot: 1500,
  qa:         600,
};
const HISTORY_LIMIT   = 10; // 截图模式最多带入多少条历史情境
const KB_SEARCH_LIMIT = 8;  // 每次最多检索多少条知识

// 两种模式共用的行为规则（调 prompt 改这里）
const SYSTEM_RULES = `你是 Coway 销售团队的 AI 教练助手。

硬规则：
1. 只根据【相关产品知识】里的内容陈述事实（价格/颜色/型号/规格/促销）。知识库没有的事实，明说"这个我不确定，建议跟主管确认"，绝不编造。
2. 回复建议要口语化、像资深销售同事，符合马来西亚华人销售场景，可中英混用，跟随 staff/客户使用的语言。
3. 先给重点，不长篇大论。
4. 截图分析模式：先判断客户真正的顾虑，再给建议；如果客户历史里有相关情境（比如上次嫌贵），要利用起来。`;
// ─────────────────────────────────────────────────────────────────────────────

const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');
const { verifyToken } = require('../lib/token');

function supabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function auth(req) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  return verifyToken(token);
}

// ── Step 1：用 Haiku 把问题/情境蒸馏成 2-3 个搜索关键词 ──────────────────────
// 成本极低（~100 input + 20 output tokens），但大幅提升搜索准确率
async function extractSearchTerms(text, anthropic) {
  if (!text || !text.trim()) return [];
  try {
    const res = await anthropic.messages.create({
      model: MODELS.qa,
      max_tokens: 80,
      messages: [{
        role: 'user',
        content: `从以下问题提取1-3个最关键的中文搜索词（用于搜索Coway产品知识库）。
返回严格JSON：{"terms":["词1","词2"]}，只返回JSON。

问题：${text.trim().slice(0, 200)}`,
      }],
    });
    const parsed = JSON.parse(
      res.content[0].text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    );
    return Array.isArray(parsed.terms) ? parsed.terms.filter(Boolean) : [text];
  } catch {
    return [text]; // fallback：用原文搜索
  }
}

// ── Step 2：图书管理员搜索（关键词提取 + 多词合并去重） ─────────────────────
async function searchKnowledge(queryText, db, anthropic) {
  if (!queryText || !queryText.trim()) return [];

  // 先用原文搜，快速判断有没有精确命中
  const { data: direct } = await db.rpc('search_knowledge', {
    query_text: queryText.trim(),
    max_results: KB_SEARCH_LIMIT,
  });

  // 如果精确搜已有结果，直接用
  if (direct && direct.length >= 2) return direct;

  // 精确搜结果少 → 用 Haiku 提取关键词再搜
  const terms = await extractSearchTerms(queryText, anthropic);
  const seen = new Set((direct || []).map(i => `${i.category}|${i.topic}`));
  const results = [...(direct || [])];

  for (const term of terms) {
    if (term === queryText.trim()) continue; // 避免重复搜同一词
    const { data } = await db.rpc('search_knowledge', {
      query_text: term,
      max_results: 5,
    });
    for (const item of (data || [])) {
      const key = `${item.category}|${item.topic}`;
      if (!seen.has(key)) { seen.add(key); results.push(item); }
    }
  }
  return results.slice(0, KB_SEARCH_LIMIT);
}

// 把检索结果格式化成给 Claude 看的文字
function formatKnowledge(items) {
  if (!items.length) return '';
  return '【相关产品知识】\n' + items.map(item => {
    let t = `[${item.category}]`;
    if (item.product) t += ` ${item.product}`;
    t += ` — ${item.topic}:\n${item.content}`;
    return t;
  }).join('\n\n');
}

// 解析 AI 返回的 JSON（兼容 Markdown 代码块包裹）
function parseJSON(text) {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  try { return JSON.parse(cleaned); } catch { /* fall through */ }
  const match = text.match(/\{[\s\S]*\}/);
  if (match) { try { return JSON.parse(match[0]); } catch { /* fall through */ } }
  throw new Error('AI 返回格式错误，请重试');
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const staffName = auth(req);
  if (!staffName) return res.status(401).json({ error: '未授权，请重新登录' });

  const { customerId, mode, images, note, question } = req.body || {};
  if (!customerId || !mode) return res.status(400).json({ error: '缺少必要参数' });

  const db = supabase();

  // 验证 customerId 属于此 staff（防越权）
  const { data: customer } = await db
    .from('customers')
    .select('id, label')
    .eq('id', customerId)
    .eq('staff_name', staffName)
    .single();
  if (!customer) return res.status(403).json({ error: '无权访问此客户' });

  // 拉取该客户最近互动历史
  const { data: history } = await db
    .from('interactions')
    .select('situation_summary, created_at')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(HISTORY_LIMIT);

  const historyText = (history || []).reverse()
    .map(i => `[${new Date(i.created_at).toLocaleDateString('zh-CN')}] ${i.situation_summary}`)
    .join('\n');

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // ── 模式 A：截图回复教练 ────────────────────────────────────────────────
  if (mode === 'screenshot') {
    if (!images || !images.length) {
      return res.status(400).json({ error: '截图模式需要至少一张图片' });
    }

    // 用备注 + 最近一条历史作为搜索上下文，找相关知识
    const searchQuery = [note, history?.[0]?.situation_summary].filter(Boolean).join(' ');
    const knowledgeItems = await searchKnowledge(searchQuery, db, anthropic);
    const knowledgeText  = formatKnowledge(knowledgeItems);

    // 组装图片 blocks
    const imageBlocks = images.slice(0, 3).map(dataURL => {
      const match = dataURL.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) throw new Error('图片格式无效');
      return { type: 'image', source: { type: 'base64', media_type: match[1], data: match[2] } };
    });

    const userContent = [
      ...imageBlocks,
      {
        type: 'text',
        text: [
          historyText  ? `【该客户历史情境（供参考）】\n${historyText}` : '',
          knowledgeText || '',
          note         ? `【补充说明】${note}` : '',
          '\n请分析以上 WhatsApp 截图，以严格 JSON 格式回复（不要 Markdown，不要其他文字）：\n{"situation_summary":"一句话总结当前情境","suggestion":"可直接复制发给客户的回复文案","reasoning":"为什么这样回（1-2句）","used_knowledge":true}',
        ].filter(Boolean).join('\n\n'),
      },
    ];

    // SYSTEM_RULES 固定，加 cache_control 节省 token 费用
    const response = await anthropic.messages.create({
      model: MODELS.screenshot,
      max_tokens: MAX_TOKENS.screenshot,
      system: [{ type: 'text', text: SYSTEM_RULES, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: userContent }],
    });

    const parsed = parseJSON(response.content[0].text);

    // 写入 interactions（截图用完即弃，不落库）
    await db.from('interactions').insert({
      customer_id: customerId,
      staff_name:  staffName,
      situation_summary: parsed.situation_summary,
      ai_suggestion:     parsed.suggestion,
    });
    await db.from('customers')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', customerId);

    return res.status(200).json({
      suggestion:        parsed.suggestion,
      reasoning:         parsed.reasoning,
      situation_summary: parsed.situation_summary,
      used_knowledge:    parsed.used_knowledge,
    });
  }

  // ── 模式 B：纯知识问答 ──────────────────────────────────────────────────
  if (mode === 'qa') {
    if (!question || !question.trim()) {
      return res.status(400).json({ error: '问题不能为空' });
    }

    // 图书管理员搜索相关知识
    const knowledgeItems = await searchKnowledge(question, db, anthropic);
    const knowledgeText  = formatKnowledge(knowledgeItems);

    const userMessage = [
      knowledgeText || '【知识库暂无相关记录，请如实告知不确定】',
      `问题：${question.trim()}`,
      '请以严格 JSON 格式回复（不要 Markdown）：\n{"answer":"回答内容","answered":true}\n如知识库完全覆盖不到，answered 用 false。',
    ].join('\n\n');

    const response = await anthropic.messages.create({
      model: MODELS.qa,
      max_tokens: MAX_TOKENS.qa,
      system: [{ type: 'text', text: SYSTEM_RULES, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: userMessage }],
    });

    const parsed = parseJSON(response.content[0].text);

    await db.from('qa_log').insert({
      staff_name: staffName,
      question:   question.trim(),
      answer:     parsed.answer,
      answered:   parsed.answered,
    });

    return res.status(200).json({ answer: parsed.answer, answered: parsed.answered });
  }

  return res.status(400).json({ error: '未知模式' });
};
