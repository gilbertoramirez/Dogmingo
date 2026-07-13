const { neon } = require('@neondatabase/serverless');
const { verifyToken } = require('../_auth');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const auth = verifyToken(token);
  if (!auth || !auth.admin) {
    return res.status(403).json({ error: 'Acceso de administrador requerido' });
  }

  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const vendors = await sql`
      SELECT id, nombre, email, stand_num, es_admin, activo, created_at
      FROM vendedores ORDER BY stand_num, nombre
    `;

    const stats = await sql`
      SELECT
        (SELECT COUNT(*)::int FROM registros) AS total_registros,
        (SELECT COUNT(*)::int FROM sellos) AS total_sellos
    `;

    return res.status(200).json({
      ok: true,
      vendors,
      stats: stats[0]
    });
  } catch (err) {
    console.error('List vendors error:', err);
    return res.status(500).json({ error: 'Failed to list vendors' });
  }
};
