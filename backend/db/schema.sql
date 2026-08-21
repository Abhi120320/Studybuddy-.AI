-- Study Buddy AI – PostgreSQL Schema
-- Run once on first boot (handled by init script in Docker)
-- All CREATE TABLE/INDEX statements use IF NOT EXISTS — safe to re-run.

-- ── Users ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) UNIQUE NOT NULL,
  name          VARCHAR(255),
  password_hash VARCHAR(255),
  is_verified   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add missing columns to existing users table (idempotent migrations)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='users' AND column_name='name') THEN
    ALTER TABLE users ADD COLUMN name VARCHAR(255);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='users' AND column_name='password_hash') THEN
    ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='users' AND column_name='is_verified') THEN
    ALTER TABLE users ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='users' AND column_name='updated_at') THEN
    ALTER TABLE users ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

-- ── Legacy OTP table (kept for backward-compat — do NOT drop) ──
CREATE TABLE IF NOT EXISTS otps (
  id         SERIAL PRIMARY KEY,
  email      VARCHAR(255) NOT NULL,
  code       VARCHAR(6) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otps_email ON otps(email);

-- ── Login OTPs (hardened — hashed, attempt-tracked) ─────────
CREATE TABLE IF NOT EXISTS login_otps (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  otp_hash   VARCHAR(255) NOT NULL,          -- bcrypt hash of the OTP
  expires_at TIMESTAMPTZ  NOT NULL,
  attempts   INTEGER      NOT NULL DEFAULT 0, -- failed verification attempts
  verified   BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_otps_user    ON login_otps(user_id);
CREATE INDEX IF NOT EXISTS idx_login_otps_expires ON login_otps(expires_at);

-- ── Login Sessions / History ─────────────────────────────────
CREATE TABLE IF NOT EXISTS login_sessions (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  login_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  logout_at  TIMESTAMPTZ,
  ip_address VARCHAR(45),   -- supports IPv6
  user_agent TEXT,
  status     VARCHAR(20)  NOT NULL DEFAULT 'active'  -- active | expired | logged_out
);

CREATE INDEX IF NOT EXISTS idx_sessions_user   ON login_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON login_sessions(status);

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
