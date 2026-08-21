/**
 * db/queries.js
 * Database query helpers for StudyBuddy AI.
 * Supports secure Email OTP + JWT authentication with full login history.
 */
'use strict';

const { query } = require('./pool');
const bcrypt    = require('bcryptjs');

const BCRYPT_ROUNDS = 12; // cost factor for password & OTP hashing

// ═══════════════════════════════════════════════════════════════════════════
// ── User Queries ──────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Find a user by email (includes password_hash for auth).
 * Returns null if not found.
 */
async function findUserByEmail(email) {
  const emailClean = email.trim().toLowerCase();
  const res = await query(
    'SELECT id, email, name, password_hash, is_verified FROM users WHERE email = $1',
    [emailClean]
  );
  return res.rows[0] || null;
}

/**
 * Find a user by ID (safe profile — no password_hash).
 * Returns null if not found.
 */
async function findUserById(id) {
  const res = await query(
    'SELECT id, email, name, is_verified, created_at FROM users WHERE id = $1',
    [id]
  );
  return res.rows[0] || null;
}

/**
 * Register a new user with a hashed password.
 * Returns the new user row.
 * Throws on duplicate email (pg error code 23505).
 */
async function createUser(email, name, passwordHash) {
  const emailClean = email.trim().toLowerCase();
  const res = await query(
    `INSERT INTO users (email, name, password_hash, is_verified)
     VALUES ($1, $2, $3, FALSE)
     RETURNING id, email, name, is_verified`,
    [emailClean, name ? name.trim() : null, passwordHash]
  );
  const user = res.rows[0];

  // Auto-seed the General subject folder for new users
  await query(
    `INSERT INTO subjects (user_id, name, color, shadow, emoji)
     VALUES ($1, 'General', '#8b5cf6', '#5b21b6', '📚')
     ON CONFLICT (user_id, name) DO NOTHING`,
    [user.id]
  );

  return user;
}

/**
 * Mark a user as verified (after first successful OTP).
 */
async function markUserVerified(userId) {
  await query(
    `UPDATE users SET is_verified = TRUE, updated_at = NOW() WHERE id = $1`,
    [userId]
  );
}

/**
 * Update a user's password hash (used for password reset / first-time set).
 */
async function updateUserPassword(userId, passwordHash) {
  await query(
    `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
    [passwordHash, userId]
  );
}

/**
 * Legacy: find-or-create user by email (no password).
 * Kept for backward compatibility with existing flows.
 */
async function findOrCreateUser(email) {
  const emailClean = email.trim().toLowerCase();

  const findRes = await query('SELECT id, email FROM users WHERE email = $1', [emailClean]);
  if (findRes.rows.length) {
    return findRes.rows[0];
  }

  const insertRes = await query(
    'INSERT INTO users (email) VALUES ($1) RETURNING id, email',
    [emailClean]
  );
  const user = insertRes.rows[0];

  await query(
    `INSERT INTO subjects (user_id, name, color, shadow, emoji)
     VALUES ($1, 'General', '#8b5cf6', '#5b21b6', '📚')
     ON CONFLICT (user_id, name) DO NOTHING`,
    [user.id]
  );

  return user;
}

// ═══════════════════════════════════════════════════════════════════════════
// ── Login OTP Queries (hardened) ──────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

const OTP_MAX_ATTEMPTS = 5;

/**
 * Invalidate (delete) any previous unverified OTPs for this user.
 * Called before generating a new OTP to prevent reuse of old codes.
 */
async function invalidatePreviousOTPs(userId) {
  await query(
    'DELETE FROM login_otps WHERE user_id = $1 AND verified = FALSE',
    [userId]
  );
}

/**
 * Create a new login OTP for a user.
 * The plaintext OTP is hashed with bcrypt before storage.
 * Returns the created OTP record ID (for tracking, not the code itself).
 *
 * @param {number} userId
 * @param {string} otpPlain  - 6-digit OTP in plaintext
 * @param {Date}   expiresAt
 * @returns {Promise<number>} otpId
 */
async function createLoginOTP(userId, otpPlain, expiresAt) {
  // Invalidate any previous OTPs first
  await invalidatePreviousOTPs(userId);

  const otpHash = await bcrypt.hash(otpPlain, BCRYPT_ROUNDS);

  const res = await query(
    `INSERT INTO login_otps (user_id, otp_hash, expires_at, attempts, verified)
     VALUES ($1, $2, $3, 0, FALSE)
     RETURNING id`,
    [userId, otpHash, expiresAt]
  );
  return res.rows[0].id;
}

/**
 * Verify a plaintext OTP against stored hash for a user.
 * Enforces: expiry check, attempt limit, single-use.
 *
 * @returns {{ success: boolean, reason?: string, otpId?: number }}
 */
async function verifyLoginOTP(userId, otpPlain) {
  // Find the most recent unverified OTP for this user
  const res = await query(
    `SELECT id, otp_hash, expires_at, attempts, verified
     FROM login_otps
     WHERE user_id = $1 AND verified = FALSE
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId]
  );

  if (!res.rows.length) {
    return { success: false, reason: 'No pending OTP found. Please request a new code.' };
  }

  const otp = res.rows[0];

  // Check attempt limit
  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    await query('DELETE FROM login_otps WHERE id = $1', [otp.id]);
    return { success: false, reason: 'Maximum verification attempts exceeded. Please request a new code.' };
  }

  // Check expiry
  if (new Date(otp.expires_at) < new Date()) {
    await query('DELETE FROM login_otps WHERE id = $1', [otp.id]);
    return { success: false, reason: 'Verification code has expired. Please request a new code.' };
  }

  // Verify hash — always increment attempts first (prevents timing-attack enumeration)
  await query(
    'UPDATE login_otps SET attempts = attempts + 1 WHERE id = $1',
    [otp.id]
  );

  const match = await bcrypt.compare(otpPlain, otp.otp_hash);

  if (!match) {
    const remainingAttempts = OTP_MAX_ATTEMPTS - (otp.attempts + 1);
    if (remainingAttempts <= 0) {
      await query('DELETE FROM login_otps WHERE id = $1', [otp.id]);
      return { success: false, reason: 'Maximum verification attempts exceeded. Please request a new code.' };
    }
    return {
      success: false,
      reason : `Invalid verification code. ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining.`,
    };
  }

  // Mark as verified (single-use)
  await query(
    'UPDATE login_otps SET verified = TRUE WHERE id = $1',
    [otp.id]
  );

  return { success: true, otpId: otp.id };
}

// ═══════════════════════════════════════════════════════════════════════════
// ── Login Sessions (History) ──────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Record a successful login event.
 * @returns {Promise<number>} sessionId
 */
async function createLoginSession(userId, ipAddress, userAgent) {
  const res = await query(
    `INSERT INTO login_sessions (user_id, ip_address, user_agent, status)
     VALUES ($1, $2, $3, 'active')
     RETURNING id`,
    [userId, ipAddress || null, userAgent || null]
  );
  return res.rows[0].id;
}

/**
 * Mark a session as logged out.
 */
async function updateSessionLogout(sessionId) {
  await query(
    `UPDATE login_sessions
     SET status = 'logged_out', logout_at = NOW()
     WHERE id = $1`,
    [sessionId]
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── Legacy OTP (kept for backward-compat, do NOT remove) ─────────────────
// ═══════════════════════════════════════════════════════════════════════════

async function createOTP(email, code, expiresAt) {
  const emailClean = email.trim().toLowerCase();
  await query('DELETE FROM otps WHERE email = $1', [emailClean]);
  await query(
    'INSERT INTO otps (email, code, expires_at) VALUES ($1, $2, $3)',
    [emailClean, code, expiresAt]
  );
}

async function verifyOTP(email, code) {
  const emailClean = email.trim().toLowerCase();
  const res = await query(
    `SELECT id, expires_at FROM otps WHERE email = $1 AND code = $2`,
    [emailClean, code]
  );
  if (!res.rows.length) return false;
  const otp = res.rows[0];
  if (new Date(otp.expires_at) < new Date()) {
    await query('DELETE FROM otps WHERE id = $1', [otp.id]);
    return false;
  }
  await query('DELETE FROM otps WHERE id = $1', [otp.id]);
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// ── Subjects ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

async function getSubjects(userId) {
  const res = await query(
    'SELECT id, name, color, shadow, emoji FROM subjects WHERE user_id = $1 ORDER BY id ASC',
    [userId]
  );
  return res.rows.map(r => ({
    name: r.name,
    meta: { color: r.color, shadow: r.shadow, emoji: r.emoji },
  }));
}

async function addSubject(userId, name, meta = {}) {
  const color  = meta.color  || '#60a5fa';
  const shadow = meta.shadow || '#1d4ed8';
  const emoji  = meta.emoji  || '📂';
  try {
    const res = await query(
      `INSERT INTO subjects (user_id, name, color, shadow, emoji)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING name`,
      [userId, name.trim(), color, shadow, emoji]
    );
    return res.rows[0].name;
  } catch (err) {
    if (err.code === '23505') return null; // unique_violation
    throw err;
  }
}

async function updateSubjectMeta(userId, name, meta = {}) {
  const fields = [];
  const values = [userId];
  let i = 2;

  if (meta.color)  { fields.push(`color  = $${i++}`); values.push(meta.color);  }
  if (meta.shadow) { fields.push(`shadow = $${i++}`); values.push(meta.shadow); }
  if (meta.emoji)  { fields.push(`emoji  = $${i++}`); values.push(meta.emoji);  }
  if (!fields.length) return null;

  values.push(name);
  const res = await query(
    `UPDATE subjects SET ${fields.join(', ')}
     WHERE user_id = $1 AND name = $${i}
     RETURNING color, shadow, emoji`,
    values
  );
  return res.rows[0] || null;
}

async function deleteSubject(userId, name) {
  if (name === 'General') return { error: 'Cannot delete the General folder' };

  const countRes = await query(
    `SELECT COUNT(*) FROM documents d
     JOIN subjects s ON s.id = d.subject_id
     WHERE s.user_id = $1 AND s.name = $2`,
    [userId, name]
  );
  const removedCount = parseInt(countRes.rows[0].count, 10);

  const del = await query(
    'DELETE FROM subjects WHERE user_id = $1 AND name = $2 RETURNING name',
    [userId, name]
  );
  if (!del.rows.length) return null;
  return { name, removedCount };
}

// ═══════════════════════════════════════════════════════════════════════════
// ── Documents ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

async function addDocument(userId, name, subjectName, totalPages) {
  const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

  const subRes = await query(
    `SELECT id FROM subjects WHERE user_id = $1 AND name = $2`,
    [userId, subjectName || 'General']
  );
  const subjectId = subRes.rows[0]?.id;
  if (!subjectId) throw new Error(`Subject "${subjectName}" not found`);

  await query(
    `INSERT INTO documents (id, name, subject_id, total_pages)
     VALUES ($1, $2, $3, $4)`,
    [id, name, subjectId, totalPages || 0]
  );
  return { id, name, active: true, subject: subjectName };
}

async function getDocumentsList(userId) {
  const res = await query(
    `SELECT d.id, d.name, d.active, s.name AS subject
     FROM documents d
     JOIN subjects s ON s.id = d.subject_id
     WHERE s.user_id = $1
     ORDER BY d.created_at DESC`,
    [userId]
  );
  return res.rows;
}

async function toggleDocument(userId, id) {
  const res = await query(
    `UPDATE documents d
     SET active = NOT d.active
     FROM subjects s
     WHERE d.subject_id = s.id AND s.user_id = $1 AND d.id = $2
     RETURNING d.id, d.name, d.active`,
    [userId, id]
  );
  return res.rows[0] || null;
}

// ═══════════════════════════════════════════════════════════════════════════
// ── Chunks ────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

async function addChunks(documentId, chunks) {
  if (!chunks.length) return;

  const valuePlaceholders = chunks.map(
    (_, i) => `($1, $${i * 2 + 2}, $${i * 2 + 3})`
  );
  const flatValues = [documentId];
  chunks.forEach((c, i) => { flatValues.push(i, c); });

  await query(
    `INSERT INTO document_chunks (document_id, chunk_index, content)
     VALUES ${valuePlaceholders.join(', ')}`,
    flatValues
  );
}

async function searchChunks(userId, queryText, limit = 8) {
  const res = await query(
    `SELECT dc.content,
            ts_rank(dc.tsv, plainto_tsquery('english', $1)) AS rank,
            d.name AS doc_name,
            s.name AS subject
     FROM document_chunks dc
     JOIN documents d  ON d.id  = dc.document_id
     JOIN subjects  s  ON s.id  = d.subject_id
     WHERE s.user_id = $2
       AND d.active = TRUE
       AND dc.tsv @@ plainto_tsquery('english', $1)
     ORDER BY rank DESC
     LIMIT $3`,
    [queryText, userId, limit]
  );
  return res.rows;
}

async function getActiveChunks(userId, limit = 40) {
  const res = await query(
    `SELECT dc.content, d.name AS doc_name, s.name AS subject
     FROM document_chunks dc
     JOIN documents d ON d.id  = dc.document_id
     JOIN subjects  s ON s.id  = d.subject_id
     WHERE s.user_id = $1 AND d.active = TRUE
     ORDER BY dc.document_id, dc.chunk_index
     LIMIT $2`,
    [userId, limit]
  );
  return res.rows;
}

async function hasActiveNotes(userId) {
  const res = await query(
    `SELECT 1 FROM document_chunks dc
     JOIN documents d ON d.id = dc.document_id
     JOIN subjects s ON s.id = d.subject_id
     WHERE s.user_id = $1 AND d.active = TRUE
     LIMIT 1`,
    [userId]
  );
  return res.rows.length > 0;
}

function chunksToContext(rows) {
  if (!rows.length) return '';
  return rows
    .map(r => `--- From: ${r.doc_name} (${r.subject}) ---\n${r.content}`)
    .join('\n\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// ── Exports ───────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  // User
  findUserByEmail,
  findUserById,
  createUser,
  markUserVerified,
  updateUserPassword,
  findOrCreateUser,        // legacy
  // Login OTP (hardened)
  createLoginOTP,
  verifyLoginOTP,
  invalidatePreviousOTPs,
  // Login Sessions
  createLoginSession,
  updateSessionLogout,
  // Legacy OTP (kept for compat)
  createOTP,
  verifyOTP,
  // Subjects
  getSubjects,
  addSubject,
  updateSubjectMeta,
  deleteSubject,
  // Documents
  addDocument,
  getDocumentsList,
  toggleDocument,
  // Chunks
  addChunks,
  searchChunks,
  getActiveChunks,
  hasActiveNotes,
  chunksToContext,
};
