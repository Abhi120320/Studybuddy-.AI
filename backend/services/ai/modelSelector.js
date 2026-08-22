/**
 * services/ai/modelSelector.js
 * Routing matrix and context-aware provider selector.
 */
'use strict';

const { AI_TASKS } = require('./aiTypes');
const { estimateTokenCount } = require('./contextManager');
const config = require('../../config/config');

// Routing Matrix configuration
const PRIMARY_ROUTING_MATRIX = {
  [AI_TASKS.CHAT]:                 'groq',
  [AI_TASKS.SIMPLE_QA]:            'groq',
  [AI_TASKS.MCQ_GENERATION]:       'groq',
  [AI_TASKS.QUIZ_GENERATION]:      'groq',
  [AI_TASKS.FLASHCARD_GENERATION]: 'groq',
  [AI_TASKS.VIVA]:                 'groq',
  [AI_TASKS.SUMMARY]:              'groq',
  
  [AI_TASKS.STUDY_PLAN]:           'nvidia',
  [AI_TASKS.MOCK_EXAM]:            'nvidia',
  [AI_TASKS.COMPLEX_QA]:           'nvidia',
  [AI_TASKS.DOCUMENT_ANALYSIS]:    'nvidia',
  [AI_TASKS.RAG_SYNTHESIS]:        'nvidia',
  [AI_TASKS.ANSWER_EVALUATION]:    'nvidia'
};

const GROQ_MAX_TOKENS = 6000; // Safe threshold for Groq free TPM (8000)

/**
 * Returns the preferred provider and model for a given task and context.
 * 
 * @param {string} taskType - The enum task type
 * @param {string} promptText - The combined prompt + context text to estimate size
 * @returns {Object} { provider, model }
 */
function selectProviderAndModel(taskType, promptText = '') {
  // Determine primary provider from fallback matrix first, then config, then default
  const baseProvider = PRIMARY_ROUTING_MATRIX[taskType] || config.aiPrimaryProvider || 'groq';
  
  // Context-aware override: check if prompt is extremely large
  const estimatedTokens = estimateTokenCount(promptText);
  
  let provider = baseProvider;
  
  // Override: If Groq request would exceed its safety TPM budget, route to NVIDIA instead
  if (provider === 'groq' && estimatedTokens > GROQ_MAX_TOKENS) {
    if (config.nvidiaApiKey) {
      console.log(`[ModelSelector] Context size (${estimatedTokens} tokens) exceeds Groq safe limit (${GROQ_MAX_TOKENS}). Routing to NVIDIA.`);
      provider = 'nvidia';
    } else {
      console.warn(`[ModelSelector] Large context (${estimatedTokens} tokens) detected for Groq request, but no NVIDIA_API_KEY is configured. Falling back to Groq.`);
    }
  }

  const model = provider === 'groq' 
    ? (config.groqModel || 'groq/compound')
    : (config.nvidiaModel || 'nvidia/llama-3.1-nemotron-70b-instruct');

  return {
    provider,
    model
  };
}

module.exports = {
  selectProviderAndModel,
  PRIMARY_ROUTING_MATRIX
};
