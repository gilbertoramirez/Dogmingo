const { getDb, registros, sellos } = require('../db');
const { eq, asc } = require('drizzle-orm');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const folio = req.query.folio;
  if (!folio) return res.status(400).json({ error: 'Folio required' });

  const db = getDb();
  if (!db) return res.status(500).json({ error: 'Database not configured' });

  try {
    const rows = await db.select().from(registros).where(eq(registros.folio, folio));
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });

    const stamps = await db.select({ stand_num: sellos.stand_num })
      .from(sellos).where(eq(sellos.folio, folio)).orderBy(asc(sellos.stand_num));

    return res.status(200).json({
      ok: true,
      registro: rows[0],
      stamps: stamps.map(function(s) { return s.stand_num; }),
    });
  } catch (err) {
    console.error('Registro lookup error:', err);
    return res.status(500).json({ error: 'Lookup failed' });
  }
};
