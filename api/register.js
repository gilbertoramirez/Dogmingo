const { getDb, registros, sellos } = require('../db');
const { eq, asc } = require('drizzle-orm');
const crypto = require('crypto');

const CODE_SECRET = process.env.VENDOR_SECRET || 'dgm2025-vendor-key';

function verifyCodeToken(token, inputCode) {
  try {
    const data = JSON.parse(Buffer.from(token, 'base64').toString());
    if (data.exp < Date.now()) return { valid: false, error: 'Código expirado' };
    if (data.code !== inputCode) return { valid: false, error: 'Código incorrecto' };
    const expected = crypto.createHmac('sha256', CODE_SECRET)
      .update(data.email + ':' + data.code + ':' + data.exp).digest('hex').slice(0, 16);
    if (data.sig !== expected) return { valid: false, error: 'Token inválido' };
    return { valid: true, email: data.email };
  } catch (e) {
    return { valid: false, error: 'Token inválido' };
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { folio, nombre, apellido, email, telefono, adultos, ninos, traePerro, nombrePerro, verificationToken, verificationCode } = req.body || {};

  if (!folio || !nombre || !apellido || !email || !telefono) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!verificationToken || !verificationCode) {
    return res.status(400).json({ error: 'Código de verificación requerido' });
  }

  const verification = verifyCodeToken(verificationToken, verificationCode);
  if (!verification.valid) {
    return res.status(400).json({ error: verification.error });
  }

  if (verification.email !== email.toLowerCase().trim()) {
    return res.status(400).json({ error: 'El código no corresponde a este email' });
  }

  const db = getDb();
  if (!db) return res.status(500).json({ error: 'Database not configured' });

  try {
    const existing = await db.select().from(registros).where(eq(registros.email, email.toLowerCase().trim()));

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
      folio, nombre, apellido, email: email.toLowerCase().trim(), telefono,
      adultos: adultos || 1, ninos: ninos || 0,
      trae_perro: !!traePerro, nombre_perro: nombrePerro || null,
    });

    return res.status(201).json({
      ok: true, existing: false, folio,
      registro: { folio, nombre, apellido, email: email.toLowerCase().trim(), telefono, adultos: adultos || 1, ninos: ninos || 0, nombre_perro: nombrePerro || null },
      stamps: [],
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Registration failed: ' + err.message });
  }
};
