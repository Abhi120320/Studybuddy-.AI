const express  = require('express');
const router   = express.Router();
const pdfService = require('../services/pdfService');
const { validatePDF, ValidationError } = require('../middleware/validator');
const db       = require('../db/queries');

// GET /upload/list
router.get('/list', async (req, res, next) => {
  try {
    res.json({ success: true, documents: await db.getDocumentsList(req.user.id) });
  } catch (err) { next(err); }
});

// GET /upload/subjects
router.get('/subjects', async (req, res, next) => {
  try {
    res.json({ success: true, subjects: await db.getSubjects(req.user.id) });
  } catch (err) { next(err); }
});

// POST /upload/subjects
router.post('/subjects', async (req, res, next) => {
  try {
    const { name, color, shadow, emoji } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ success: false, error: 'Subject folder name is required' });
    }
    const meta    = { color, shadow, emoji };
    const created = await db.addSubject(req.user.id, name, meta);
    if (!created) {
      return res.status(400).json({ success: false, error: 'Subject folder already exists' });
    }
    res.json({ success: true, subject: created });
  } catch (err) { next(err); }
});

// PATCH /upload/subjects/:name
router.patch('/subjects/:name', async (req, res, next) => {
  try {
    const { name } = req.params;
    const updated  = await db.updateSubjectMeta(req.user.id, name, req.body);
    if (!updated) return res.status(404).json({ success: false, error: 'Subject not found' });
    res.json({ success: true, meta: updated });
  } catch (err) { next(err); }
});

// DELETE /upload/subjects/:name
router.delete('/subjects/:name', async (req, res, next) => {
  try {
    const result = await db.deleteSubject(req.user.id, req.params.name);
    if (!result)         return res.status(404).json({ success: false, error: 'Subject not found' });
    if (result.error)    return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, name: result.name, removedDocuments: result.removedCount });
  } catch (err) { next(err); }
});

// PUT /upload/toggle/:id
router.put('/toggle/:id', async (req, res, next) => {
  try {
    const doc = await db.toggleDocument(req.user.id, req.params.id);
    if (!doc) return res.status(404).json({ success: false, error: 'Document not found' });
    res.json({ success: true, document: doc });
  } catch (err) { next(err); }
});

// POST /upload  — multi-file PDF ingestion
router.post('/', validatePDF, async (req, res, next) => {
  const files = req.files;
  try {
    let totalPages = 0;
    const filesWithPages = [];

    // 1. Validate page counts up-front
    for (const file of files) {
      const pageCount = await pdfService.getPageCount(file.path);
      if (pageCount > 300) {
        throw new ValidationError(
          `"${file.originalname}" has ${pageCount} pages — limit is 300 per upload.`
        );
      }
      totalPages += pageCount;
      filesWithPages.push({ file, pageCount });
    }
    if (totalPages > 300) {
      throw new ValidationError(
        `Total pages across all files is ${totalPages} — limit is 300 per upload.`
      );
    }

    const results      = [];
    let   totalChunks  = 0;

    // 2. Extract text, chunk, store in DB
    for (const { file, pageCount } of filesWithPages) {
      const text     = await pdfService.extractText(file.path);
      const docName  = file.originalname || 'Uploaded Document';
      const subject  = req.body.subject || 'General';

      // Store document record
      const doc      = await db.addDocument(req.user.id, docName, subject, pageCount);

      // Chunk text and persist
      const chunks   = pdfService.chunkText(text);
      await db.addChunks(doc.id, chunks);
      totalChunks   += chunks.length;

      results.push({
        id:          doc.id,
        name:        doc.name,
        active:      doc.active,
        pages:       pageCount,
        chunks:      chunks.length,
        characters:  text.length,
      });

      await pdfService.deleteFile(file.path);

      console.log(`✅ Stored "${docName}": ${pageCount} pages → ${chunks.length} chunks`);
    }

    res.json({
      success:    true,
      message:    `${files.length} document(s) uploaded and indexed`,
      documents:  results,
      totalPages,
      totalChunks,
    });

  } catch (error) {
    for (const file of files) {
      if (file?.path) await pdfService.deleteFile(file.path);
    }
    next(error);
  }
});

module.exports = router;
