const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function upsertUser({ google_id, email }) {
  const { rows } = await pool.query(
    `INSERT INTO users (email, google_id)
     VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET google_id = EXCLUDED.google_id
     RETURNING id, email, role, google_id`,
    [email, google_id]
  );
  return rows[0];
}

module.exports = { pool, upsertUser };
