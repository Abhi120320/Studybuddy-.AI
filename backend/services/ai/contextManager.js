/**
 * services/ai/contextManager.js
 * Centralized RAG and document context bounding manager.
 */
'use strict';

const config = require('../../config/config');

/**
 * Bounds raw DB chunks or formatted text strings according to configured limits.
 * 
 * @param {Array|string} chunks - Array of chunk rows or raw string context
 * @param {Object} options - Override parameters (maxChunks, maxChars)
 * @returns {string} The bounded, formatted context string
 */
function buildBoundedContext(chunks, options = {}) {
  const maxChunks = options.maxChunks || config.maxContextChunks || 10;
  const maxChars = options.maxChars || config.maxContextChars || 24000;

  if (!chunks) return '';

  if (typeof chunks === 'string') {
    if (chunks.length > maxChars) {
      console.warn(`[ContextManager] Truncating context string from ${chunks.length} to ${maxChars} chars.`);
      return chunks.substring(0, maxChars);
    }
    return chunks;
  }

  if (Array.isArray(chunks)) {
    // Slice up to maximum configured chunk counts
    const sliced = chunks.slice(0, maxChunks);
    
    let contextStr = '';
    for (const chunk of sliced) {
      const docName = chunk.doc_name || 'Document';
      const subject = chunk.subject || 'General';
      const text = `--- From: ${docName} (${subject}) ---\n${chunk.content}\n\n`;
      
      // Stop adding chunks if we exceed character budget
      if ((contextStr + text).length > maxChars) {
        break;
      }
      contextStr += text;
    }
    return contextStr.trim();
  }

  return '';
}

/**
 * Simple estimate of tokens based on character length (approx 4 chars = 1 token).
 * @param {string} text 
 * @returns {number} Estimated token count
 */
function estimateTokenCount(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

module.exports = {
  buildBoundedContext,
  estimateTokenCount
};
