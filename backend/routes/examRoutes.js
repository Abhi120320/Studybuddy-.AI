const express = require('express');
const router  = express.Router();
const groq    = require('../services/groqService');
const db      = require('../db/queries');
const { validateExamRequest } = require('../middleware/validator');

router.post('/', validateExamRequest, async (req, res, next) => {
  try {
    const { numQuestions = 10 } = req.body;

    // Pass req.user.id to database query helpers
    const rows = await db.getActiveChunks(req.user.id, 25);

    if (!rows.length) {
      return res.status(400).json({ success: false, error: 'Please upload notes first' });
    }

    const notes    = db.chunksToContext(rows);
    const examData = await groq.generateExam(notes, numQuestions);
    res.json({ success: true, ...examData });
  } catch (err) { next(err); }
});

module.exports = router;
