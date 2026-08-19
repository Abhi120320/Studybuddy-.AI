/**
 * db/queries.js
 * Database query helpers supporting multi-user JWT authentication.
 */
const { query } = require('./pool');

// ── User & Auth Queries ───────────────────────────────────────────────────

async function findOrCreateUser(email) {
  const emailClean = email.trim().toLowerCase();
  
  // Find user
  const findRes = await query('SELECT id, email FROM users WHERE email = $1', [emailClean]);
  if (findRes.rows.length) {
    return findRes.rows[0];
  }
  
  // Create user if not exists
  const insertRes = await query(
    'INSERT INTO users (email) VALUES ($1) RETURNING id, email',
    [emailClean]
  );
  const user = insertRes.rows[0];
  
  // Auto-seed the General folder for new user
  await query(
    `INSERT INTO subjects (user_id, name, color, shadow, emoji)
     VALUES ($1, 'General', '#8b5cf6', '#5b21b6', '📚')
     ON CONFLICT (user_id, name) DO NOTHING`,
    [user.id]
  );
  
  return user;
}

async function createOTP(email, code, expiresAt) {
  const emailClean = email.trim().toLowerCase();
  
  // Delete any old OTPs for this user first
  await query('DELETE FROM otps WHERE email = $1', [emailClean]);
  
  await query(
    'INSERT INTO otps (email, code, expires_at) VALUES ($1, $2, $3)',
    [emailClean, code, expiresAt]
  );
}

async function verifyOTP(email, code) {
  const emailClean = email.trim().toLowerCase();
  const res = await query(
    `SELECT id, expires_at FROM otps 
     WHERE email = $1 AND code = $2`,
    [emailClean, code]
  );
  
  if (!res.rows.length) return false;
  
  const otp = res.rows[0];
  const now = new Date();
  
  if (new Date(otp.expires_at) < now) {
    // Expired OTP, delete it
    await query('DELETE FROM otps WHERE id = $1', [otp.id]);
    return false;
  }
  
  // Valid OTP, delete to prevent reuse
  await query('DELETE FROM otps WHERE id = $1', [otp.id]);
  return true;
}

// ── Subjects ──────────────────────────────────────────────────────────────

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
  
  // Count docs first
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

// ── Documents ─────────────────────────────────────────────────────────────

async function addDocument(userId, name, subjectName, totalPages) {
  const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  
  // Resolve subject id (default to General)
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

// ── Chunks ────────────────────────────────────────────────────────────────

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

module.exports = {
  findOrCreateUser,
  createOTP,
  verifyOTP,
  getSubjects,
  addSubject,
  updateSubjectMeta,
  deleteSubject,
  addDocument,
  getDocumentsList,
  toggleDocument,
  addChunks,
  searchChunks,
  getActiveChunks,
  hasActiveNotes,
  chunksToContext,
};
