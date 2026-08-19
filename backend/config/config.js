require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  groqApiKey: process.env.GROQ_API_KEY,
  groqApiUrl: process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1/chat/completions',
  groqModel: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  groqVisionModel: process.env.GROQ_VISION_MODEL || 'llama-3.2-11b-vision-preview',
  // LLM Configuration (OpenAI Compatible)
  llmApiKey: process.env.LLM_API_KEY,
  // User requested Qwen 30B 
  llmApiUrl: process.env.LLM_API_URL || 'https://router.huggingface.co/hf-inference/models/Qwen/Qwen2.5-Coder-32B-Instruct/v1/chat/completions',
  llmModel: process.env.LLM_MODEL || 'Qwen/Qwen3-Coder-30B-A3B-Instruct',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  uploadDir: 'uploads/',
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxNotesLength: 200000, // Characters to send to AI (approx 50k tokens)
};

