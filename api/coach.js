'use strict';
// api/coach.js — AI 调用（截图回复教练 / 纯知识问答）
// RAG 架构：不再全量倒知识库，改为智能搜索相关条目再传给 Claude

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const MODELS = {
  screenshot: 'claude-sonnet-4-6',
  qa:         'claude-haiku-4-5-20251001',
};
const MAX_TOKENS = {
  screenshot: 2000,
  qa:         700,
};
const HISTORY_LIMIT   = 10; // 截图模式最多带入多少条历史情境
const KB_SEARCH_LIMIT = 8;  // 每次最多检索多少条知识

// 两种模式共用的行为规则（调 prompt 改这里）
const SYSTEM_RULES = `你是 Coway 销售团队的 AI 教练助手，帮 staff 知道怎么回复顾客。

═══ 铁律（必须遵守，没有例外）═══

铁律 1 — 收尾必问句：
每一条回复，最后都必须以「问句」结尾，把对话权交回给顾客，不让顾客 seen 完就消失。
当顾客已经了解产品、准备好的时候，永远先问：
「老板你现在有没有大概1到2分钟的时间？我帮你做一个简单的申请，不会很久的，1到2分钟就可以了」
⚠️ 绝对不可以直接 send 申请表格！永远先问有没有1-2分钟。

铁律 2 — 永远推 WOW 7：
价格方面永远推荐 WOW 7（7年分期），这是顾客花最少钱、最划算的配套。
原因：顾客买得开心才做得开心，赚最多 commission 不是目标，让顾客拿到最优惠价格才是。

铁律 3 — 问题结尾的层次：
第一层（了解需求）：「老板你家里有几口人呢？」
第二层（推荐后）：「老板你看这款适合你吗？」
第三层（异议处理后）：「老板除了这个还有什么问题吗？」
第四层（准备申请）：「老板你现在有没有1-2分钟？我帮你做申请咯」

═══ 语言风格（非常重要）═══

你的回复必须像马来西亚华人在 WhatsApp 聊天——地道、亲切、自然。
具体要求：
- 用马来西亚华语口语：「咯」「lor」「lah」「罢了」「而已」「酱」「这样」「可以哦」「没问题的」
- 自然中英夹杂（Manglish 风格）：例如「这个 package 真的很 worth it lor」「你试试看 lah，不会后悔的」
- 称呼用「老板」「老板娘」「朋友」，亲切但不失礼
- 语气像朋友、像身边的销售 kakak/kawan，不要像 AI 机器人
- 价格/产品数字要准确，但语气要轻松：「才 RM X 左右罢了，不贵的」
- 遇到顾客拒绝，要温柔跟进，不要强迫，给空间但要留下问句

═══ 下单流程（必须准确，说错会出问题）═══

- 申请截止：下午 2pm
- 申请结果：最快明天才知道（不是当天！绝不能说当天出结果）
- 安装安排：给了钱之后，后天才可以选择安装日期（不是当天或次日）
- 正确说法例子：「老板，你今天 2pm 前给我资料申请的话，最快明天就会知道申请结果咯。批准之后你付款，后天就可以安排安装日期了，很快的！」

═══ 内容规则 ═══

1. 只根据【相关产品知识】里的内容陈述事实（价格/颜色/型号/规格/促销）。
   知识库没有的事实，明说"这个我不确定，我帮你问一下 lah"，绝不编造。
2. 先给重点，不长篇大论，像真人发 WhatsApp 一样简短有力。
3. 截图分析模式：先判断客户真正的顾虑，再给建议；
   如果客户历史里有相关情境（比如上次嫌贵），要利用起来。`;
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

// 命中的知识条目里第一个带 product 的，去产品图册配一张图
async function findProductImage(knowledgeItems, db) {
  const matchedProduct = knowledgeItems.find(k => k.product);
  if (!matchedProduct) return { productImage: null, productName: null };
  const { data: prod } = await db.from('products')
    .select('name, image_url')
    .eq('is_active', true)
    .ilike('name', `%${matchedProduct.product}%`)
    .limit(1)
    .maybeSingle();
  return prod
    ? { productImage: prod.image_url, productName: prod.name }
    : { productImage: null, productName: null };
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

// 解析 AI 返回的 JSON，兼容 Markdown 代码块、前后杂文、嵌套字符串
function parseJSON(text) {
  // 1. 先尝试整体解析
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  try { return JSON.parse(cleaned); } catch { /* fall through */ }

  // 2. 用平衡括号提取最外层 {} 块，正确处理字符串内的括号
  const start = text.indexOf('{');
  if (start !== -1) {
    let depth = 0, inStr = false, escape = false;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (escape)          { escape = false; continue; }
      if (ch === '\\' && inStr) { escape = true;  continue; }
      if (ch === '"')       { inStr = !inStr;      continue; }
      if (inStr)            { continue; }
      if (ch === '{')       { depth++; }
      else if (ch === '}')  { depth--; if (depth === 0) { try { return JSON.parse(text.slice(start, i + 1)); } catch { break; } } }
    }
  }
  throw new Error('AI 返回格式错误，请重试');
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const staffName = auth(req);
  if (!staffName) return res.status(401).json({ error: '未授权，请重新登录' });

  const { customerId, mode, images, note, question, flow, flowLabel } = req.body || {};
  if (!mode) return res.status(400).json({ error: '缺少必要参数' });

  const db = supabase();
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // 如果有 customerId，验证归属并拉历史；没有则跳过（快速问答模式）
  let customer = null;
  let historyText = '';
  let qaHistory = [];
  let historyItems = [];   // 原始历史记录（外层可访问）
  if (customerId) {
    const { data: c } = await db
      .from('customers')
      .select('id, label')
      .eq('id', customerId)
      .eq('staff_name', staffName)
      .single();
    if (!c) return res.status(403).json({ error: '无权访问此客户' });
    customer = c;

    const { data: history } = await db
      .from('interactions')
      .select('situation_summary, ai_suggestion, created_at')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(HISTORY_LIMIT);

    historyItems = history || [];

    // 截图分析历史用于上下文摘要
    historyText = [...historyItems].reverse()
      .map(i => `[${new Date(i.created_at).toLocaleDateString('zh-CN')}] ${i.situation_summary}`)
      .join('\n');

    // QA 对话轮次（最近6条）用于多轮对话记忆
    qaHistory = historyItems
      .filter(i => i.situation_summary?.startsWith('问：'))
      .reverse()
      .slice(-6);
  }

  // ── 模式 A：截图回复教练 ────────────────────────────────────────────────
  if (mode === 'screenshot') {
    if (!images || !images.length) {
      return res.status(400).json({ error: '截图模式需要至少一张图片' });
    }

    // 根据 flow 阶段确定搜索关键词，优先搜对应脚本
    const FLOW_SEARCH = {
      flow1:   'FLOW 1 SCRIPT',
      flow2:   'FLOW 2 SCRIPT',
      flow3:   'FLOW 3 SCRIPT',
      quality: 'QUALITY FOLLOW UP',
      daily:   'Follow Up Day 1',
    };
    const flowSearchTerm = (flow && FLOW_SEARCH[flow]) || '';
    const baseQuery = [note, historyItems[0]?.situation_summary].filter(Boolean).join(' ');

    // flow 脚本 + 通用知识并行搜索（互不依赖，并行能省一轮网络往返），再合并去重
    const [flowItems, generalItems] = await Promise.all([
      flowSearchTerm ? searchKnowledge(flowSearchTerm, db, anthropic) : Promise.resolve([]),
      searchKnowledge(baseQuery || '销售', db, anthropic),
    ]);
    const seen = new Set();
    let knowledgeItems = [];
    for (const item of [...flowItems, ...generalItems]) {
      const key = `${item.category}|${item.topic}`;
      if (!seen.has(key)) { seen.add(key); knowledgeItems.push(item); }
    }
    knowledgeItems = knowledgeItems.slice(0, KB_SEARCH_LIMIT);
    const knowledgeText = formatKnowledge(knowledgeItems);

    // flow 阶段说明（给 Claude 的上下文）
    const flowContext = (flow && flow !== 'skip' && flowLabel)
      ? `【当前销售阶段】${flowLabel}\n请严格根据这个阶段的话术和策略来给出建议，不要跨阶段。`
      : '';

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
          flowContext,
          historyText  ? `【该客户历史情境（供参考）】\n${historyText}` : '',
          knowledgeText || '',
          note         ? `【补充说明】${note}` : '',
          '\n⚠️ 只输出下面的 JSON，不要任何额外文字、标题、解释、Markdown：\n{"situation_summary":"一句话总结当前情境","suggestion":"可直接复制发给客户的回复文案","reasoning":"为什么这样回（1-2句）","used_knowledge":true}',
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

    const { productImage, productName } = await findProductImage(knowledgeItems, db);

    return res.status(200).json({
      suggestion:        parsed.suggestion,
      reasoning:         parsed.reasoning,
      situation_summary: parsed.situation_summary,
      used_knowledge:    parsed.used_knowledge,
      product_image:     productImage,
      product_name:      productName,
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

    // 构建多轮对话 messages，让 AI 记住本次对话上下文
    const messages = [];

    // 把之前的 QA 轮次作为真实 user/assistant 消息传入
    for (const h of qaHistory) {
      const prevQ = h.situation_summary.replace(/^问：/, '').trim();
      messages.push({ role: 'user',      content: prevQ });
      messages.push({ role: 'assistant', content: h.ai_suggestion });
    }

    // 当前问题（附带知识库 + JSON 格式要求）
    messages.push({
      role: 'user',
      content: [
        knowledgeText || '【知识库暂无相关记录，请如实告知不确定】',
        historyText ? `【该客户截图分析历史（供参考）】\n${historyText}` : '',
        `问题：${question.trim()}`,
        '⚠️ 只回答上面这个新问题，不要延续上一轮对话的话题（除非这个问题本身就是在追问上一轮的内容）。',
        '请以严格 JSON 格式回复（不要 Markdown）：\n{"answer":"回答内容","answered":true}\n如知识库完全覆盖不到，answered 用 false。',
      ].filter(Boolean).join('\n\n'),
    });

    const response = await anthropic.messages.create({
      model: MODELS.qa,
      max_tokens: MAX_TOKENS.qa,
      system: [{ type: 'text', text: SYSTEM_RULES, cache_control: { type: 'ephemeral' } }],
      messages,
    });

    const parsed = parseJSON(response.content[0].text);

    await db.from('qa_log').insert({
      staff_name: staffName,
      question:   question.trim(),
      answer:     parsed.answer,
      answered:   parsed.answered,
    });

    // 如果在客户 thread 里问的，也存进 interactions，让对话记录完整
    if (customerId && customer) {
      await db.from('interactions').insert({
        customer_id:       customerId,
        staff_name:        staffName,
        situation_summary: `问：${question.trim()}`,
        ai_suggestion:     parsed.answer,
      });
      await db.from('customers')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', customerId);
    }

    const { productImage, productName } = await findProductImage(knowledgeItems, db);

    return res.status(200).json({
      answer: parsed.answer,
      answered: parsed.answered,
      product_image: productImage,
      product_name: productName,
    });
  }

  return res.status(400).json({ error: '未知模式' });
};
