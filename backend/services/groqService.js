/**
 * services/groqService.js
 * Facade class that preserves the existing API contract for StudyBuddy AI features
 * but delegates all executions internally to the new centralized AI Router.
 */
'use strict';

const aiRouter = require('./ai/aiRouter');
const { AI_TASKS } = require('./ai/aiTypes');

class GroqService {
  /**
   * Generate practice questions based on study notes.
   */
  async generateQuestions(notes, difficulty, count) {
    const prompt = `Based on these study notes, generate ${count} practice questions at ${difficulty} level. 
    
Keep all explanations extremely brief (1 short sentence maximum) to ensure fast generation.

Format your response as a JSON array like this:
[
  {
    "question": "question text",
    "options": ["A) option1", "B) option2", "C) option3", "D) option4"],
    "correctAnswer": "A",
    "explanation": "explanation why A is correct"
  }
]

Generate ONLY the JSON, no other text.`;

    const response = await aiRouter.generate({
      taskType: AI_TASKS.QUIZ_GENERATION,
      context: notes,
      prompt: prompt,
      temperature: 0.5,
      responseFormat: true
    });

    try {
      return JSON.parse(response.content);
    } catch (e) {
      console.warn('[groqService] Failed strict JSON parse for questions, fallback empty array:', e);
      return [];
    }
  }

  /**
   * Create a clear and concise summary of the notes focusing on a specific topic.
   */
  async generateSummary(notes, topic) {
    const prompt = `From these study notes, create a clear, extremely concise summary focused on: "${topic}"
Keep all bullet points short (under 10 words each) for maximum speed.
    
Format as:
**Key Concepts:**
- concept 1
- concept 2

**Important Formulas/Definitions:**
- formula 1
- formula 2

**Real-world Examples:**
- example 1`;

    const response = await aiRouter.generate({
      taskType: AI_TASKS.SUMMARY,
      context: notes,
      prompt: prompt,
      temperature: 0.7
    });

    return response.content;
  }

  /**
   * Create an optimal day-by-day study schedule.
   */
  async generateSchedule(notes, daysUntilExam) {
    const prompt = `Based on these study notes, create an optimal ${daysUntilExam}-day study schedule.
    
Keep all descriptions very brief (maximum 3-4 words per activity, and only 1 tip) to ensure fast generation.

Format as JSON:
{
  "schedule": [
    {
      "day": 1,
      "topic": "Topic name",
      "duration": "2 hours",
      "activities": ["activity 1", "activity 2"]
    }
  ],
  "tips": ["tip 1"]
}

Generate ONLY JSON.`;

    const response = await aiRouter.generate({
      taskType: AI_TASKS.STUDY_PLAN,
      context: notes,
      prompt: prompt,
      temperature: 0.5,
      responseFormat: true
    });

    try {
      return JSON.parse(response.content);
    } catch (e) {
      console.warn('[groqService] Failed strict JSON parse for study schedule:', e);
      return { schedule: [], tips: [] };
    }
  }

  /**
   * Generate a mock exam. Combines batch generation to prevent exceeding single token limits.
   */
  async generateExam(notes, numQuestions) {
    const chunks = Array.isArray(notes) ? notes : [notes];
    
    // Batch generation to avoid single massive completions
    const batchSize = 5;
    const numBatches = Math.ceil(numQuestions / batchSize);
    
    let allQuestions = [];
    const chunksPerBatch = Math.ceil(chunks.length / numBatches) || 1;

    for (let i = 0; i < numBatches; i++) {
      const startIdx = i * chunksPerBatch;
      const endIdx = Math.min(startIdx + chunksPerBatch, chunks.length);
      const batchChunks = chunks.slice(startIdx, endIdx);

      const questionsToGenerate = Math.min(batchSize, numQuestions - allQuestions.length);
      if (questionsToGenerate <= 0) break;

      const prompt = `Generate a ${questionsToGenerate}-question mock exam based on these notes. Ensure questions are unique.

Keep all explanations extremely brief (1 short sentence maximum) to ensure fast generation.

Format JSON only:
{
  "exam": [
    {
      "id": ${allQuestions.length + 1},
      "question": "question text",
      "options": ["A) opt1", "B) opt2", "C) opt3", "D) opt4"],
      "correctAnswer": "A",
      "explanation": "why this is correct"
    }
  ]
}`;

      try {
        const response = await aiRouter.generate({
          taskType: AI_TASKS.MOCK_EXAM,
          context: batchChunks,
          prompt: prompt,
          temperature: 0.5,
          responseFormat: true
        });

        const parsed = JSON.parse(response.content);
        const questions = parsed.exam || parsed.questions || parsed;
        if (Array.isArray(questions)) {
          allQuestions = allQuestions.concat(questions);
        } else if (questions && typeof questions === 'object') {
          allQuestions.push(questions);
        }
      } catch (e) {
        console.warn(`[groqService] Batch ${i + 1} exam generation failed:`, e.message);
      }
    }

    // Deduplicate questions by question text
    const seen = new Set();
    const uniqueQuestions = allQuestions.filter(q => {
      if (!q || !q.question) return false;
      const cleanQ = q.question.trim().toLowerCase();
      if (seen.has(cleanQ)) return false;
      seen.add(cleanQ);
      return true;
    });

    // Normalize IDs
    const finalQuestions = uniqueQuestions.slice(0, numQuestions).map((q, idx) => ({
      ...q,
      id: idx + 1
    }));

    return { exam: finalQuestions };
  }

  /**
   * Grade and evaluate a student's handwritten answer.
   */
  async evaluateWrittenAnswer(notes, studentAnswerText) {
    const prompt = `You are a strict and helpful examiner. Analyze a student's handwritten answer (transcribed via OCR). Compare it strictly to the provided study notes.

STUDENT'S TRANSCRIPTION:
${studentAnswerText}

Please evaluate the answer out of 10 marks. Provide a JSON response only.

Format JSON only:
{
  "score": 8,
  "transcription": "Cleaned up version of what the student wrote based on the raw OCR text",
  "correctPoints": ["Point 1", "Point 2"],
  "mistakes": ["Mistake 1", "Missing point 2"],
  "feedback": "Overall feedback and how to improve."
}`;

    const response = await aiRouter.generate({
      taskType: AI_TASKS.ANSWER_EVALUATION,
      context: notes,
      prompt: prompt,
      temperature: 0.3,
      responseFormat: true
    });

    try {
      return JSON.parse(response.content);
    } catch (e) {
      console.warn('[groqService] Failed parsing written answer evaluation:', e);
      return {
        score: 0,
        transcription: studentAnswerText,
        correctPoints: [],
        mistakes: ['Failed to parse grading output'],
        feedback: 'Please try again.'
      };
    }
  }

  /**
   * Legacy interface mapping: Chat with notes
   */
  async chatWithNotes(notes, conversationHistory, question) {
    const messages = [
      ...conversationHistory,
      { role: 'user', content: question }
    ];

    const response = await aiRouter.generate({
      taskType: AI_TASKS.CHAT,
      context: notes,
      messages: messages,
      temperature: 0.7
    });

    return response.content;
  }

  /**
   * General-purpose chat logic.
   */
  async chat(messages, temperature = 0.7) {
    const response = await aiRouter.generate({
      taskType: AI_TASKS.CHAT,
      messages: messages,
      temperature: temperature
    });

    return response.content;
  }

  /**
   * Generate oral viva questions based on the notes.
   */
  async generateVivaQuestions(notes, numQuestions) {
    const prompt = `Act as an examiner conducting a viva/oral exam. Generate ${numQuestions} short, pointed viva questions based on the provided notes.

Format JSON only:
{
  "questions": [
    "Question 1?",
    "Question 2?"
  ]
}`;

    const response = await aiRouter.generate({
      taskType: AI_TASKS.VIVA,
      context: notes,
      prompt: prompt,
      temperature: 0.7,
      responseFormat: true
    });

    try {
      return JSON.parse(response.content);
    } catch (e) {
      console.warn('[groqService] Failed parsing viva questions:', e);
      return { questions: [] };
    }
  }

  /**
   * Evaluate oral viva answers.
   */
  async evaluateVivaAnswer(notes, question, answer) {
    const prompt = `Act as an examiner. Evaluate the student's spoken answer to the following viva question.

QUESTION:
${question}

STUDENT ANSWER:
${answer}

Evaluate the answer strictly but fairly based on the notes. Give a score out of 10 and short, spoken conversational feedback (e.g., "Good job, but you forgot to mention...").

Format JSON only:
{
  "score": 8,
  "feedback": "You correctly identified X, but remember that Y is also important.",
  "isCorrect": true
}`;

    const response = await aiRouter.generate({
      taskType: AI_TASKS.ANSWER_EVALUATION,
      context: notes,
      prompt: prompt,
      temperature: 0.4,
      responseFormat: true
    });

    try {
      return JSON.parse(response.content);
    } catch (e) {
      console.warn('[groqService] Failed parsing viva evaluation:', e);
      return { score: 0, feedback: 'Could not parse evaluation.', isCorrect: false };
    }
  }
}

module.exports = new GroqService();
