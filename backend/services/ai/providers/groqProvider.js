/**
 * services/ai/providers/groqProvider.js
 * Groq Adapter for AI Model Router.
 */
'use strict';

const axios = require('axios');
const config = require('../../../config/config');
const { AIProviderError, AIRateLimitError } = require('../aiErrors');

class GroqProvider {
  constructor() {
    this.apiKey = config.groqApiKey;
    this.apiUrl = config.groqApiUrl;
  }

  async execute(model, messages, temperature = 0.7, requireJson = false, taskType = 'GENERIC') {
    if (!this.apiKey) {
      throw new AIProviderError('GROQ_API_KEY is missing from environment variables.', 'groq', 401);
    }

    const startTime = Date.now();
    try {
      const payload = {
        model: model,
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

      const latencyMs = Date.now() - startTime;
      const responseData = response.data;
      const content = responseData.choices[0].message.content;
      
      const usage = responseData.usage ? {
        inputTokens:  responseData.usage.prompt_tokens || 0,
        outputTokens: responseData.usage.completion_tokens || 0,
        totalTokens:  responseData.usage.total_tokens || 0
      } : { inputTokens: 0, outputTokens: 0, totalTokens: 0 };

      return {
        content: content,
        provider: 'groq',
        model: model,
        taskType: taskType,
        usage: usage,
        latencyMs: latencyMs,
        fallbackUsed: false
      };
    } catch (error) {
      const status = error.response ? error.response.status : 500;
      const message = error.response?.data?.error?.message || error.message;

      if (status === 429) {
        throw new AIRateLimitError(`Groq Rate limit hit: ${message}`, 'groq');
      }

      throw new AIProviderError(`Groq API Error: ${message}`, 'groq', status);
    }
  }
}

module.exports = new GroqProvider();
