const { neon } = require('@neondatabase/serverless');
const { verifyToken, hashPassword } = require('../_auth');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const auth = verifyToken(token);
  if (!auth || !auth.admin) {
    return res.status(403).json({ error: 'Acceso de administrador requerido' });
  }

  const { nombre, email, password, stand_num } = req.body || {};
  if (!nombre || !email || !password || !stand_num) {
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  }
  if (stand_num < 1 || stand_num > 6) {
    return res.status(400).json({ error: 'Stand debe ser 1-6' });
  }

  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const hash = hashPassword(password);
    const rows = await sql`
      INSERT INTO vendedores (nombre, email, password_hash, stand_num)
      VALUES (${nombre}, ${email}, ${hash}, ${stand_num})
      ON CONFLICT (email) DO UPDATE SET
        nombre = ${nombre}, password_hash = ${hash},
        stand_num = ${stand_num}, activo = true
      RETURNING id, nombre, email, stand_num, activo
    `;
    return res.status(201).json({ ok: true, vendor: rows[0] });
  } catch (err) {
    console.error('Create vendor error:', err);
    return res.status(500).json({ error: 'Failed to create vendor' });
  }
};
