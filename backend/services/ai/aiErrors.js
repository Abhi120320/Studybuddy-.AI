/**
 * services/ai/aiErrors.js
 * Standardized error classes for the AI Model Router.
 */
'use strict';

class AIError extends Error {
  constructor(message, code = 'AI_ERROR', status = 500) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.status = status;
    Error.captureStackTrace(this, this.constructor);
  }
}

class AIProviderError extends AIError {
  constructor(message, provider, status = 500) {
    super(message, 'AI_PROVIDER_ERROR', status);
    this.provider = provider;
  }
}

class AIRateLimitError extends AIError {
  constructor(message, provider) {
    super(message, 'AI_RATE_LIMIT_EXCEEDED', 429);
    this.provider = provider;
  }
}

class AIContextExceededError extends AIError {
  constructor(message, provider) {
    super(message, 'AI_CONTEXT_LIMIT_EXCEEDED', 400);
    this.provider = provider;
  }
}

module.exports = {
  AIError,
  AIProviderError,
  AIRateLimitError,
  AIContextExceededError
};
