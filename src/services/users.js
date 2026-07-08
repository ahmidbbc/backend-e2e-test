const users = new Map();
let nextId = 1;

function findOrCreateByGoogle({ googleId, email }) {
  let user = users.get(googleId);
  if (!user) {
    user = { id: nextId++, googleId, email, role: 'member' };
    users.set(googleId, user);
  }
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
