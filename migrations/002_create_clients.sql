CREATE TABLE IF NOT EXISTS clients (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  contact    VARCHAR(255),
  address    TEXT,
  created_at TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP    NOT NULL DEFAULT NOW()
);
