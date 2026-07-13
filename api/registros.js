const { getDb, registros } = require('../db');
const { count } = require('drizzle-orm');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const db = getDb();
  if (!db) return res.status(200).json({ count: 0, offline: true });

  try {
    const rows = await db.select({ total: count() }).from(registros);
    return res.status(200).json({ count: rows[0].total });
  } catch (err) {
    console.error('Count error:', err);
    return res.status(200).json({ count: 0, error: err.message });
  }
};
