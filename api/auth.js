'use strict';
// api/auth.js — 身份验证
// GET  /api/auth  → 返回 staff 名字列表（不需要 token，供登录下拉用）
// POST /api/auth  → { name, pin } → 返回 { token, staffName, team }

const { createClient } = require('@supabase/supabase-js');
const { makeToken } = require('../lib/token');

function supabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

module.exports = async (req, res) => {
  // GET — 返回所有在职员工名字列表（无需认证）
  if (req.method === 'GET') {
    const { data, error } = await supabase()
      .from('staff')
      .select('name, team')
      .eq('is_active', true)
      .order('name');
    if (error) return res.status(500).json({ error: '读取员工列表失败' });
    return res.status(200).json({ staff: data });
  }

  // POST — 验证 name + pin，返回 token
  if (req.method === 'POST') {
    const { name, pin } = req.body || {};
    if (!name || !pin) {
      return res.status(400).json({ error: '请填写姓名和 PIN' });
    }

    const { data: staff, error } = await supabase()
      .from('staff')
      .select('name, team, pin, is_active')
      .eq('name', name)
      .eq('is_active', true)
      .single();

    if (error || !staff) {
      return res.status(401).json({ error: '账号不存在或已停用' });
    }
    if (staff.pin !== String(pin)) {
      return res.status(401).json({ error: 'PIN 错误' });
    }

    return res.status(200).json({
      token: makeToken(name),
      staffName: name,
      team: staff.team,
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
