const users = new Map();
let nextId = 1;

function findByEmail(email) {
  for (const user of users.values()) {
    if (user.email === email) return user;
  }
  return null;
}

// Upsert keyed on the Google sub, falling back to email so a pre-existing
// account (email UNIQUE in the schema) is reconciled and its google_id
// backfilled rather than duplicated.
function findOrCreateByGoogle({ googleId, email }) {
  let user = users.get(googleId);
  if (user) return user;

  user = findByEmail(email);
  if (user) {
    user.googleId = googleId;
    users.set(googleId, user);
    return user;
  }

  user = { id: nextId++, googleId, email, role: 'member' };
  users.set(googleId, user);
  return user;
}

function findById(id) {
  for (const user of users.values()) {
    if (user.id === id) return user;
  }
  return null;
}

function reset() {
  users.clear();
  nextId = 1;
}

module.exports = { findOrCreateByGoogle, findById, reset };
