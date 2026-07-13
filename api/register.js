const { getDb, registros, sellos } = require('../db');
const { eq, asc } = require('drizzle-orm');

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
    const existing = await db.select().from(registros).where(eq(registros.email, email));

    if (existing.length > 0) {
      const stamps = await db.select({ stand_num: sellos.stand_num })
        .from(sellos).where(eq(sellos.folio, existing[0].folio)).orderBy(asc(sellos.stand_num));
      return res.status(200).json({
        ok: true, existing: true,
        folio: existing[0].folio,
        registro: existing[0],
        stamps: stamps.map(function(s) { return s.stand_num; }),
      });
    }

    await db.insert(registros).values({
      folio, nombre, apellido, email, telefono,
      adultos: adultos || 1,
      ninos: ninos || 0,
      trae_perro: !!traePerro,
      nombre_perro: nombrePerro || null,
    });

    return res.status(201).json({
      ok: true, existing: false, folio,
      registro: { folio, nombre, apellido, email, telefono, adultos: adultos || 1, ninos: ninos || 0, nombre_perro: nombrePerro || null },
      stamps: [],
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Registration failed: ' + err.message });
  }
};
