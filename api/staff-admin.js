'use strict';
// api/staff-admin.js — Staff 账号管理（Manager 专用）
//
// GET  /api/staff-admin                 → 列出 staff（按 manager team 权限过滤）
// POST /api/staff-admin?action=add      → 新增 { name, pin, team }
// POST /api/staff-admin?action=update   → 编辑/停用 { id, name, pin, team, is_active }
// POST /api/staff-admin?action=delete   → 删除 { id }

const { createClient } = require('@supabase/supabase-js');
const { authManager }  = require('../lib/managerAuth');

function supabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

module.exports = async (req, res) => {
  const db = supabase();
  const mgr = await authManager(req, db);
  if (!mgr) return res.status(401).json({ error: '无权限，需要 Manager 登录' });

  const { action } = req.query;

  // GET — 列出权限范围内的 staff
  if (req.method === 'GET') {
    let q = db.from('staff').select('id, name, pin, team, is_active, created_at').order('name');
    if (mgr.team) q = q.eq('team', mgr.team);
    const { data, error } = await q;
    if (error) return res.status(500).json({ error: '读取失败' });
    return res.status(200).json({ staff: data });
  }

  // POST add — 新增 staff
  if (req.method === 'POST' && action === 'add') {
    const { name, pin, team } = req.body || {};
    if (!name?.trim() || !pin?.toString().trim())
      return res.status(400).json({ error: '姓名和 PIN 必填' });

    // team-scoped manager 只能建自己 team 的账号
    const finalTeam = mgr.team ? mgr.team : (team || null);

    const { data, error } = await db.from('staff')
      .insert({ name: name.trim(), pin: String(pin).trim(), team: finalTeam })
      .select().single();
    if (error) return res.status(500).json({ error: error.message.includes('duplicate') ? '该姓名已存在' : '新增失败' });
    return res.status(201).json({ staff: data });
  }

  // POST update — 编辑 / 停用
  if (req.method === 'POST' && action === 'update') {
    const { id, name, pin, team, is_active } = req.body || {};
    if (!id) return res.status(400).json({ error: '缺少 id' });

    const { data: target } = await db.from('staff').select('team').eq('id', id).single();
    if (!target) return res.status(404).json({ error: '找不到该员工' });
    if (mgr.team && target.team !== mgr.team) return res.status(403).json({ error: '无权修改此员工' });

    const patch = {};
    if (name !== undefined) patch.name = name.trim();
    if (pin !== undefined) patch.pin = String(pin).trim();
    if (is_active !== undefined) patch.is_active = !!is_active;
    // team-scoped manager 不能把员工挪去别的 team
    if (team !== undefined) patch.team = mgr.team ? mgr.team : (team || null);

    const { data, error } = await db.from('staff').update(patch).eq('id', id).select().single();
    if (error) return res.status(500).json({ error: '更新失败' });
    return res.status(200).json({ staff: data });
  }

  // POST delete — 删除 staff
  if (req.method === 'POST' && action === 'delete') {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: '缺少 id' });

    const { data: target } = await db.from('staff').select('team').eq('id', id).single();
    if (!target) return res.status(404).json({ error: '找不到该员工' });
    if (mgr.team && target.team !== mgr.team) return res.status(403).json({ error: '无权删除此员工' });

    const { error } = await db.from('staff').delete().eq('id', id);
    if (error) return res.status(500).json({ error: '删除失败' });
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: '未知操作' });
};
