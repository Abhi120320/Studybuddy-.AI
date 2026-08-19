const express = require('express');
const router  = express.Router();
const fs      = require('fs');
const groq    = require('../services/groqService');
const db      = require('../db/queries');

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

    const notes       = db.chunksToContext(rows);
    const imageBase64 = fs.readFileSync(req.file.path, { encoding: 'base64' });
    const mimeType    = req.file.mimetype;

    const evaluation = await groq.evaluateWrittenAnswer(notes, imageBase64, mimeType);

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
