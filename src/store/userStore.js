'use strict';

const db = require('../db');

async function findOrCreateUser({ googleId, email }) {
  const { rows } = await db.query(
    `INSERT INTO users (email, google_id)
     VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET google_id = EXCLUDED.google_id
     RETURNING id, email, role, google_id, created_at`,
    [email, googleId],
  );
  return rows[0];
}

module.exports = { findOrCreateUser };
