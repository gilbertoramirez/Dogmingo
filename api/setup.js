const { neon } = require('@neondatabase/serverless');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

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

    return res.status(200).json({
      ok: true,
      message: 'Tables created successfully',
      tables: tables.map(t => t.table_name)
    });
  } catch (err) {
    console.error('Setup error:', err);
    return res.status(500).json({ error: err.message });
  }
};
