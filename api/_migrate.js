const { neon } = require('@neondatabase/serverless');

async function migrate() {
  if (!process.env.DATABASE_URL) {
    console.error('Set DATABASE_URL environment variable');
    process.exit(1);
  }

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
      stand_num     INTEGER NOT NULL CHECK (stand_num BETWEEN 1 AND 6),
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
      stand_num     INTEGER NOT NULL CHECK (stand_num BETWEEN 1 AND 6),
      es_admin      BOOLEAN DEFAULT FALSE,
      activo        BOOLEAN DEFAULT TRUE,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  console.log('Migration complete');
}

migrate().catch(console.error);
