const { getDb, registros } = require('../db');
const { sql } = require('drizzle-orm');

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

  const db = getDb();
  if (!db) return res.status(500).json({ error: 'Database not configured' });

  try {
    await db.insert(registros).values({
      folio, nombre, apellido, email, telefono,
      adultos: adultos || 1,
      ninos: ninos || 0,
      trae_perro: !!traePerro,
      nombre_perro: nombrePerro || null,
    }).onConflictDoNothing({ target: registros.folio });

    return res.status(201).json({ ok: true, folio });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Registration failed' });
  }
};
