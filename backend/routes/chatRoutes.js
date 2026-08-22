const express = require('express');
const router  = express.Router();
const groq    = require('../services/groqService');
const db      = require('../db/queries');
const { validateChatRequest } = require('../middleware/validator');

router.post('/', validateChatRequest, async (req, res, next) => {
  try {
    const { question, conversationHistory = [] } = req.body;

    // Pass req.user.id to database query helpers
    const rows = await db.searchChunks(req.user.id, question, 12);

    if (!rows.length) {
      return res.status(400).json({ success: false, error: 'Please upload notes first' });
    }

    const answer = await groq.chatWithNotes(rows, conversationHistory, question);
    res.json({ success: true, answer });
  } catch (err) { next(err); }
});

module.exports = router;
