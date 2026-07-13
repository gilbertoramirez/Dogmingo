const { getDb, vendedores } = require('../../db');
const { createToken, hashPassword } = require('../_auth');
const { eq, and } = require('drizzle-orm');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  if (email === 'admin' && password === (process.env.ADMIN_PASSWORD || '')) {
    if (!process.env.ADMIN_PASSWORD) {
      return res.status(500).json({ error: 'Admin password not configured' });
    }
    const token = createToken({ id: 0, stand_num: 0, es_admin: true });
    return res.status(200).json({
      ok: true, token,
      vendor: { nombre: 'Administrador', stand_num: 0, es_admin: true }
    });
  }

  const db = getDb();
  if (!db) return res.status(500).json({ error: 'Database not configured' });

  try {
    const hash = hashPassword(password);
    const rows = await db.select({
      id: vendedores.id,
      nombre: vendedores.nombre,
      email: vendedores.email,
      stand_num: vendedores.stand_num,
      es_admin: vendedores.es_admin,
    }).from(vendedores).where(
      and(eq(vendedores.email, email), eq(vendedores.password_hash, hash), eq(vendedores.activo, true))
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    const vendor = rows[0];
    const token = createToken(vendor);
    return res.status(200).json({
      ok: true, token,
      vendor: { nombre: vendor.nombre, stand_num: vendor.stand_num, es_admin: vendor.es_admin }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login failed' });
  }
};
