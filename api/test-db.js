const { neon } = require('@neondatabase/serverless');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const hasUrl = !!process.env.DATABASE_URL;

  if (!hasUrl) {
    return res.status(200).json({ ok: false, error: 'DATABASE_URL not set' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const result = await sql`SELECT NOW() as now, current_database() as db`;
    const tables = await sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' ORDER BY table_name
    `;
    const counts = await sql`
      SELECT
        (SELECT count(*) FROM registros) as registros,
        (SELECT count(*) FROM sellos) as sellos,
        (SELECT count(*) FROM vendedores) as vendedores
    `;

    return res.status(200).json({
      ok: true,
      db: result[0].db,
      time: result[0].now,
      tables: tables.map(t => t.table_name),
      counts: counts[0],
    });
  } catch (err) {
    return res.status(200).json({ ok: false, error: err.message });
  }
};
