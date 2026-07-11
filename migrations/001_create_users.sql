CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  email      VARCHAR(255) NOT NULL UNIQUE,
  role       VARCHAR(50)  NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  google_id  VARCHAR(255),
  created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);
