const { getDb, registros, sellos } = require('../../db');
const { verifyToken } = require('../_auth');
const { eq, asc } = require('drizzle-orm');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const auth = verifyToken(token);
  if (!auth) return res.status(401).json({ error: 'No autorizado' });

  const folio = req.query.folio;
  if (!folio) return res.status(400).json({ error: 'Folio required' });

  const db = getDb();
  if (!db) return res.status(500).json({ error: 'Database not configured' });

  try {
    const rows = await db.select().from(registros).where(eq(registros.folio, folio));
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }

    const stamps = await db.select({
      stand_num: sellos.stand_num,
      stamp_code: sellos.stamp_code,
      created_at: sellos.created_at,
    }).from(sellos).where(eq(sellos.folio, folio)).orderBy(asc(sellos.stand_num));

    return res.status(200).json({ ok: true, registro: rows[0], sellos: stamps });
  } catch (err) {
    console.error('Lookup error:', err);
    return res.status(500).json({ error: 'Lookup failed' });
  }
};
