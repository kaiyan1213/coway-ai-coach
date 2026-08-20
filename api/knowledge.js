'use strict';
// api/knowledge.js — 知识库管理（Manager 专用）
//
// 所有请求需带 Authorization: Bearer <manager token>（登录 /api/auth?mgr=1 拿到）
//
// GET  /api/knowledge                    → 列出所有知识条目
// POST /api/knowledge?action=add         → 新增一条知识
// POST /api/knowledge?action=delete      → 删除一条知识 { id }
// POST /api/knowledge?action=toggle      → 启用/停用一条知识 { id, is_active }

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const ALLOWED_CATEGORIES = ['价格_Pricelist', 'Promotion_Memo', '产品知识', '话术FAQ', 'Flow内容', '下单后_流程', '销售话术', '下单前_产品', '下单前_安装'];
// ─────────────────────────────────────────────────────────────────────────────

const { createClient } = require('@supabase/supabase-js');
const { authManager }  = require('../lib/managerAuth');

function supabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

module.exports = async (req, res) => {
  const db = supabase();
  if (!(await authManager(req, db))) {
    return res.status(401).json({ error: '无权限，需要 Manager 登录' });
  }

  const { action } = req.query;

  // GET — 列出知识库
  if (req.method === 'GET') {
    const { data, error } = await db
      .from('knowledge_base')
      .select('id, category, product, topic, content, keywords, is_active, updated_at')
      .order('category')
      .order('product', { nullsFirst: true })
      .order('topic');
    if (error) return res.status(500).json({ error: '读取失败' });
    return res.status(200).json({ knowledge: data });
  }

  // POST add — 新增知识条目
  if (req.method === 'POST' && action === 'add') {
    const { category, product, topic, content, keywords } = req.body || {};
    if (!category || !topic || !content) {
      return res.status(400).json({ error: 'category / topic / content 必填' });
    }
    if (!ALLOWED_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: '无效 category' });
    }
    const { data, error } = await db
      .from('knowledge_base')
      .insert({ category, product: product || null, topic, content, keywords: keywords || null })
      .select()
      .single();
    if (error) return res.status(500).json({ error: '新增失败' });
    return res.status(201).json({ entry: data });
  }

  // POST delete — 删除
  if (req.method === 'POST' && action === 'delete') {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: '缺少 id' });
    const { error } = await db.from('knowledge_base').delete().eq('id', id);
    if (error) return res.status(500).json({ error: '删除失败' });
    return res.status(200).json({ ok: true });
  }

  // POST toggle — 启用/停用
  if (req.method === 'POST' && action === 'toggle') {
    const { id, is_active } = req.body || {};
    if (!id || is_active === undefined) return res.status(400).json({ error: '缺少参数' });
    const { data, error } = await db
      .from('knowledge_base')
      .update({ is_active })
      .eq('id', id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: '更新失败' });
    return res.status(200).json({ entry: data });
  }

  return res.status(400).json({ error: '未知操作' });
};
