require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  groqApiKey: process.env.GROQ_API_KEY,
  groqApiUrl: process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1/chat/completions',
  groqModel: process.env.GROQ_MODEL || 'groq/compound',           // Groq's flagship model
  groqVisionModel: process.env.GROQ_VISION_MODEL || 'groq/compound', // compound supports vision too
  // LLM Configuration (OpenAI Compatible)
  llmApiKey: process.env.LLM_API_KEY,
  // User requested Qwen 30B 
  llmApiUrl: process.env.LLM_API_URL || 'https://router.huggingface.co/hf-inference/models/Qwen/Qwen2.5-Coder-32B-Instruct/v1/chat/completions',
  llmModel: process.env.LLM_MODEL || 'Qwen/Qwen3-Coder-30B-A3B-Instruct',
  
  // NVIDIA NIM Configuration
  nvidiaApiKey: process.env.NVIDIA_API_KEY,
  nvidiaApiUrl: process.env.NVIDIA_API_URL || 'https://integrate.api.nvidia.com/v1/chat/completions',
  nvidiaModel: process.env.NVIDIA_MODEL || 'nvidia/llama-3.1-nemotron-70b-instruct',

  // AI Router Configuration
  aiPrimaryProvider: process.env.AI_PRIMARY_PROVIDER || 'groq',
  aiFallbackEnabled: process.env.AI_FALLBACK_ENABLED !== 'false',
  aiMaxRetries: parseInt(process.env.AI_MAX_RETRIES || '2', 10),

  // RAG and Context budgets
  maxContextChunks: parseInt(process.env.MAX_CONTEXT_CHUNKS || '10', 10),
  maxContextChars: parseInt(process.env.MAX_CONTEXT_CHARS || '24000', 10),

  corsOrigin: process.env.CORS_ORIGIN || '*',
  uploadDir: 'uploads/',
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxNotesLength: 200000, // Characters to send to AI (approx 50k tokens)
};


