const crypto = require('crypto');

const SECRET = process.env.VENDOR_SECRET || 'dgm2025-vendor-key';

function createToken(vendor) {
  const payload = JSON.stringify({
    id: vendor.id,
    stand: vendor.stand_num,
    admin: !!vendor.es_admin,
    exp: Date.now() + 24 * 60 * 60 * 1000
  });
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('hex').slice(0, 16);
  return Buffer.from(payload).toString('base64') + '.' + sig;
}

function verifyToken(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  try {
    const payload = Buffer.from(parts[0], 'base64').toString();
    const expected = crypto.createHmac('sha256', SECRET).update(payload).digest('hex').slice(0, 16);
    if (parts[1] !== expected) return null;
    const data = JSON.parse(payload);
    if (data.exp < Date.now()) return null;
    return data;
  } catch (e) { return null; }
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + SECRET).digest('hex');
}

module.exports = { createToken, verifyToken, hashPassword };
