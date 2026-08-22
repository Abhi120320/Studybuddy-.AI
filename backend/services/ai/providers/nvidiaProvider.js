/**
 * services/ai/providers/nvidiaProvider.js
 * NVIDIA NIM Adapter for AI Model Router.
 */
'use strict';

const axios = require('axios');
const config = require('../../../config/config');
const { AIProviderError, AIRateLimitError } = require('../aiErrors');

class NvidiaProvider {
  constructor() {
    this.apiKey = config.nvidiaApiKey;
    this.apiUrl = config.nvidiaApiUrl || 'https://integrate.api.nvidia.com/v1/chat/completions';
  }

  async execute(model, messages, temperature = 0.7, requireJson = false, taskType = 'GENERIC') {
    if (!this.apiKey) {
      throw new AIProviderError('NVIDIA_API_KEY is missing from environment variables.', 'nvidia', 401);
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
          timeout: 90000 // 90 seconds (reasoning models may take longer)
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
        provider: 'nvidia',
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
        throw new AIRateLimitError(`NVIDIA Rate limit hit: ${message}`, 'nvidia');
      }

      throw new AIProviderError(`NVIDIA API Error: ${message}`, 'nvidia', status);
    }
  }
}

module.exports = new NvidiaProvider();
