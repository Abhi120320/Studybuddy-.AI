/**
 * services/ai/aiRouter.js
 * Centralized AI Model Router with dynamic selection, exponential retries, and fallbacks.
 */
'use strict';

const config = require('../../config/config');
const { selectProviderAndModel } = require('./modelSelector');
const { buildBoundedContext, estimateTokenCount } = require('./contextManager');
const groqProvider = require('./providers/groqProvider');
const nvidiaProvider = require('./providers/nvidiaProvider');
const { AIError, AIRateLimitError, AIProviderError } = require('./aiErrors');

// Mapping of provider string to actual adapter client
const PROVIDERS = {
  groq: groqProvider,
  nvidia: nvidiaProvider
};

class AIRouter {
  constructor() {
    this.fallbackEnabled = config.aiFallbackEnabled !== false;
    this.maxRetries = config.aiMaxRetries || 2;
  }

  /**
   * Main entry point for generating content.
   * 
   * @param {Object} params
   * @param {string} params.taskType - Enum task type from AI_TASKS
   * @param {Array|string} params.context - DB raw chunk rows or study notes string
   * @param {Array} params.messages - History of message objects (optional)
   * @param {string} params.prompt - Single prompt string if messages is not passed
   * @param {number} params.temperature - Creative temperature (0.0 to 1.0)
   * @param {boolean} params.responseFormat - Set to 'json' or true to enforce JSON
   * @returns {Object} Normalized response output
   */
  async generate({
    taskType,
    context = null,
    messages = null,
    prompt = '',
    temperature = 0.7,
    responseFormat = false
  }) {
    // 1. Build bounded context using contextManager
    const boundedContext = buildBoundedContext(context);
    
    // 2. Build final prompt payload
    let finalMessages = [];
    if (messages && messages.length > 0) {
      // Inject context into the system message or first user message
      const systemMessage = messages.find(m => m.role === 'system');
      if (systemMessage) {
        systemMessage.content = `${systemMessage.content}\n\nSTUDY CONTEXT:\n${boundedContext}`;
      } else {
        finalMessages.push({
          role: 'system',
          content: `You are a helpful study assistant. Focus your answers on the provided study context.\n\nSTUDY CONTEXT:\n${boundedContext}`
        });
      }
      finalMessages = finalMessages.concat(messages);
    } else {
      const combinedPrompt = boundedContext 
        ? `STUDY CONTEXT:\n${boundedContext}\n\nUSER PROMPT:\n${prompt}`
        : prompt;
      finalMessages.push({
        role: 'user',
        content: combinedPrompt
      });
    }

    const combinedText = finalMessages.map(m => m.content).join('\n');

    // 3. Determine the primary provider and model
    const selection = selectProviderAndModel(taskType, combinedText);
    let providerName = selection.provider;
    let modelName = selection.model;

    console.log(`[AI Router] Task: ${taskType} | Primary Provider: ${providerName} | Model: ${modelName}`);

    // Try executing through selected provider
    try {
      return await this._executeWithRetryAndFallback(
        providerName,
        modelName,
        finalMessages,
        temperature,
        responseFormat,
        taskType
      );
    } catch (err) {
      console.error(`[AI Router] Primary execution failed completely:`, err.message);
      
      // Enforce error structure format
      throw {
        success: false,
        error: {
          code: err.code || 'AI_PROVIDER_UNAVAILABLE',
          message: 'AI service is temporarily unavailable. Please try again.'
        }
      };
    }
  }

  /**
   * Orchestrates the call, handles retries, and triggers fallback if primary fails.
   */
  async _executeWithRetryAndFallback(providerName, model, messages, temp, jsonReq, taskType) {
    let currentProvider = providerName;
    let currentModel = model;
    let fallbackUsed = false;
    let lastError = null;

    // Loop at most twice: once for primary, once for fallback
    const targetProviders = [currentProvider];
    if (this.fallbackEnabled) {
      const alternate = currentProvider === 'groq' ? 'nvidia' : 'groq';
      // Only include fallback if credentials are set
      if (alternate === 'groq' && config.groqApiKey) targetProviders.push('groq');
      if (alternate === 'nvidia' && config.nvidiaApiKey) targetProviders.push('nvidia');
    }

    for (let pIdx = 0; pIdx < targetProviders.length; pIdx++) {
      currentProvider = targetProviders[pIdx];
      if (pIdx > 0) {
        fallbackUsed = true;
        currentModel = currentProvider === 'groq' 
          ? (config.groqModel || 'groq/compound')
          : (config.nvidiaModel || 'nvidia/llama-3.1-nemotron-70b-instruct');

        // Reverse fallback constraint: If falling back to Groq, truncate large context to fit budget
        if (currentProvider === 'groq') {
          messages = this._truncateMessagesForGroq(messages);
        }
        
        console.warn(`[AI Router] Falling back to alternate provider: ${currentProvider} | Model: ${currentModel}`);
      }

      const client = PROVIDERS[currentProvider];
      let attempt = 0;

      while (attempt <= this.maxRetries) {
        try {
          const result = await client.execute(currentModel, messages, temp, jsonReq, taskType);
          result.fallbackUsed = fallbackUsed;
          
          // Perform basic JSON recovery if client requested structured JSON
          if (jsonReq) {
            result.content = this._repairJson(result.content);
          }

          console.log(`[AI Router] Latency: ${result.latencyMs}ms | Provider: ${result.provider} | Model: ${result.model}`);
          return result;
        } catch (error) {
          lastError = error;
          attempt++;
          
          const isRateLimit = error instanceof AIRateLimitError || error.status === 429;
          const isServerErr = error.status >= 500;

          // Non-retryable error (invalid keys, malformed parameters, etc.)
          if (!isRateLimit && !isServerErr) {
            console.error(`[AI Router] Non-retryable error on ${currentProvider}: ${error.message}`);
            break;
          }

          if (attempt <= this.maxRetries) {
            const delay = Math.pow(2, attempt) * 1000;
            console.warn(`[AI Router] Provider ${currentProvider} failed (Attempt ${attempt}/${this.maxRetries}). Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
    }

    // If we exit loop without success, throw the final error
    throw lastError || new AIError('All providers in fallback chain failed.');
  }

  /**
   * Helper to truncate context payload to fit under Groq safe budget on fallback.
   */
  _truncateMessagesForGroq(messages) {
    const budgetChars = config.maxContextChars || 24000;
    return messages.map(m => {
      if (m.content.length > budgetChars) {
        console.log(`[AI Router] Truncating message size from ${m.content.length} to ${budgetChars} characters on Groq fallback.`);
        return { ...m, content: m.content.substring(0, budgetChars) };
      }
      return m;
    });
  }

  /**
   * Extract JSON structure using regex from model responses with conversational text.
   */
  _repairJson(content) {
    const trimmed = content.trim();
    
    // Check if it starts/ends clean
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      return trimmed;
    }

    // Try extracting array first
    const arrayMatch = trimmed.match(/\[[\s\S]*\]/);
    if (arrayMatch) return arrayMatch[0];

    // Try extracting object
    const objectMatch = trimmed.match(/\{[\s\S]*\}/);
    if (objectMatch) return objectMatch[0];

    return trimmed;
  }
}

module.exports = new AIRouter();
