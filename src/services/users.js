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

function reset() {
  users.clear();
  nextId = 1;
}

module.exports = { findOrCreateByGoogle, reset };
