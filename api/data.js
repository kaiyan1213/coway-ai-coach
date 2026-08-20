'use strict';
// api/data.js — 数据读写（customers / interactions）
//
// 所有请求必须带 Authorization: Bearer <token>
//
// GET  /api/data?action=customers                 → 自己的客户列表（排除已删除）
// GET  /api/data?action=trash                     → 回收站（已软删除的客户）
// POST /api/data?action=customer                  → 建新客户 { label }
// POST /api/data?action=update-customer           → 更新客户 { id, status?, followup_note? }
// POST /api/data?action=delete-customer           → 软删除 { id }（可在回收站找回）
// POST /api/data?action=restore-customer          → 从回收站还原 { id }
// POST /api/data?action=purge-customer            → 永久删除 { id }（不可恢复）
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
    // 先尝试带 deleted_at 过滤（需要栏位存在）
    let { data, error } = await db
      .from('customers')
      .select('id, label, status, updated_at, team, followup_note')
      .eq('staff_name', staffName)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false });

    // 如果 deleted_at 栏还没建（42703=undefined column），退回无过滤查询
    if (error && (error.code === '42703' || error.message?.includes('deleted_at'))) {
      ({ data, error } = await db
        .from('customers')
        .select('id, label, status, updated_at, team, followup_note')
        .eq('staff_name', staffName)
        .order('updated_at', { ascending: false }));
    }

    if (error) return res.status(500).json({ error: '读取失败' });
    return res.status(200).json({ customers: data });
  }

  // ── GET trash （回收站）────────────────────────────────────────
  if (req.method === 'GET' && action === 'trash') {
    const { data, error } = await db
      .from('customers')
      .select('id, label, status, deleted_at, followup_note')
      .eq('staff_name', staffName)
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });

    // 如果栏位不存在，返回空列表（功能待激活）
    if (error) return res.status(200).json({ customers: [] });
    return res.status(200).json({ customers: data });
  }

  // ── GET interactions ───────────────────────────────────────────
  if (req.method === 'GET' && action === 'interactions') {
    if (!cid) return res.status(400).json({ error: '缺少 cid 参数' });

    // 先确认这个客户属于该 staff（防越权）
    let { data: customer } = await db
      .from('customers')
      .select('id, label, status, team, followup_note')
      .eq('id', cid)
      .eq('staff_name', staffName)
      .is('deleted_at', null)
      .single();
    // 如果 deleted_at 栏不存在，不过滤该条件
    if (!customer) {
      ({ data: customer } = await db
        .from('customers')
        .select('id, label, status, team, followup_note')
        .eq('id', cid)
        .eq('staff_name', staffName)
        .single());
    }

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
    const { label, followup_note } = req.body || {};
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
        followup_note: followup_note?.trim() || null,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: '建档失败' });
    return res.status(201).json({ customer: data });
  }

  // ── POST update-customer ────────────────────────────────────────
  if (req.method === 'POST' && action === 'update-customer') {
    const { id, status, followup_note, label } = req.body || {};
    if (!id) return res.status(400).json({ error: '缺少 id' });

    // 只能更新自己的且未删除的客户
    const allowed = ['新客户', '考虑中', '需跟进', '成交', '冷了'];
    const updates = {};
    if (status !== undefined) {
      if (!allowed.includes(status)) return res.status(400).json({ error: '无效状态值' });
      updates.status = status;
    }
    if (followup_note !== undefined) updates.followup_note = followup_note;
    if (label !== undefined && label.trim()) updates.label = label.trim();

    let { data, error } = await db
      .from('customers')
      .update(updates)
      .eq('id', id)
      .eq('staff_name', staffName)
      .is('deleted_at', null)
      .select()
      .single();

    // deleted_at 栏不存在时退回无过滤更新
    if (error && (error.code === '42703' || error.message?.includes('deleted_at'))) {
      ({ data, error } = await db
        .from('customers')
        .update(updates)
        .eq('id', id)
        .eq('staff_name', staffName)
        .select()
        .single());
    }

    if (error || !data) return res.status(500).json({ error: '更新失败' });
    return res.status(200).json({ customer: data });
  }

  // ── POST delete-customer（软删除，可在回收站找回）────────────────
  if (req.method === 'POST' && action === 'delete-customer') {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: '缺少 id' });

    // 确认属于该 staff
    const { data: existing } = await db
      .from('customers')
      .select('id')
      .eq('id', id)
      .eq('staff_name', staffName)
      .single();
    if (!existing) return res.status(403).json({ error: '无权操作此客户' });

    // 尝试软删除；如果栏位不存在则退回硬删除
    const { error } = await db
      .from('customers')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error && (error.code === '42703' || error.message?.includes('deleted_at'))) {
      // deleted_at 栏未建，执行硬删除
      await db.from('interactions').delete().eq('customer_id', id);
      const { error: delErr } = await db.from('customers').delete().eq('id', id);
      if (delErr) return res.status(500).json({ error: '删除失败' });
    } else if (error) {
      return res.status(500).json({ error: '删除失败' });
    }

    return res.status(200).json({ ok: true });
  }

  // ── POST restore-customer（从回收站还原）──────────────────────────
  if (req.method === 'POST' && action === 'restore-customer') {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: '缺少 id' });

    // 确认属于该 staff 且已被软删除
    const { data: existing } = await db
      .from('customers')
      .select('id')
      .eq('id', id)
      .eq('staff_name', staffName)
      .not('deleted_at', 'is', null)
      .single();
    if (!existing) return res.status(403).json({ error: '无权操作此客户' });

    const { data, error } = await db
      .from('customers')
      .update({ deleted_at: null })
      .eq('id', id)
      .select('id, label, status, updated_at, team, followup_note')
      .single();
    if (error || !data) return res.status(500).json({ error: '还原失败' });
    return res.status(200).json({ ok: true, customer: data });
  }

  // ── POST purge-customer（永久删除，不可恢复）──────────────────────
  if (req.method === 'POST' && action === 'purge-customer') {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: '缺少 id' });

    // 确认属于该 staff（无论是否已删除）
    const { data: existing } = await db
      .from('customers')
      .select('id')
      .eq('id', id)
      .eq('staff_name', staffName)
      .single();
    if (!existing) return res.status(403).json({ error: '无权操作此客户' });

    await db.from('interactions').delete().eq('customer_id', id);
    const { error } = await db.from('customers').delete().eq('id', id);
    if (error) return res.status(500).json({ error: '永久删除失败' });
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: '未知操作' });
};
