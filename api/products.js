'use strict';
// api/products.js — 产品图册
//
// GET  /api/products                    → 列出上架产品（staff 或 manager token 均可）
// POST /api/products?action=add         → 新增 { name, image_url, product_url }（Manager only）
// POST /api/products?action=update      → 编辑 { id, name, image_url, product_url, is_active, sort_order }（Manager only）
// POST /api/products?action=delete      → 删除 { id }（Manager only）

const { createClient } = require('@supabase/supabase-js');
const { verifyToken }   = require('../lib/token');
const { authManager }   = require('../lib/managerAuth');

function supabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function bearer(req) {
  const h = req.headers['authorization'] || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}

module.exports = async (req, res) => {
  const db = supabase();

  // GET — staff 或 manager 都可读；manager 额外能看到已下架的产品（方便管理）
  if (req.method === 'GET') {
    const token = bearer(req);
    const isStaff = !!verifyToken(token);
    const mgr = isStaff ? null : await authManager(req, db);
    if (!isStaff && !mgr) return res.status(401).json({ error: '未授权' });

    let q = db.from('products')
      .select('id, name, image_url, product_url, sort_order, is_active')
      .order('sort_order')
      .order('name');
    if (!mgr) q = q.eq('is_active', true);

    const { data, error } = await q;
    if (error) return res.status(500).json({ error: '读取失败' });
    return res.status(200).json({ products: data });
  }

  // POST — Manager only
  const mgr = await authManager(req, db);
  if (!mgr) return res.status(401).json({ error: '无权限，需要 Manager 登录' });

  const { action } = req.query;

  if (req.method === 'POST' && action === 'add') {
    const { name, image_url, product_url, sort_order } = req.body || {};
    if (!name?.trim() || !image_url?.trim())
      return res.status(400).json({ error: '名字和图片链接必填' });
    const { data, error } = await db.from('products').insert({
      name: name.trim(),
      image_url: image_url.trim(),
      product_url: product_url?.trim() || null,
      sort_order: sort_order || 0,
    }).select().single();
    if (error) return res.status(500).json({ error: '新增失败' });
    return res.status(201).json({ product: data });
  }

  if (req.method === 'POST' && action === 'update') {
    const { id, name, image_url, product_url, sort_order, is_active } = req.body || {};
    if (!id) return res.status(400).json({ error: '缺少 id' });
    const patch = {};
    if (name !== undefined) patch.name = name.trim();
    if (image_url !== undefined) patch.image_url = image_url.trim();
    if (product_url !== undefined) patch.product_url = product_url?.trim() || null;
    if (sort_order !== undefined) patch.sort_order = sort_order;
    if (is_active !== undefined) patch.is_active = !!is_active;
    const { data, error } = await db.from('products').update(patch).eq('id', id).select().single();
    if (error) return res.status(500).json({ error: '更新失败' });
    return res.status(200).json({ product: data });
  }

  if (req.method === 'POST' && action === 'delete') {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: '缺少 id' });
    const { error } = await db.from('products').delete().eq('id', id);
    if (error) return res.status(500).json({ error: '删除失败' });
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: '未知操作' });
};
