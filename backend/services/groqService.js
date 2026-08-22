const axios = require('axios');
const config = require('../config/config');

const FALLBACK_CHAINS = {
  'qwen/qwen3.6-27b':    ['qwen/qwen3.6-27b', 'groq/compound-mini', 'groq/compound'],
  'groq/compound-mini': ['groq/compound-mini', 'groq/compound', 'qwen/qwen3.6-27b'],
  'groq/compound':      ['groq/compound', 'groq/compound-mini', 'qwen/qwen3.6-27b']
};

class GroqService {
  constructor() {
    this.apiKey = config.groqApiKey;
    this.apiUrl = config.groqApiUrl;
    this.model = config.groqModel || 'groq/compound';

    if (!this.apiKey) {
      console.error('⚠️  GROQ_API_KEY is not set in environment variables');
    }
  }

  /**
   * Helper to make raw Chat Completion calls to Groq.
   * Leverages a fallback chain if the active model encounters a 429 (rate limit) or 404/400 (not supported).
   */
  async callApi(messages, temperature = 0.7, requireJson = false, modelOverride = null) {
    const baseModel = modelOverride || this.model;
    const chain = FALLBACK_CHAINS[baseModel] || [baseModel];
    
    let lastError = null;

    for (const activeModel of chain) {
      const maxRetries = 2;
      let attempt = 0;

      while (attempt <= maxRetries) {
        try {
          const payload = {
            model: activeModel,
            messages: messages,
            temperature: temperature,
            max_tokens: 4096,
            ...(requireJson && { response_format: { type: 'json_object' } })
          };

          const response = await axios.post(
            this.apiUrl,
            payload,
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
              },
              timeout: 60000 // 60 seconds
            }
          );

          console.log(`[GroqRouter] Successfully processed request using model: ${activeModel}`);
          return response.data.choices[0].message.content;
        } catch (error) {
          lastError = error;
          const status = error.response ? error.response.status : null;

          // If rate limited (429) or model not supported (404/400), try next fallback model immediately
          if (status === 429 || status === 404 || status === 400) {
            console.warn(`[GroqRouter] Model ${activeModel} returned status ${status}. Moving to fallback...`);
            break; 
          }

          // Retry on temporary server errors (503/502)
          const shouldRetry = status === 503 || status === 502;
          if (shouldRetry && attempt < maxRetries) {
            attempt++;
            const delay = Math.pow(2, attempt) * 1000;
            console.log(`[GroqRouter] Temporary error ${status}. Retrying in ${delay}ms on ${activeModel}...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }

          break; // move to next model in fallback chain
        }
      }
    }

    // Handle and propagate the final error if the whole chain fails
    console.error('[GroqRouter] All routed models failed.');
    if (lastError.response) {
      if (lastError.response.status === 401 || lastError.response.status === 403) {
        throw new Error('Invalid GROQ API key');
      } else if (lastError.response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
    }
    throw new Error('AI service error: ' + (lastError.response?.data?.error?.message || lastError.message));
  }

  /**
   * General generation helper.
   */
  async generateContent(prompt, temperature = 0.7, requireJson = false, modelOverride = null) {
    const messages = [
      {
        role: 'user',
        content: prompt
      }
    ];
    return await this.callApi(messages, temperature, requireJson, modelOverride);
  }

  async chat(messages, temperature = 0.7, modelOverride = 'groq/compound') {
    const formattedMessages = messages.map(m => ({
      role: m.role === 'system' ? 'system' : (m.role === 'assistant' ? 'assistant' : 'user'),
      content: m.content
    }));
    return await this.callApi(formattedMessages, temperature, false, modelOverride);
  }

  async generateQuestions(notes, difficulty, count) {
    const prompt = `Based on these study notes, generate ${count} practice questions at ${difficulty} level. 
    
Keep all explanations extremely brief (1 short sentence maximum) to ensure fast generation.

NOTES:
${notes} 

Format your response as JSON array like this:
[
  {
    "question": "question text",
    "options": ["A) option1", "B) option2", "C) option3", "D) option4"],
    "correctAnswer": "A",
    "explanation": "explanation why A is correct"
  }
]

Generate ONLY the JSON, no other text.`;

    const response = await this.generateContent(prompt, 0.5, true, 'qwen/qwen3.6-27b');
    try {
      return JSON.parse(response);
    } catch (e) {
      console.warn('Failed strict JSON parse, falling back to regex:', e);
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : '[]');
    }
  }

  async generateSummary(notes, topic) {
    const prompt = `From these study notes, create a clear, extremely concise summary focused on: "${topic}"
Keep all bullet points short (under 10 words each) for maximum speed.
    
NOTES:
${notes}

Format as:
**Key Concepts:**
- concept 1
- concept 2

**Important Formulas/Definitions:**
- formula 1
- formula 2

**Real-world Examples:**
- example 1`;

    return await this.generateContent(prompt, 0.7, false, 'groq/compound-mini');
  }

  async generateSchedule(notes, daysUntilExam) {
    const prompt = `Based on these study notes, create an optimal ${daysUntilExam}-day study schedule.
    
Keep all descriptions very brief (maximum 3-4 words per activity, and only 1 tip) to ensure fast generation.

NOTES:
${notes}

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

    const response = await this.generateContent(prompt, 0.5, true, 'groq/compound-mini');
    try {
      return JSON.parse(response);
    } catch (e) {
      console.warn('Failed strict JSON parse, falling back to regex:', e);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : '{}');
    }
  }

  async generateExam(notes, numQuestions) {
    const prompt = `Generate a ${numQuestions}-question mock exam based on these notes.

Keep all explanations extremely brief (1 short sentence maximum) to ensure fast generation.

NOTES:
${notes}

Format JSON only:
{
  "exam": [
    {
      "id": 1,
      "question": "question text",
      "options": ["A) opt1", "B) opt2", "C) opt3", "D) opt4"],
      "correctAnswer": "A",
      "explanation": "why this is correct"
    }
  ]
}`;

    const response = await this.generateContent(prompt, 0.5, true, 'qwen/qwen3.6-27b');
    try {
      return JSON.parse(response);
    } catch (e) {
      console.warn('Failed strict JSON parse, falling back to regex:', e);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : '{}');
    }
  }

  async evaluateWrittenAnswer(notes, studentAnswerText) {
    const prompt = `You are a strict and helpful examiner. Analyze a student's handwritten answer (transcribed via OCR). Compare it strictly to the provided study notes.
    
STUDY NOTES:
${notes}

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

    const response = await this.generateContent(prompt, 0.3, true, 'groq/compound');
    try {
      return JSON.parse(response);
    } catch (e) {
      console.warn('Failed strict JSON parse, falling back to regex:', e);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : '{}');
    }
  }

  async chatWithNotes(notes, conversationHistory, question) {
    const messages = [
      {
        role: 'system',
        content: `You are a helpful study assistant. Answer questions based on these notes:

STUDY NOTES:
${notes}`
      },
      ...conversationHistory,
      { role: 'user', content: question }
    ];

    return await this.chat(messages, 0.7, 'groq/compound');
  }

  async generateVivaQuestions(notes, numQuestions) {
    const prompt = `Act as an examiner conducting a viva/oral exam. Generate ${numQuestions} short, pointed viva questions based on the provided notes.
    
NOTES:
${notes}

Format JSON only:
{
  "questions": [
    "Question 1?",
    "Question 2?"
  ]
}`;

    const response = await this.generateContent(prompt, 0.7, true, 'groq/compound-mini');
    try {
      return JSON.parse(response);
    } catch (e) {
      console.warn('Failed strict JSON parse, falling back to regex:', e);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : '{"questions": []}');
    }
  }

  async evaluateVivaAnswer(notes, question, answer) {
    const prompt = `Act as an examiner. Evaluate the student's spoken answer to the following viva question.
    
NOTES:
${notes}

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

    const response = await this.generateContent(prompt, 0.4, true, 'groq/compound');
    try {
      return JSON.parse(response);
    } catch (e) {
      console.warn('Failed strict JSON parse, falling back to regex:', e);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : '{"score": 0, "feedback": "Could not parse evaluation.", "isCorrect": false}');
    }
  }
}

module.exports = new GroqService();
