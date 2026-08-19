class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 400;
  }
}

const validatePDF = (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next(new ValidationError('No files uploaded'));
  }
  
  for (const file of req.files) {
    if (file.mimetype !== 'application/pdf') {
      return next(new ValidationError(`File "${file.originalname}" must be a PDF`));
    }
  }
  
  next();
};

const validateQuestionRequest = (req, res, next) => {
  const { difficulty, count } = req.body;
  
  if (difficulty && !['easy', 'medium', 'hard'].includes(difficulty)) {
    return next(new ValidationError('Invalid difficulty level'));
  }
  
  if (count && (count < 1 || count > 20)) {
    return next(new ValidationError('Question count must be between 1 and 20'));
  }
  
  next();
};

const validateSummaryRequest = (req, res, next) => {
  const { topic } = req.body;
  
  if (!topic || topic.trim().length === 0) {
    return next(new ValidationError('Topic is required'));
  }
  
  next();
};

const validateScheduleRequest = (req, res, next) => {
  const { daysUntilExam } = req.body;
  
  if (daysUntilExam && (daysUntilExam < 1 || daysUntilExam > 30)) {
    return next(new ValidationError('Days until exam must be between 1 and 30'));
  }
  
  next();
};

const validateExamRequest = (req, res, next) => {
  const { numQuestions } = req.body;
  
  if (numQuestions && (numQuestions < 5 || numQuestions > 20)) {
    return next(new ValidationError('Number of questions must be between 5 and 20'));
  }
  
  next();
};

const validateChatRequest = (req, res, next) => {
  const { question } = req.body;
  
  if (!question || question.trim().length === 0) {
    return next(new ValidationError('Question is required'));
  }
  
  next();
};

module.exports = {
  ValidationError,
  validatePDF,
  validateQuestionRequest,
  validateSummaryRequest,
  validateScheduleRequest,
  validateExamRequest,
  validateChatRequest,
};

