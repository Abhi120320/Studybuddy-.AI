-- Study Buddy AI – PostgreSQL Schema
-- Run once on first boot (handled by init script in Docker)

-- ── Users ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  email      VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── One-Time Passwords (OTPs) ───────────────────────────────
CREATE TABLE IF NOT EXISTS otps (
  id         SERIAL PRIMARY KEY,
  email      VARCHAR(255) NOT NULL,
  code       VARCHAR(6) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otps_email ON otps(email);

-- ── Subjects / Folders ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS subjects (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER      REFERENCES users(id) ON DELETE CASCADE,
  name       VARCHAR(255) NOT NULL,
  color      VARCHAR(7)   NOT NULL DEFAULT '#8b5cf6',
  shadow     VARCHAR(7)   NOT NULL DEFAULT '#5b21b6',
  emoji      VARCHAR(10)  NOT NULL DEFAULT '📚',
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, name)
);

-- ── Documents ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id          VARCHAR(50)  PRIMARY KEY,
  name        VARCHAR(500) NOT NULL,
  subject_id  INTEGER      REFERENCES subjects(id) ON DELETE CASCADE,
  active      BOOLEAN      NOT NULL DEFAULT TRUE,
  total_pages INTEGER      NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_subject ON documents(subject_id);
CREATE INDEX IF NOT EXISTS idx_documents_active  ON documents(active);

-- ── Document Chunks (full-text search) ──────────────────────
CREATE TABLE IF NOT EXISTS document_chunks (
  id          SERIAL      PRIMARY KEY,
  document_id VARCHAR(50) NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INTEGER     NOT NULL,
  content     TEXT        NOT NULL,
  -- Generated tsvector column for GIN index (PostgreSQL 12+)
  tsv         TSVECTOR    GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- GIN index for lightning-fast full-text search
CREATE INDEX IF NOT EXISTS idx_chunks_tsv        ON document_chunks USING GIN(tsv);
CREATE INDEX IF NOT EXISTS idx_chunks_document   ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_chunk_idx  ON document_chunks(document_id, chunk_index);
