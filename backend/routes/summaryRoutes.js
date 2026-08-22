const express = require('express');
const router  = express.Router();
const groq    = require('../services/groqService');
const db      = require('../db/queries');
const { validateSummaryRequest } = require('../middleware/validator');

router.post('/', validateSummaryRequest, async (req, res, next) => {
  try {
    const { topic } = req.body;

    // Pass req.user.id to database query helpers
    const rows = topic
      ? await db.searchChunks(req.user.id, topic, 15)
      : await db.getActiveChunks(req.user.id, 20);

    if (!rows.length) {
      return res.status(400).json({ success: false, error: 'Please upload notes first' });
    }

    const summary = await groq.generateSummary(rows, topic || 'all topics');
    res.json({ success: true, summary });
  } catch (err) { next(err); }
});

module.exports = router;
