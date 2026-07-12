const { neon } = require('@neondatabase/serverless');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { folio, nombre, apellido, email, telefono, adultos, ninos, traePerro, nombrePerro } = req.body || {};

  if (!folio || !nombre || !apellido || !email || !telefono) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    await sql`
      INSERT INTO registros (folio, nombre, apellido, email, telefono, adultos, ninos, trae_perro, nombre_perro)
      VALUES (${folio}, ${nombre}, ${apellido}, ${email}, ${telefono}, ${adultos || 1}, ${ninos || 0}, ${!!traePerro}, ${nombrePerro || null})
      ON CONFLICT (folio) DO NOTHING
    `;
    return res.status(201).json({ ok: true, folio });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Registration failed' });
  }
};
