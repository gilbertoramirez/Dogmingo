const { neon } = require('@neondatabase/serverless');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.DATABASE_URL) {
    return res.status(200).json({ count: 0, offline: true });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`SELECT COUNT(*)::int AS count FROM registros`;
    return res.status(200).json({ count: rows[0].count });
  } catch (err) {
    console.error('Count error:', err);
    return res.status(200).json({ count: 0, offline: true });
  }
};
