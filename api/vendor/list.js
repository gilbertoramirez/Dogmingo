const { getDb, vendedores, registros, sellos } = require('../../db');
const { verifyToken } = require('../_auth');
const { asc, count } = require('drizzle-orm');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const auth = verifyToken(token);
  if (!auth || !auth.admin) return res.status(403).json({ error: 'Acceso de administrador requerido' });

  const db = getDb();
  if (!db) return res.status(500).json({ error: 'Database not configured' });

  try {
    const vendors = await db.select().from(vendedores).orderBy(asc(vendedores.stand_num), asc(vendedores.nombre));
    const regCount = await db.select({ total: count() }).from(registros);
    const stampCount = await db.select({ total: count() }).from(sellos);
    return res.status(200).json({
      ok: true, vendors,
      stats: { total_registros: regCount[0].total, total_sellos: stampCount[0].total },
    });
  } catch (err) {
    console.error('List vendors error:', err);
    return res.status(500).json({ error: 'Failed to list vendors' });
  }
};
