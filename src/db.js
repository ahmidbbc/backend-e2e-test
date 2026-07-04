const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function upsertUser({ google_id, email }) {
  const { rows } = await pool.query(
    `INSERT INTO users (google_id, email)
     VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET google_id = EXCLUDED.google_id
     RETURNING id, email, role, google_id`,
    [google_id, email]
  );
  return rows[0];
}

module.exports = { pool, upsertUser };
