'use strict';
// lib/managerAuth.js — Manager 认证 + team 权限查询
// 用法：const mgr = await authManager(req, db); if (!mgr) return 401;
// mgr = { name, team }  — team 为 null 表示看全部 team
//
// Manager 权限现在挂在普通 staff 账号上（staff.is_manager），
// 用的是同一个登录 token，不再有单独的 manager token。

const { verifyToken } = require('./token');

async function authManager(req, db) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const name = verifyToken(token);
  if (!name) return null;

  const { data: staff, error } = await db
    .from('staff')
    .select('name, manager_scope_team, is_manager, is_active')
    .eq('name', name)
    .eq('is_active', true)
    .single();
  if (error || !staff || !staff.is_manager) return null;

  return { name: staff.name, team: staff.manager_scope_team };
}

module.exports = { authManager };
