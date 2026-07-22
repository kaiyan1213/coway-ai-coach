'use strict';
// ─── CONFIG ───────────────────────────────────────────────
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 天有效期
// ──────────────────────────────────────────────────────────

const crypto = require('crypto');

// token 格式 (base64url 编码后): encodedName|expiry|hmac
// encodedName 是 staffName 的 base64url 编码，避免名字含特殊字符

function makeToken(staffName) {
  const expiry = Date.now() + TOKEN_TTL_MS;
  const encodedName = Buffer.from(staffName, 'utf8').toString('base64url');
  const payload = `${encodedName}|${expiry}`;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return Buffer.from(`${payload}|${sig}`, 'utf8').toString('base64url');
}

// 返回 staffName，或 null（无效/过期）
function verifyToken(token) {
  if (!token) return null;
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const parts = decoded.split('|');
    if (parts.length !== 3) return null;
    const [encodedName, expiry, sig] = parts;

    if (Date.now() > Number(expiry)) return null;

    const payload = `${encodedName}|${expiry}`;
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    const sigBuf = Buffer.from(sig, 'hex');
    const expBuf = Buffer.from(expected, 'hex');
    if (sigBuf.length !== expBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;

    return Buffer.from(encodedName, 'base64url').toString('utf8');
  } catch {
    return null;
  }
}

module.exports = { makeToken, verifyToken };
