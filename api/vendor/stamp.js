const { neon } = require('@neondatabase/serverless');
const { verifyToken } = require('../_auth');

var STAMP_SECRET = 'dgm2025zitara';

function stampHash(folio, stand) {
  var s = folio + '-' + stand + '-' + STAMP_SECRET;
  var h = 0;
  for (var i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h = h & h;
  }
  return Math.abs(h).toString(36).toUpperCase().padStart(4, '0').slice(0, 4);
}

function makeStampCode(folio, stand) {
  return 'S' + stand + '-' + stampHash(folio, stand);
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const auth = verifyToken(token);
  if (!auth) return res.status(401).json({ error: 'No autorizado' });

  const { folio, stand_num } = req.body || {};
  if (!folio) return res.status(400).json({ error: 'Folio required' });

  const standNum = auth.admin ? (stand_num || 0) : auth.stand;
  if (standNum < 1 || standNum > 6) {
    return res.status(400).json({ error: 'Stand inválido (1-6)' });
  }

  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    const reg = await sql`SELECT folio, nombre, apellido FROM registros WHERE folio = ${folio}`;
    if (reg.length === 0) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }

    const existing = await sql`SELECT id FROM sellos WHERE folio = ${folio} AND stand_num = ${standNum}`;
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Este folio ya fue sellado en este stand' });
    }

    const stampCode = makeStampCode(folio, standNum);

    await sql`
      INSERT INTO sellos (folio, stand_num, stamp_code)
      VALUES (${folio}, ${standNum}, ${stampCode})
    `;

    const allStamps = await sql`SELECT stand_num FROM sellos WHERE folio = ${folio}`;

    return res.status(201).json({
      ok: true,
      stamp_code: stampCode,
      stand_num: standNum,
      nombre: reg[0].nombre + ' ' + reg[0].apellido,
      total_stamps: allStamps.length
    });
  } catch (err) {
    console.error('Stamp error:', err);
    return res.status(500).json({ error: 'Stamp failed' });
  }
};
