const express = require('express');
const router  = express.Router();
const groq    = require('../services/groqService');
const db      = require('../db/queries');
const { validateScheduleRequest } = require('../middleware/validator');

router.post('/', validateScheduleRequest, async (req, res, next) => {
  try {
    const { daysUntilExam = 7 } = req.body;

    // Pass req.user.id to database query helpers
    const rows = await db.getActiveChunks(req.user.id, 15);

    if (!rows.length) {
      return res.status(400).json({ success: false, error: 'Please upload notes first' });
    }

    const scheduleData = await groq.generateSchedule(rows, daysUntilExam);
    res.json({ success: true, ...scheduleData });
  } catch (err) { next(err); }
});

module.exports = router;
