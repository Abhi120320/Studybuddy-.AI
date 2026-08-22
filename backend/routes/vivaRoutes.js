const express = require('express');
const router  = express.Router();
const groq    = require('../services/groqService');
const db      = require('../db/queries');

// POST /viva/generate
router.post('/generate', async (req, res, next) => {
  try {
    const { numQuestions = 3 } = req.body;
    // Pass req.user.id to database query helpers
    const rows = await db.getActiveChunks(req.user.id, 15);

    if (!rows.length) {
      return res.status(400).json({
        success: false,
        error: 'No active notes found. Please upload study material first.',
      });
    }

    const data  = await groq.generateVivaQuestions(rows, numQuestions);
    res.json({ success: true, questions: data.questions || [] });
  } catch (err) { next(err); }
});

// POST /viva/evaluate
router.post('/evaluate', async (req, res, next) => {
  try {
    const { question, answer } = req.body;
    if (!question || !answer) {
      return res.status(400).json({ success: false, error: 'Question and answer are required' });
    }

    // Pass req.user.id to database query helpers
    const rows = await db.searchChunks(req.user.id, question, 10);

    if (!rows.length) {
      return res.status(400).json({
        success: false,
        error: 'No active notes found. Please upload study material first.',
      });
    }

    const evaluation = await groq.evaluateVivaAnswer(rows, question, answer);
    res.json({ success: true, evaluation });
  } catch (err) { next(err); }
});

module.exports = router;
