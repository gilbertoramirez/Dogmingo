const { getDb, sellos } = require('../db');
const { eq, asc } = require('drizzle-orm');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const folio = req.query.folio;
  if (!folio) return res.status(400).json({ error: 'Folio required' });

  const db = getDb();
  if (!db) return res.status(200).json({ stamps: [], offline: true });

  try {
    const rows = await db.select({
      stand_num: sellos.stand_num,
      stamp_code: sellos.stamp_code,
      created_at: sellos.created_at,
    }).from(sellos).where(eq(sellos.folio, folio)).orderBy(asc(sellos.stand_num));

    return res.status(200).json({ stamps: rows });
  } catch (err) {
    console.error('Stamps error:', err);
    return res.status(200).json({ stamps: [], offline: true });
  }
};
