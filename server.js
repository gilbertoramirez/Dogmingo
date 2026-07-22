const express = require('express');
const path = require('path');
const crypto = require('crypto');
const { getDb, registros, sellos, vendedores } = require('./db');
const { createToken, verifyToken, hashPassword } = require('./api/_auth');
const { eq, or, and, asc, desc, count } = require('drizzle-orm');
const nodemailer = require('nodemailer');
const { neon } = require('@neondatabase/serverless');

const CODE_SECRET = process.env.VENDOR_SECRET || 'dgm2025-vendor-key';

const ALL_STAMP_IDS = [1,2,3,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27];
const TOTAL_STAMPS = ALL_STAMP_IDS.length;
const RAFFLE_STAMPS = 6;

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
app.use('/api', function (req, res, next) { autoMigrate().then(next).catch(next); });

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
        es_subadmin   BOOLEAN DEFAULT FALSE,
        activo        BOOLEAN DEFAULT TRUE,
        created_at    TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`
      ALTER TABLE vendedores ADD COLUMN IF NOT EXISTS es_subadmin BOOLEAN DEFAULT FALSE
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_registros_email ON registros(email)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_registros_telefono ON registros(telefono)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sellos_folio ON sellos(folio)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_vendedores_telefono ON vendedores(telefono)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_vendedores_stand ON vendedores(stand_num)`;
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

function getMailTransport() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

app.post('/api/send-code', async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email required' });
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return res.status(500).json({ error: 'Email service not configured' });
  }

  try {
    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    const signature = signCode(email.toLowerCase().trim(), code, expiresAt);
    const token = Buffer.from(JSON.stringify({ email: email.toLowerCase().trim(), code, exp: expiresAt, sig: signature })).toString('base64');

    const transporter = getMailTransport();
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: email,
      subject: 'Tu código de verificación - Dogmingo',
      html: [
        '<div style="font-family:system-ui,sans-serif;max-width:400px;margin:0 auto;background:#FAF8F3;padding:2rem;border-radius:16px;text-align:center;">',
        '<h1 style="color:#BF7634;font-size:1.8rem;margin:0 0 0.5rem;">DOGMINGO</h1>',
        '<p style="color:#5C584F;margin:0 0 1.5rem;">El Domingo más Perrón del Año</p>',
        '<hr style="border:none;border-top:2px dashed #D4C9B5;margin:0 0 1.5rem;">',
        '<p style="color:#191714;font-size:1rem;margin:0 0 1rem;">Tu código de verificación es:</p>',
        '<div style="background:#FFFFFF;padding:1rem;border-radius:12px;margin:0 0 1rem;">',
        '<span style="font-size:2.5rem;font-weight:800;letter-spacing:0.3em;color:#313323;">' + code + '</span>',
        '</div>',
        '<p style="color:#8A8378;font-size:0.85rem;margin:0;">Este código expira en 10 minutos.</p>',
        '</div>',
      ].join('\n'),
    });
    return res.json({ ok: true, token });
  } catch (err) {
    console.error('Send code error:', err);
    return res.status(500).json({ error: 'Failed to send code: ' + err.message });
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
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ error: 'Correo electrónico no válido' });
  }
  if (telefono.replace(/\D/g, '').length !== 10) {
    return res.status(400).json({ error: 'El teléfono debe ser de 10 dígitos' });
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

// ── Stamps lookup by email (public) ──
app.get('/api/stamps/lookup', async (req, res) => {
  const q = (req.query.q || req.query.email || '').trim();
  if (!q) return res.status(400).json({ error: 'Correo o teléfono requerido' });

  const db = getDb();
  if (!db) return res.json({ ok: false, error: 'Base de datos no disponible' });

  const isEmail = q.includes('@');
  const searchVal = isEmail ? q.toLowerCase() : q.replace(/\D/g, '');

  try {
    const reg = await db.select({
      folio: registros.folio, nombre: registros.nombre, apellido: registros.apellido,
    }).from(registros).where(
      isEmail ? eq(registros.email, searchVal) : eq(registros.telefono, searchVal)
    );
    if (reg.length === 0) return res.json({ ok: false, error: 'No se encontró un registro con ese correo o teléfono.' });

    const stamps = await db.select({ stand_num: sellos.stand_num })
      .from(sellos).where(eq(sellos.folio, reg[0].folio)).orderBy(asc(sellos.stand_num));

    return res.json({
      ok: true,
      folio: reg[0].folio,
      nombre: reg[0].nombre + ' ' + reg[0].apellido,
      stamps: stamps.map(s => s.stand_num),
    });
  } catch (err) {
    console.error('Stamps lookup error:', err);
    return res.json({ ok: false, error: 'Error al consultar sellos.' });
  }
});

// ── Send passport email ──
app.post('/api/send-passport', async (req, res) => {
  const { email, nombre, folio, passportImage } = req.body || {};
  if (!email || !nombre || !folio || !passportImage) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return res.status(500).json({ error: 'Email service not configured' });
  }

  try {
    const base64Data = passportImage.replace(/^data:image\/png;base64,/, '');
    const transporter = getMailTransport();

    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: email,
      subject: 'Tu Pasaporte Perruno - Dogmingo',
      html: [
        '<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;background:#FAF8F3;padding:2rem;border-radius:16px;">',
        '<h1 style="color:#BF7634;text-align:center;font-size:2rem;margin:0 0 0.5rem;">DOGMINGO</h1>',
        '<p style="text-align:center;color:#5C584F;margin:0 0 1.5rem;">El Domingo más Perrón del Año</p>',
        '<hr style="border:none;border-top:2px dashed #D4C9B5;margin:0 0 1.5rem;">',
        '<h2 style="color:#191714;text-align:center;margin:0 0 0.5rem;">¡Hola ' + nombre + '!</h2>',
        '<p style="color:#5C584F;text-align:center;margin:0 0 1.5rem;">Tu registro ha sido confirmado. Aquí está tu Pasaporte Perruno digital.</p>',
        '<div style="background:#FFFFFF;padding:1.5rem;border-radius:12px;margin:0 0 1.5rem;text-align:center;">',
        '<p style="font-weight:700;color:#313323;margin:0 0 0.5rem;">Tu folio: ' + folio + '</p>',
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
      attachments: [{ filename: 'pasaporte-perruno-dogmingo.png', content: Buffer.from(base64Data, 'base64') }]
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

  if (email === 'admin') {
    const db = getDb();
    if (db) {
      try {
        const existing = await db.select({ id: vendedores.id, password_hash: vendedores.password_hash })
          .from(vendedores).where(and(eq(vendedores.email, 'admin'), eq(vendedores.es_admin, true)));
        if (existing.length > 0) {
          const inputHash = hashPassword(password);
          if (existing[0].password_hash !== inputHash) return res.status(401).json({ error: 'Credenciales inválidas' });
          const token = createToken({ id: existing[0].id, stand_num: 0, es_admin: true });
          return res.json({ ok: true, token, vendor: { nombre: 'Administrador', stand_num: 0, es_admin: true } });
        }
        if (password !== (process.env.ADMIN_PASSWORD || 'admin')) return res.status(401).json({ error: 'Credenciales inválidas' });
        const hash = hashPassword(password);
        const rows = await db.insert(vendedores).values({ nombre: 'Administrador', email: 'admin', password_hash: hash, stand_num: 0, es_admin: true })
          .returning({ id: vendedores.id });
        const token = createToken({ id: rows[0].id, stand_num: 0, es_admin: true });
        return res.json({ ok: true, token, vendor: { nombre: 'Administrador', stand_num: 0, es_admin: true } });
      } catch (err) {
        console.error('Admin login DB error:', err);
      }
    }
    if (password === (process.env.ADMIN_PASSWORD || 'admin')) {
      const token = createToken({ id: 0, stand_num: 0, es_admin: true });
      return res.json({ ok: true, token, vendor: { nombre: 'Administrador', stand_num: 0, es_admin: true } });
    }
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const db = getDb();
  if (!db) return res.status(500).json({ error: 'Database not configured' });

  try {
    const hash = hashPassword(password);
    const rows = await db.select({
      id: vendedores.id, nombre: vendedores.nombre, email: vendedores.email,
      stand_num: vendedores.stand_num, es_admin: vendedores.es_admin, es_subadmin: vendedores.es_subadmin,
    }).from(vendedores).where(
      and(
        or(eq(vendedores.email, email), eq(vendedores.telefono, email)),
        eq(vendedores.password_hash, hash),
        eq(vendedores.activo, true)
      )
    );
    if (rows.length === 0) return res.status(401).json({ error: 'Credenciales inválidas' });

    const vendor = rows[0];
    const token = createToken(vendor);
    return res.json({ ok: true, token, vendor: { nombre: vendor.nombre, stand_num: vendor.stand_num, es_admin: vendor.es_admin, es_subadmin: vendor.es_subadmin } });
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
  if (ALL_STAMP_IDS.indexOf(standNum) === -1) return res.status(400).json({ error: 'Stand inválido' });

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
    const totalStamps = allStamps.length;

    if (totalStamps === RAFFLE_STAMPS) {
      try {
        const fullReg = await db.select({ email: registros.email, nombre: registros.nombre, apellido: registros.apellido })
          .from(registros).where(eq(registros.folio, folio));
        if (fullReg.length > 0 && process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
          const transporter = getMailTransport();
          const nombre = fullReg[0].nombre + ' ' + fullReg[0].apellido;
          await transporter.sendMail({
            from: process.env.GMAIL_USER,
            to: fullReg[0].email,
            subject: '¡Ya participas en la rifa! 🐾 - Dogmingo',
            html: [
              '<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;background:#FAF8F3;padding:2rem;border-radius:16px;text-align:center;">',
              '<h1 style="color:#3A5A3E;font-size:1.8rem;margin:0 0 0.5rem;">¡FELICIDADES!</h1>',
              '<p style="color:#C4923A;font-weight:700;font-size:1.2rem;margin:0 0 1rem;">🐾 🐾 🐾</p>',
              '<p style="color:#191714;font-size:1.1rem;margin:0 0 1rem;"><strong>' + nombre + '</strong>, completaste ' + RAFFLE_STAMPS + ' sellos de tu Pasaporte Perruno.</p>',
              '<div style="background:#3A5A3E;color:#FBF7F0;padding:1.25rem;border-radius:12px;margin:0 0 1.5rem;">',
              '<p style="margin:0;font-size:1rem;font-weight:700;">¡Ya participas en la rifa! El ganador se anunciará al final del evento.</p>',
              '</div>',
              '<p style="color:#6B6558;font-size:0.85rem;margin:0;">Folio: <strong>' + folio + '</strong></p>',
              '<hr style="border:none;border-top:2px dashed #D4C9B5;margin:1.5rem 0;">',
              '<p style="color:#8A8378;font-size:0.8rem;margin:0;">Dogmingo — El Domingo más Perrón del Año</p>',
              '</div>',
            ].join('\n'),
          });
        }
      } catch (emailErr) {
        console.error('Congratulations email error:', emailErr);
      }
    }

    return res.status(201).json({
      ok: true, stamp_code: stampCode, stand_num: standNum,
      nombre: reg[0].nombre + ' ' + reg[0].apellido, total_stamps: totalStamps,
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
  if (!auth) return res.status(403).json({ error: 'No autorizado' });
  if (!auth.admin && !auth.subadmin) return res.status(403).json({ error: 'No tienes permisos para crear vendedores' });

  const { nombre, email: identifier, password, stand_num } = req.body || {};
  if (!nombre || !identifier || !password) return res.status(400).json({ error: 'Todos los campos son requeridos' });

  const isPhone = /^\d{10}$/.test(identifier.replace(/\D/g, ''));
  const vendorEmail = isPhone ? identifier.replace(/\D/g, '') : identifier;
  const vendorTelefono = isPhone ? identifier.replace(/\D/g, '') : null;

  const assignedStand = auth.admin ? (parseInt(stand_num) || 1) : auth.stand;
  if (ALL_STAMP_IDS.indexOf(assignedStand) === -1) return res.status(400).json({ error: 'Stand inválido' });

  const isSubadmin = auth.admin ? true : false;

  const db = getDb();
  if (!db) return res.status(500).json({ error: 'Database not configured' });

  try {
    const hash = hashPassword(password);
    const rows = await db.insert(vendedores).values({ nombre, email: vendorEmail, telefono: vendorTelefono, password_hash: hash, stand_num: assignedStand, es_subadmin: isSubadmin })
      .onConflictDoUpdate({ target: vendedores.email, set: { nombre, password_hash: hash, stand_num: assignedStand, es_subadmin: isSubadmin, telefono: vendorTelefono, activo: true } })
      .returning({ id: vendedores.id, nombre: vendedores.nombre, email: vendedores.email, stand_num: vendedores.stand_num, activo: vendedores.activo });
    return res.status(201).json({ ok: true, vendor: rows[0] });
  } catch (err) {
    console.error('Create vendor error:', err);
    return res.status(500).json({ error: 'Error al crear vendedor' });
  }
});

// ── Vendor: Change password ──
app.post('/api/vendor/change-password', async (req, res) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const auth = verifyToken(token);
  if (!auth) return res.status(403).json({ error: 'No autorizado' });

  const { vendor_email, new_password, current_password } = req.body || {};

  if (auth.admin && vendor_email) {
    if (!new_password || new_password.length < 4) return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres' });
    const db = getDb();
    if (!db) return res.status(500).json({ error: 'Database not configured' });
    try {
      const hash = hashPassword(new_password);
      const rows = await db.update(vendedores).set({ password_hash: hash }).where(eq(vendedores.email, vendor_email)).returning({ id: vendedores.id });
      if (rows.length === 0) return res.status(404).json({ error: 'Vendedor no encontrado' });
      return res.json({ ok: true });
    } catch (err) {
      console.error('Change password error:', err);
      return res.status(500).json({ error: 'Error al cambiar contraseña' });
    }
  }

  if (!current_password) return res.status(400).json({ error: 'Contraseña actual requerida' });
  if (!new_password || new_password.length < 4) return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 4 caracteres' });
  const db = getDb();
  if (!db) return res.status(500).json({ error: 'Database not configured' });
  try {
    const currentHash = hashPassword(current_password);
    const existing = await db.select({ id: vendedores.id }).from(vendedores)
      .where(and(eq(vendedores.id, auth.id), eq(vendedores.password_hash, currentHash)));
    if (existing.length === 0) return res.status(403).json({ error: 'Contraseña actual incorrecta' });

    const hash = hashPassword(new_password);
    const rows = await db.update(vendedores).set({ password_hash: hash }).where(eq(vendedores.id, auth.id)).returning({ id: vendedores.id });
    if (rows.length === 0) return res.status(404).json({ error: 'Vendedor no encontrado' });
    return res.json({ ok: true });
  } catch (err) {
    console.error('Change password error:', err);
    return res.status(500).json({ error: 'Error al cambiar contraseña' });
  }
});

// ── Admin: Change vendor stand ──
app.post('/api/vendor/change-stand', async (req, res) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const auth = verifyToken(token);
  if (!auth || !auth.admin) return res.status(403).json({ error: 'Acceso de administrador requerido' });

  const { vendor_email, new_stand } = req.body || {};
  if (!vendor_email || !new_stand) return res.status(400).json({ error: 'Datos incompletos' });
  const standNum = parseInt(new_stand, 10);
  if (isNaN(standNum)) return res.status(400).json({ error: 'Stand inválido' });

  const db = getDb();
  if (!db) return res.status(500).json({ error: 'Database not configured' });
  try {
    const rows = await db.update(vendedores).set({ stand_num: standNum }).where(eq(vendedores.email, vendor_email)).returning({ id: vendedores.id });
    if (rows.length === 0) return res.status(404).json({ error: 'Vendedor no encontrado' });
    return res.json({ ok: true });
  } catch (err) {
    console.error('Change stand error:', err);
    return res.status(500).json({ error: 'Error al cambiar stand' });
  }
});

// ── Admin: List registros ──
app.get('/api/admin/registros', async (req, res) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const auth = verifyToken(token);
  if (!auth || !auth.admin) return res.status(403).json({ error: 'Acceso de administrador requerido' });

  const db = getDb();
  if (!db) return res.status(500).json({ error: 'Database not configured' });

  try {
    const regs = await db.select({
      folio: registros.folio, nombre: registros.nombre, apellido: registros.apellido,
      email: registros.email, telefono: registros.telefono,
      adultos: registros.adultos, ninos: registros.ninos,
      trae_perro: registros.trae_perro, nombre_perro: registros.nombre_perro,
      created_at: registros.created_at,
    }).from(registros).orderBy(desc(registros.created_at));

    const allStamps = await db.select({
      folio: sellos.folio, stand_num: sellos.stand_num,
    }).from(sellos);

    const stampMap = {};
    allStamps.forEach(s => {
      if (!stampMap[s.folio]) stampMap[s.folio] = [];
      stampMap[s.folio].push(s.stand_num);
    });

    const result = regs.map(r => ({
      ...r,
      stamps: stampMap[r.folio] || [],
    }));

    return res.json({ ok: true, registros: result });
  } catch (err) {
    console.error('Admin registros error:', err);
    return res.status(500).json({ error: 'Error al cargar registros' });
  }
});

// ── Vendor: Team (same stand) ──
app.get('/api/vendor/team', async (req, res) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const auth = verifyToken(token);
  if (!auth) return res.status(401).json({ error: 'No autorizado' });

  const db = getDb();
  if (!db) return res.status(500).json({ error: 'Database not configured' });

  try {
    const vendors = await db.select({
      id: vendedores.id, nombre: vendedores.nombre, email: vendedores.email,
    }).from(vendedores).where(
      and(eq(vendedores.stand_num, auth.stand), eq(vendedores.activo, true))
    ).orderBy(asc(vendedores.nombre));
    return res.json({ ok: true, vendors });
  } catch (err) {
    console.error('Team list error:', err);
    return res.status(500).json({ error: 'Error al cargar equipo' });
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
    const vendors = await db.select({
      id: vendedores.id, nombre: vendedores.nombre, email: vendedores.email,
      stand_num: vendedores.stand_num, es_admin: vendedores.es_admin, activo: vendedores.activo,
    }).from(vendedores).orderBy(asc(vendedores.stand_num), asc(vendedores.nombre));
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

// ── Admin: Raffle eligible ──
app.get('/api/admin/raffle-eligible', async (req, res) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const auth = verifyToken(token);
  if (!auth || !auth.admin) return res.status(403).json({ error: 'Acceso de administrador requerido' });

  const db = getDb();
  if (!db) return res.status(500).json({ error: 'Database not configured' });

  try {
    const regs = await db.select({
      folio: registros.folio, nombre: registros.nombre, apellido: registros.apellido,
      email: registros.email, telefono: registros.telefono,
      gano_rifa: registros.gano_rifa,
    }).from(registros).orderBy(asc(registros.nombre));

    const allStamps = await db.select({
      folio: sellos.folio, stand_num: sellos.stand_num,
    }).from(sellos);

    const stampMap = {};
    allStamps.forEach(s => {
      if (!stampMap[s.folio]) stampMap[s.folio] = [];
      stampMap[s.folio].push(s.stand_num);
    });

    const eligible = regs.filter(r => {
      const userStamps = stampMap[r.folio] || [];
      return userStamps.length >= RAFFLE_STAMPS && !r.gano_rifa;
    });

    return res.json({ ok: true, eligible, total_required: RAFFLE_STAMPS });
  } catch (err) {
    console.error('Raffle eligible error:', err);
    return res.status(500).json({ error: 'Error al cargar participantes' });
  }
});

app.post('/api/admin/raffle-winner', async (req, res) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const auth = verifyToken(token);
  if (!auth || !auth.admin) return res.status(403).json({ error: 'Acceso de administrador requerido' });

  const { folio } = req.body || {};
  if (!folio) return res.status(400).json({ error: 'Folio requerido' });

  const db = getDb();
  if (!db) return res.status(500).json({ error: 'Database not configured' });

  try {
    await db.update(registros).set({ gano_rifa: true }).where(eq(registros.folio, folio));
    return res.json({ ok: true });
  } catch (err) {
    console.error('Raffle winner error:', err);
    return res.status(500).json({ error: 'Error al marcar ganador' });
  }
});

// ── Seed test data (temporary, remove before production) ──
app.post('/api/admin/seed-test', async (req, res) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const auth = verifyToken(token);
  if (!auth || !auth.admin) return res.status(403).json({ error: 'Admin requerido' });

  const db = getDb();
  if (!db) return res.status(500).json({ error: 'Database not configured' });

  const testUsers = [
    { nombre: 'María', apellido: 'López', email: 'maria.test@demo.com', telefono: '4491000001', adultos: 2, ninos: 1, trae_perro: true, nombre_perro: 'Firulais' },
    { nombre: 'Carlos', apellido: 'Hernández', email: 'carlos.test@demo.com', telefono: '4491000002', adultos: 1, ninos: 0, trae_perro: true, nombre_perro: 'Luna' },
    { nombre: 'Ana', apellido: 'García', email: 'ana.test@demo.com', telefono: '4491000003', adultos: 2, ninos: 2, trae_perro: false, nombre_perro: '' },
    { nombre: 'Roberto', apellido: 'Martínez', email: 'roberto.test@demo.com', telefono: '4491000004', adultos: 1, ninos: 0, trae_perro: true, nombre_perro: 'Max' },
    { nombre: 'Sofía', apellido: 'Ramírez', email: 'sofia.test@demo.com', telefono: '4491000005', adultos: 1, ninos: 1, trae_perro: true, nombre_perro: 'Coco' },
    { nombre: 'Diego', apellido: 'Torres', email: 'diego.test@demo.com', telefono: '4491000006', adultos: 2, ninos: 0, trae_perro: true, nombre_perro: 'Rocky' },
    { nombre: 'Laura', apellido: 'Sánchez', email: 'laura.test@demo.com', telefono: '4491000007', adultos: 1, ninos: 0, trae_perro: false, nombre_perro: '' },
    { nombre: 'Pedro', apellido: 'Flores', email: 'pedro.test@demo.com', telefono: '4491000008', adultos: 1, ninos: 3, trae_perro: true, nombre_perro: 'Canela' },
  ];

  try {
    let created = 0;
    for (const user of testUsers) {
      const folio = 'DGM-TEST' + (created + 1);
      try {
        await db.insert(registros).values({ folio, ...user }).onConflictDoNothing();
        created++;

        // Assign random stamps (6-10 per user so most qualify for raffle)
        const numStamps = 6 + Math.floor(Math.random() * 5);
        const shuffled = ALL_STAMP_IDS.slice().sort(() => Math.random() - 0.5);
        const userStamps = shuffled.slice(0, numStamps);
        for (const stampId of userStamps) {
          const code = makeStampCode(folio, stampId);
          await db.insert(sellos).values({ folio, stand_num: stampId, stamp_code: code }).onConflictDoNothing();
        }
      } catch (e) { /* skip duplicates */ }
    }
    return res.json({ ok: true, message: created + ' registros de prueba creados con sellos aleatorios (6-10 cada uno)' });
  } catch (err) {
    console.error('Seed error:', err);
    return res.status(500).json({ error: 'Error al crear datos de prueba' });
  }
});

let migrated = false;
async function autoMigrate() {
  if (migrated || !process.env.DATABASE_URL) return;
  migrated = true;
  try {
    const sql = neon(process.env.DATABASE_URL);
    await sql`ALTER TABLE vendedores ADD COLUMN IF NOT EXISTS es_subadmin BOOLEAN DEFAULT FALSE`;
    await sql`ALTER TABLE registros ADD COLUMN IF NOT EXISTS gano_rifa BOOLEAN DEFAULT FALSE`;
    await sql`ALTER TABLE vendedores ADD COLUMN IF NOT EXISTS telefono TEXT`;
    await sql`CREATE INDEX IF NOT EXISTS idx_registros_email ON registros(email)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_registros_telefono ON registros(telefono)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sellos_folio ON sellos(folio)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_vendedores_telefono ON vendedores(telefono)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_vendedores_stand ON vendedores(stand_num)`;
  } catch (err) {
    console.error('Auto-migrate error (non-fatal):', err.message);
  }
}

if (require.main === module) {
  autoMigrate().then(() => {
    app.listen(PORT, () => {
      console.log('Dogmingo server running on port ' + PORT);
    });
  });
}

module.exports = app;
