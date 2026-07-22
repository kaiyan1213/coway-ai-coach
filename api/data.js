'use strict';
// api/data.js — 数据读写（customers / interactions）
//
// 所有请求必须带 Authorization: Bearer <token>
//
// GET  /api/data?action=customers                 → 自己的客户列表
// POST /api/data?action=customer                  → 建新客户 { label }
// POST /api/data?action=update-customer           → 更新客户 { id, status?, followup_note? }
// GET  /api/data?action=interactions&cid=<uuid>   → 某客户的互动历史

const { createClient } = require('@supabase/supabase-js');
const { verifyToken } = require('../lib/token');

function supabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// 从 Authorization header 取出并验证 token，返回 staffName 或 null
function auth(req) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  return verifyToken(token);
}

module.exports = async (req, res) => {
  const staffName = auth(req);
  if (!staffName) {
    return res.status(401).json({ error: '未授权，请重新登录' });
  }

  const db = supabase();
  const { action, cid } = req.query;

  // ── GET customers ──────────────────────────────────────────────
  if (req.method === 'GET' && action === 'customers') {
    const { data, error } = await db
      .from('customers')
      .select('id, label, status, updated_at, team')
      .eq('staff_name', staffName)
      .order('updated_at', { ascending: false });

    if (error) return res.status(500).json({ error: '读取失败' });
    return res.status(200).json({ customers: data });
  }

  // ── GET interactions ───────────────────────────────────────────
  if (req.method === 'GET' && action === 'interactions') {
    if (!cid) return res.status(400).json({ error: '缺少 cid 参数' });

    // 先确认这个客户属于该 staff（防越权）
    const { data: customer } = await db
      .from('customers')
      .select('id, label, status, team, followup_note')
      .eq('id', cid)
      .eq('staff_name', staffName)
      .single();

    if (!customer) return res.status(403).json({ error: '无权访问此客户' });

    const { data: interactions, error } = await db
      .from('interactions')
      .select('id, situation_summary, ai_suggestion, created_at')
      .eq('customer_id', cid)
      .order('created_at', { ascending: true });

    if (error) return res.status(500).json({ error: '读取互动历史失败' });
    return res.status(200).json({ customer, interactions });
  }

  // ── POST customer (建新客户) ────────────────────────────────────
  if (req.method === 'POST' && action === 'customer') {
    const { label } = req.body || {};
    if (!label || !label.trim()) {
      return res.status(400).json({ error: 'label 不能为空' });
    }

    // 查询该 staff 所在 team
    const { data: staff } = await db
      .from('staff')
      .select('team')
      .eq('name', staffName)
      .single();

    const { data, error } = await db
      .from('customers')
      .insert({
        staff_name: staffName,
        team: staff?.team || null,
        label: label.trim(),
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: '建档失败' });
    return res.status(201).json({ customer: data });
  }

  // ── POST update-customer ────────────────────────────────────────
  if (req.method === 'POST' && action === 'update-customer') {
    const { id, status, followup_note } = req.body || {};
    if (!id) return res.status(400).json({ error: '缺少 id' });

    // 只能更新自己的客户
    const allowed = ['新客户', '考虑中', '需跟进', '成交', '冷了'];
    const updates = {};
    if (status !== undefined) {
      if (!allowed.includes(status)) return res.status(400).json({ error: '无效状态值' });
      updates.status = status;
    }
    if (followup_note !== undefined) updates.followup_note = followup_note;

    const { data, error } = await db
      .from('customers')
      .update(updates)
      .eq('id', id)
      .eq('staff_name', staffName) // 防越权
      .select()
      .single();

    if (error || !data) return res.status(500).json({ error: '更新失败' });
    return res.status(200).json({ customer: data });
  }

  return res.status(400).json({ error: '未知操作' });
};
