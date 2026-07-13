const { neon } = require('@neondatabase/serverless');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const folio = req.query.folio;
  if (!folio) return res.status(400).json({ error: 'Folio required' });

  if (!process.env.DATABASE_URL) {
    return res.status(200).json({ stamps: [], offline: true });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`SELECT stand_num, stamp_code, created_at FROM sellos WHERE folio = ${folio} ORDER BY stand_num`;
    return res.status(200).json({ stamps: rows });
  } catch (err) {
    console.error('Stamps error:', err);
    return res.status(200).json({ stamps: [], offline: true });
  }
};
