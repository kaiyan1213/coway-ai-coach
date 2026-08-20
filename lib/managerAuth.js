'use strict';
// lib/managerAuth.js — Manager 认证 + team 权限查询
// 用法：const mgr = await authManager(req, db); if (!mgr) return 401;
// mgr = { name, team }  — team 为 null 表示看全部 team

const { verifyManagerToken } = require('./token');

async function authManager(req, db) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const name = verifyManagerToken(token);
  if (!name) return null;

  const { data: mgr, error } = await db
    .from('managers')
    .select('name, team, is_active')
    .eq('name', name)
    .eq('is_active', true)
    .single();
  if (error || !mgr) return null;

  return { name: mgr.name, team: mgr.team };
}

module.exports = { authManager };
