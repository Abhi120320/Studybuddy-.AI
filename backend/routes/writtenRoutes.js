const express = require('express');
const router  = express.Router();
const fs      = require('fs');
const groq    = require('../services/groqService');
const db      = require('../db/queries');

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

router.post('/', async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file uploaded' });
    }

    // Pass req.user.id to database query helpers
    const rows = await db.getActiveChunks(req.user.id, 20);

    if (!rows.length) {
      return res.status(400).json({
        success: false,
        error: 'No active notes found. Please upload study material first.',
      });
    }

    const notes = db.chunksToContext(rows);
    
    // Perform local OCR on the uploaded image using Tesseract CLI
    let extractedText = '';
    try {
      const { stdout } = await execPromise(`tesseract "${req.file.path}" stdout -l eng`);
      extractedText = stdout.trim();
    } catch (ocrErr) {
      console.warn('⚠️ OCR extraction failed:', ocrErr.message);
    }

    const evaluation = await groq.evaluateWrittenAnswer(notes, extractedText || '(Could not extract text from handwriting)');

    fs.unlink(req.file.path, err => {
      if (err) console.warn('Failed to delete image:', err.message);
    });

    res.json({ success: true, evaluation });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlink(req.file.path, () => {});
    next(err);
  }
});

module.exports = router;
