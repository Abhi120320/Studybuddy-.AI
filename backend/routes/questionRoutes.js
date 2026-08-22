const express  = require('express');
const router   = express.Router();
const groq     = require('../services/groqService');
const db       = require('../db/queries');
const { validateQuestionRequest } = require('../middleware/validator');

router.post('/', validateQuestionRequest, async (req, res, next) => {
  try {
    const { difficulty = 'medium', count = 5, topic } = req.body;

    // Pass req.user.id to database query helpers
    const rows = topic
      ? await db.searchChunks(req.user.id, `${topic} ${difficulty}`, 8)
      : await db.getActiveChunks(req.user.id, 10);

    if (!rows.length) {
      return res.status(400).json({ success: false, error: 'Please upload notes first' });
    }

    const notes     = db.chunksToContext(rows);
    const questions = await groq.generateQuestions(notes, difficulty, count);
    res.json({ success: true, questions });
  } catch (err) { next(err); }
});

module.exports = router;
