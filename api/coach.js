'use strict';
// api/coach.js — AI 调用（截图回复教练 / 纯知识问答）
//
// POST /api/coach
// Body (mode A): { customerId, mode:'screenshot', images: [dataURL,...], note? }
// Body (mode B): { customerId, mode:'qa', question }

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const MODELS = {
  screenshot: 'claude-sonnet-4-6',
  qa:         'claude-haiku-4-5-20251001',
};
const MAX_TOKENS = {
  screenshot: 1500,
  qa:         600,
};
const HISTORY_LIMIT = 10;        // 截图模式最多带入多少条历史情境
const KB_CACHE_TTL_MS = 5 * 60 * 1000; // 知识库内存缓存 5 分钟

// 两种模式共用的行为规则（调 prompt 改这里）
const SYSTEM_RULES = `你是 Coway 销售团队的 AI 教练助手。

硬规则：
1. 只根据知识库内容陈述事实（价格/颜色/型号/规格/促销活动）。知识库没有的事实，明说"这个我不确定，建议跟主管确认"，绝不编造。
2. 回复建议要口语化、像资深销售同事，符合马来西亚华人销售场景，可中英混用，跟随 staff/客户使用的语言。
3. 先给重点，不长篇大论。
4. 截图分析模式：先判断客户真正的顾虑，再给建议；如果客户历史里有相关情境（比如上次嫌贵），要利用起来。`;
// ─────────────────────────────────────────────────────────────────────────────

const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');
const { verifyToken } = require('../lib/token');

// 知识库内存缓存（注意：每个 serverless 实例各自维护，属 best-effort 缓存）
let kbCache = { data: [], ts: 0 };

function supabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// 获取知识库（带 5 分钟内存缓存）
async function getKnowledge(db) {
  if (kbCache.data.length > 0 && Date.now() - kbCache.ts < KB_CACHE_TTL_MS) {
    return kbCache.data;
  }
  const { data } = await db
    .from('knowledge_base')
    .select('category, product, topic, content, keywords')
    .eq('is_active', true)
    .order('category');
  kbCache = { data: data || [], ts: Date.now() };
  return kbCache.data;
}

// 把知识库记录格式化成可读文本
function formatKnowledge(items) {
  if (!items.length) return '【知识库目前为空，如有产品事实问题请联系经理添加】';
  const grouped = {};
  for (const item of items) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  }
  return Object.entries(grouped).map(([cat, entries]) => {
    const body = entries.map(e => {
      let t = `【${e.topic}】`;
      if (e.product) t += ` (${e.product})`;
      t += `\n${e.content}`;
      if (e.keywords) t += `\n关键词：${e.keywords}`;
      return t;
    }).join('\n\n');
    return `=== ${cat} ===\n${body}`;
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

// 从 Authorization header 验证 token
function auth(req) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  return verifyToken(token);
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

  // 拉取该客户最近互动（用于注入历史 context）
  const { data: history } = await db
    .from('interactions')
    .select('situation_summary, created_at')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(HISTORY_LIMIT);

  const historyText = (history || []).reverse()
    .map(i => `[${new Date(i.created_at).toLocaleDateString('zh-CN')}] ${i.situation_summary}`)
    .join('\n');

  // 知识库（带内存缓存）
  const kbItems = await getKnowledge(db);
  const kbText = formatKnowledge(kbItems);

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // ── 模式 A：截图回复教练 ────────────────────────────────────────
  if (mode === 'screenshot') {
    if (!images || !images.length) {
      return res.status(400).json({ error: '截图模式需要至少一张图片' });
    }

    // 组装图片 content blocks
    const imageBlocks = images.slice(0, 3).map(dataURL => {
      const match = dataURL.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) throw new Error('图片格式无效');
      return {
        type: 'image',
        source: { type: 'base64', media_type: match[1], data: match[2] },
      };
    });

    const userContent = [
      ...imageBlocks,
      {
        type: 'text',
        text: [
          historyText ? `【该客户历史情境（供参考）】\n${historyText}` : '',
          note ? `【补充说明】${note}` : '',
          `\n请分析以上 WhatsApp 截图，以严格 JSON 格式回复（不要 Markdown，不要其他文字）：\n{"situation_summary":"一句话总结当前情境","suggestion":"可直接复制发给客户的回复文案","reasoning":"为什么这样回（1-2句）","used_knowledge":true}`,
        ].filter(Boolean).join('\n\n'),
      },
    ];

    const response = await anthropic.messages.create({
      model: MODELS.screenshot,
      max_tokens: MAX_TOKENS.screenshot,
      system: [
        // 知识库 block 加 cache_control，命中后省去重复计费
        { type: 'text', text: `【产品知识库】\n${kbText}`, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: SYSTEM_RULES },
      ],
      messages: [{ role: 'user', content: userContent }],
    });

    const parsed = parseJSON(response.content[0].text);

    // 写入 interactions（截图用完即弃，绝不落库）
    await db.from('interactions').insert({
      customer_id: customerId,
      staff_name: staffName,
      situation_summary: parsed.situation_summary,
      ai_suggestion: parsed.suggestion,
    });
    // 更新 customer.updated_at（让列表按最新活动排序）
    await db.from('customers').update({ updated_at: new Date().toISOString() }).eq('id', customerId);

    return res.status(200).json({
      suggestion: parsed.suggestion,
      reasoning: parsed.reasoning,
      situation_summary: parsed.situation_summary,
      used_knowledge: parsed.used_knowledge,
    });
  }

  // ── 模式 B：纯知识问答 ──────────────────────────────────────────
  if (mode === 'qa') {
    if (!question || !question.trim()) {
      return res.status(400).json({ error: '问题不能为空' });
    }

    const response = await anthropic.messages.create({
      model: MODELS.qa,
      max_tokens: MAX_TOKENS.qa,
      system: [
        { type: 'text', text: `【产品知识库】\n${kbText}`, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: SYSTEM_RULES },
      ],
      messages: [{
        role: 'user',
        content: `问题：${question.trim()}\n\n以严格 JSON 格式回复（不要 Markdown）：\n{"answer":"回答内容","answered":true}\n如果知识库完全覆盖不到，answered 用 false。`,
      }],
    });

    const parsed = parseJSON(response.content[0].text);

    // 记录到 qa_log
    await db.from('qa_log').insert({
      staff_name: staffName,
      question: question.trim(),
      answer: parsed.answer,
      answered: parsed.answered,
    });

    return res.status(200).json({ answer: parsed.answer, answered: parsed.answered });
  }

  return res.status(400).json({ error: '未知模式' });
};
