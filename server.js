const express = require('express');
const path = require('path');
const crypto = require('crypto');
const { getDb, registros, sellos, vendedores } = require('./db');
const { createToken, verifyToken, hashPassword } = require('./api/_auth');
const { eq, and, asc, count } = require('drizzle-orm');
const { Resend } = require('resend');
const { neon } = require('@neondatabase/serverless');

const CODE_SECRET = process.env.VENDOR_SECRET || 'dgm2025-vendor-key';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

function cors(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
}
app.use('/api', cors);

// ── Setup (create tables) ──
app.get('/api/setup', async (req, res) => {
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: 'DATABASE_URL not configured' });
  }
  try {
    const sql = neon(process.env.DATABASE_URL);
    await sql`
      CREATE TABLE IF NOT EXISTS registros (
        id            SERIAL PRIMARY KEY,
        folio         TEXT UNIQUE NOT NULL,
        nombre        TEXT NOT NULL,
        apellido      TEXT NOT NULL,
        email         TEXT NOT NULL,
        telefono      TEXT NOT NULL,
        adultos       INTEGER DEFAULT 1,
        ninos         INTEGER DEFAULT 0,
        trae_perro    BOOLEAN DEFAULT FALSE,
        nombre_perro  TEXT,
        created_at    TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS sellos (
        id            SERIAL PRIMARY KEY,
        folio         TEXT NOT NULL REFERENCES registros(folio),
        stand_num     INTEGER NOT NULL,
        stamp_code    TEXT NOT NULL,
        created_at    TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(folio, stand_num)
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS vendedores (
        id            SERIAL PRIMARY KEY,
        nombre        TEXT NOT NULL,
        email         TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        stand_num     INTEGER NOT NULL,
        es_admin      BOOLEAN DEFAULT FALSE,
        activo        BOOLEAN DEFAULT TRUE,
        created_at    TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    const tables = await sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' ORDER BY table_name
    `;
    return res.json({ ok: true, message: 'Tables created successfully', tables: tables.map(t => t.table_name) });
  } catch (err) {
    console.error('Setup error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ── Test DB ──
app.get('/api/test-db', async (req, res) => {
  if (!process.env.DATABASE_URL) return res.json({ ok: false, error: 'DATABASE_URL not set' });
  try {
    const sql = neon(process.env.DATABASE_URL);
    const result = await sql`SELECT NOW() as now, current_database() as db`;
    const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`;
    const counts = await sql`SELECT (SELECT count(*) FROM registros) as registros, (SELECT count(*) FROM sellos) as sellos, (SELECT count(*) FROM vendedores) as vendedores`;
    return res.json({ ok: true, db: result[0].db, time: result[0].now, tables: tables.map(t => t.table_name), counts: counts[0] });
  } catch (err) {
    return res.json({ ok: false, error: err.message });
  }
});

// ── Send verification code ──
function signCode(email, code, expiresAt) {
  return crypto.createHmac('sha256', CODE_SECRET).update(email + ':' + code + ':' + expiresAt).digest('hex').slice(0, 16);
}

app.post('/api/send-code', async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email required' });
  if (!process.env.RESEND_API_KEY) return res.status(500).json({ error: 'Email service not configured' });

  try {
    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    const signature = signCode(email.toLowerCase().trim(), code, expiresAt);
    const token = Buffer.from(JSON.stringify({ email: email.toLowerCase().trim(), code, exp: expiresAt, sig: signature })).toString('base64');

    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Dogmingo <onboarding@resend.dev>',
      to: email,
      subject: 'Tu código de verificación - Dogmingo',
      html: [
        '<div style="font-family:system-ui,sans-serif;max-width:400px;margin:0 auto;background:#FAF8F3;padding:2rem;border-radius:16px;text-align:center;">',
        '<h1 style="color:#D93B1E;font-size:1.8rem;margin:0 0 0.5rem;">DOGMINGO</h1>',
        '<p style="color:#5C584F;margin:0 0 1.5rem;">El Domingo más Perrón del Año</p>',
        '<hr style="border:none;border-top:2px dashed #D4C9B5;margin:0 0 1.5rem;">',
        '<p style="color:#191714;font-size:1rem;margin:0 0 1rem;">Tu código de verificación es:</p>',
        '<div style="background:#FFFFFF;padding:1rem;border-radius:12px;margin:0 0 1rem;">',
        '<span style="font-size:2.5rem;font-weight:800;letter-spacing:0.3em;color:#2D6A3F;">' + code + '</span>',
        '</div>',
        '<p style="color:#8A8378;font-size:0.85rem;margin:0;">Este código expira en 10 minutos.</p>',
        '</div>',
      ].join('\n'),
    });
    return res.json({ ok: true, token });
  } catch (err) {
    console.error('Send code error:', err);
    return res.status(500).json({ error: 'Failed to send code' });
  }
});

// ── Register (with email verification) ──
function verifyCodeToken(token, inputCode) {
  try {
    const data = JSON.parse(Buffer.from(token, 'base64').toString());
    if (data.exp < Date.now()) return { valid: false, error: 'Código expirado' };
    if (data.code !== inputCode) return { valid: false, error: 'Código incorrecto' };
    const expected = crypto.createHmac('sha256', CODE_SECRET).update(data.email + ':' + data.code + ':' + data.exp).digest('hex').slice(0, 16);
    if (data.sig !== expected) return { valid: false, error: 'Token inválido' };
    return { valid: true, email: data.email };
  } catch (e) {
    return { valid: false, error: 'Token inválido' };
  }
}

app.post('/api/register', async (req, res) => {
  const { folio, nombre, apellido, email, telefono, adultos, ninos, traePerro, nombrePerro, verificationToken, verificationCode } = req.body || {};
  if (!folio || !nombre || !apellido || !email || !telefono) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (!verificationToken || !verificationCode) {
    return res.status(400).json({ error: 'Código de verificación requerido' });
  }

  const verification = verifyCodeToken(verificationToken, verificationCode);
  if (!verification.valid) return res.status(400).json({ error: verification.error });
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
      return res.json({
        ok: true, existing: true,
        folio: existing[0].folio,
        registro: existing[0],
        stamps: stamps.map(s => s.stand_num),
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
});

// ── Registro lookup (public) ──
app.get('/api/registro', async (req, res) => {
  const folio = req.query.folio;
  if (!folio) return res.status(400).json({ error: 'Folio required' });

  const db = getDb();
  if (!db) return res.status(500).json({ error: 'Database not configured' });

  try {
    const rows = await db.select().from(registros).where(eq(registros.folio, folio));
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });

    const stamps = await db.select({ stand_num: sellos.stand_num })
      .from(sellos).where(eq(sellos.folio, folio)).orderBy(asc(sellos.stand_num));

    return res.json({ ok: true, registro: rows[0], stamps: stamps.map(s => s.stand_num) });
  } catch (err) {
    console.error('Registro lookup error:', err);
    return res.status(500).json({ error: 'Lookup failed' });
  }
});

// ── Registration count ──
app.get('/api/registros', async (req, res) => {
  const db = getDb();
  if (!db) return res.json({ count: 0, offline: true });

  try {
    const rows = await db.select({ total: count() }).from(registros);
    return res.json({ count: rows[0].total });
  } catch (err) {
    console.error('Count error:', err);
    return res.json({ count: 0, offline: true });
  }
});

// ── Stamps lookup ──
app.get('/api/stamps', async (req, res) => {
  const folio = req.query.folio;
  if (!folio) return res.status(400).json({ error: 'Folio required' });

  const db = getDb();
  if (!db) return res.json({ stamps: [], offline: true });

  try {
    const rows = await db.select({
      stand_num: sellos.stand_num,
      stamp_code: sellos.stamp_code,
      created_at: sellos.created_at,
    }).from(sellos).where(eq(sellos.folio, folio)).orderBy(asc(sellos.stand_num));
    return res.json({ stamps: rows });
  } catch (err) {
    console.error('Stamps error:', err);
    return res.json({ stamps: [], offline: true });
  }
});

// ── Send passport email ──
app.post('/api/send-passport', async (req, res) => {
  const { email, nombre, folio, passportImage } = req.body || {};
  if (!email || !nombre || !folio || !passportImage) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: 'Email service not configured' });
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const base64Data = passportImage.replace(/^data:image\/png;base64,/, '');

    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Dogmingo <onboarding@resend.dev>',
      to: email,
      subject: 'Tu Pasaporte Perruno - Dogmingo',
      html: [
        '<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;background:#FAF8F3;padding:2rem;border-radius:16px;">',
        '<h1 style="color:#D93B1E;text-align:center;font-size:2rem;margin:0 0 0.5rem;">DOGMINGO</h1>',
        '<p style="text-align:center;color:#5C584F;margin:0 0 1.5rem;">El Domingo más Perrón del Año</p>',
        '<hr style="border:none;border-top:2px dashed #D4C9B5;margin:0 0 1.5rem;">',
        '<h2 style="color:#191714;text-align:center;margin:0 0 0.5rem;">¡Hola ' + nombre + '!</h2>',
        '<p style="color:#5C584F;text-align:center;margin:0 0 1.5rem;">Tu registro ha sido confirmado. Aquí está tu Pasaporte Perruno digital.</p>',
        '<div style="background:#FFFFFF;padding:1.5rem;border-radius:12px;margin:0 0 1.5rem;text-align:center;">',
        '<p style="font-weight:700;color:#2D6A3F;margin:0 0 0.5rem;">Tu folio: ' + folio + '</p>',
        '<p style="color:#8A8378;font-size:0.9rem;margin:0;">Muestra este folio o tu código QR en cada stand para que te sellen tu pasaporte.</p>',
        '</div>',
        '<p style="color:#5C584F;text-align:center;margin:0 0 1.5rem;">Tu pasaporte está adjunto como imagen.</p>',
        '<hr style="border:none;border-top:2px dashed #D4C9B5;margin:0 0 1.5rem;">',
        '<p style="text-align:center;color:#8A8378;font-size:0.8rem;margin:0;">',
        '<strong>Domingo 26 de Julio</strong> &middot; 10:00 a 15:00 hrs<br>',
        'Zitara Club &amp; Golf &middot; Salida a Calvillo, Aguascalientes<br><br>',
        'Evento en beneficio de <strong>Esperanza Canina</strong>',
        '</p></div>'
      ].join('\n'),
      attachments: [{ filename: 'pasaporte-perruno-dogmingo.png', content: base64Data }]
    });
    return res.json({ ok: true });
  } catch (err) {
    console.error('Email error:', err);
    return res.status(500).json({ error: 'Failed to send email' });
  }
});

// ── Vendor: Login ──
app.post('/api/vendor/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  if (email === 'admin' && password === (process.env.ADMIN_PASSWORD || '')) {
    if (!process.env.ADMIN_PASSWORD) return res.status(500).json({ error: 'Admin password not configured' });
    const token = createToken({ id: 0, stand_num: 0, es_admin: true });
    return res.json({ ok: true, token, vendor: { nombre: 'Administrador', stand_num: 0, es_admin: true } });
  }

  const db = getDb();
  if (!db) return res.status(500).json({ error: 'Database not configured' });

  try {
    const hash = hashPassword(password);
    const rows = await db.select({
      id: vendedores.id, nombre: vendedores.nombre, email: vendedores.email,
      stand_num: vendedores.stand_num, es_admin: vendedores.es_admin,
    }).from(vendedores).where(
      and(eq(vendedores.email, email), eq(vendedores.password_hash, hash), eq(vendedores.activo, true))
    );
    if (rows.length === 0) return res.status(401).json({ error: 'Credenciales inválidas' });

    const vendor = rows[0];
    const token = createToken(vendor);
    return res.json({ ok: true, token, vendor: { nombre: vendor.nombre, stand_num: vendor.stand_num, es_admin: vendor.es_admin } });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login failed' });
  }
});

// ── Vendor: Lookup folio ──
app.get('/api/vendor/lookup', async (req, res) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const auth = verifyToken(token);
  if (!auth) return res.status(401).json({ error: 'No autorizado' });

  const folio = req.query.folio;
  if (!folio) return res.status(400).json({ error: 'Folio required' });

  const db = getDb();
  if (!db) return res.status(500).json({ error: 'Database not configured' });

  try {
    const rows = await db.select().from(registros).where(eq(registros.folio, folio));
    if (rows.length === 0) return res.status(404).json({ error: 'Registro no encontrado' });

    const stamps = await db.select({
      stand_num: sellos.stand_num, stamp_code: sellos.stamp_code, created_at: sellos.created_at,
    }).from(sellos).where(eq(sellos.folio, folio)).orderBy(asc(sellos.stand_num));

    return res.json({ ok: true, registro: rows[0], sellos: stamps });
  } catch (err) {
    console.error('Lookup error:', err);
    return res.status(500).json({ error: 'Lookup failed' });
  }
});

// ── Vendor: Apply stamp ──
var STAMP_SECRET = 'dgm2025zitara';

function stampHash(folio, stand) {
  var s = folio + '-' + stand + '-' + STAMP_SECRET;
  var h = 0;
  for (var i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h = h & h; }
  return Math.abs(h).toString(36).toUpperCase().padStart(4, '0').slice(0, 4);
}

function makeStampCode(folio, stand) {
  return 'S' + stand + '-' + stampHash(folio, stand);
}

app.post('/api/vendor/stamp', async (req, res) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const auth = verifyToken(token);
  if (!auth) return res.status(401).json({ error: 'No autorizado' });

  const { folio, stand_num } = req.body || {};
  if (!folio) return res.status(400).json({ error: 'Folio required' });

  const standNum = auth.admin ? (stand_num || 0) : auth.stand;
  if (standNum < 1 || standNum > 6) return res.status(400).json({ error: 'Stand inválido (1-6)' });

  const db = getDb();
  if (!db) return res.status(500).json({ error: 'Database not configured' });

  try {
    const reg = await db.select({ folio: registros.folio, nombre: registros.nombre, apellido: registros.apellido })
      .from(registros).where(eq(registros.folio, folio));
    if (reg.length === 0) return res.status(404).json({ error: 'Registro no encontrado' });

    const existing = await db.select({ id: sellos.id }).from(sellos)
      .where(and(eq(sellos.folio, folio), eq(sellos.stand_num, standNum)));
    if (existing.length > 0) return res.status(409).json({ error: 'Este folio ya fue sellado en este stand' });

    const stampCode = makeStampCode(folio, standNum);
    await db.insert(sellos).values({ folio, stand_num: standNum, stamp_code: stampCode });

    const allStamps = await db.select({ stand_num: sellos.stand_num }).from(sellos).where(eq(sellos.folio, folio));
    return res.status(201).json({
      ok: true, stamp_code: stampCode, stand_num: standNum,
      nombre: reg[0].nombre + ' ' + reg[0].apellido, total_stamps: allStamps.length,
    });
  } catch (err) {
    console.error('Stamp error:', err);
    return res.status(500).json({ error: 'Stamp failed' });
  }
});

// ── Vendor: Create vendor ──
app.post('/api/vendor/create', async (req, res) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const auth = verifyToken(token);
  if (!auth || !auth.admin) return res.status(403).json({ error: 'Acceso de administrador requerido' });

  const { nombre, email, password, stand_num } = req.body || {};
  if (!nombre || !email || !password || !stand_num) return res.status(400).json({ error: 'Todos los campos son requeridos' });
  if (stand_num < 1 || stand_num > 6) return res.status(400).json({ error: 'Stand debe ser 1-6' });

  const db = getDb();
  if (!db) return res.status(500).json({ error: 'Database not configured' });

  try {
    const hash = hashPassword(password);
    const rows = await db.insert(vendedores).values({ nombre, email, password_hash: hash, stand_num })
      .onConflictDoUpdate({ target: vendedores.email, set: { nombre, password_hash: hash, stand_num, activo: true } })
      .returning({ id: vendedores.id, nombre: vendedores.nombre, email: vendedores.email, stand_num: vendedores.stand_num, activo: vendedores.activo });
    return res.status(201).json({ ok: true, vendor: rows[0] });
  } catch (err) {
    console.error('Create vendor error:', err);
    return res.status(500).json({ error: 'Failed to create vendor' });
  }
});

// ── Vendor: List vendors + stats ──
app.get('/api/vendor/list', async (req, res) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const auth = verifyToken(token);
  if (!auth || !auth.admin) return res.status(403).json({ error: 'Acceso de administrador requerido' });

  const db = getDb();
  if (!db) return res.status(500).json({ error: 'Database not configured' });

  try {
    const vendors = await db.select().from(vendedores).orderBy(asc(vendedores.stand_num), asc(vendedores.nombre));
    const regCount = await db.select({ total: count() }).from(registros);
    const stampCount = await db.select({ total: count() }).from(sellos);
    return res.json({
      ok: true, vendors,
      stats: { total_registros: regCount[0].total, total_sellos: stampCount[0].total },
    });
  } catch (err) {
    console.error('List vendors error:', err);
    return res.status(500).json({ error: 'Failed to list vendors' });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log('Dogmingo server running on port ' + PORT);
  });
}

module.exports = app;
