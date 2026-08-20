'use strict';
// api/feedback.js — Staff 报错 / Manager 查阅
//
// POST /api/feedback                  — Staff 提交报错（staff token）
// GET  /api/feedback                  — Manager 查看未处理报错
// GET  /api/feedback?resolved=1       — Manager 查看已处理报错
// POST /api/feedback?action=resolve   — Manager 标记已处理 { id }

const { createClient } = require('@supabase/supabase-js');
const { verifyToken }  = require('../lib/token');
const { authManager }  = require('../lib/managerAuth');

function supabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}
function authStaff(req) {
  const h = req.headers['authorization'] || '';
  const t = h.startsWith('Bearer ') ? h.slice(7) : null;
  return verifyToken(t);
}

module.exports = async (req, res) => {
  const db = supabase();

  // ── Staff 提交报错 ──────────────────────────────────────────
  if (req.method === 'POST' && !req.query.action) {
    const staffName = authStaff(req);
    if (!staffName) return res.status(401).json({ error: '未授权' });

    const { ai_type, ai_response, situation, feedback_note, customer_label } = req.body || {};
    if (!ai_response || !feedback_note?.trim())
      return res.status(400).json({ error: '请写明哪里有问题' });

    const { data: staffRow } = await db.from('staff').select('team').eq('name', staffName).single();

    const { data, error } = await db.from('ai_feedback').insert({
      staff_name:     staffName,
      team:           staffRow?.team || null,
      customer_label: customer_label || null,
      ai_type:        ai_type || null,
      ai_response,
      situation:      situation || null,
      feedback_note:  feedback_note.trim(),
    }).select().single();

    if (error) return res.status(500).json({ error: '提交失败' });
    return res.status(201).json({ ok: true, feedback: data });
  }

  // ── Manager 查看报错列表 ────────────────────────────────────
  if (req.method === 'GET') {
    const mgr = await authManager(req, db);
    if (!mgr) return res.status(401).json({ error: '需要 Manager 权限' });
    const showResolved = req.query.resolved === '1';

    let q = db.from('ai_feedback').select('*').order('created_at', { ascending: false });
    if (!showResolved) q = q.eq('resolved', false);
    if (mgr.team) q = q.eq('team', mgr.team); // team 为 null 的 manager 看全部

    const { data, error } = await q;
    if (error) return res.status(500).json({ error: '读取失败' });
    return res.status(200).json({ feedback: data || [] });
  }

  // ── Manager 标记已处理 ──────────────────────────────────────
  if (req.method === 'POST' && req.query.action === 'resolve') {
    if (!(await authManager(req, db))) return res.status(401).json({ error: '需要 Manager 权限' });
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: '缺少 id' });

    const { data, error } = await db.from('ai_feedback')
      .update({ resolved: true }).eq('id', id).select().single();
    if (error) return res.status(500).json({ error: '更新失败' });
    return res.status(200).json({ ok: true, feedback: data });
  }

  return res.status(400).json({ error: '未知操作' });
};
