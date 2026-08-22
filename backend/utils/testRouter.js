/**
 * utils/testRouter.js
 * Verification and test runner for AI Model Router.
 */
'use strict';

require('dotenv').config({ path: __dirname + '/../.env' });
const aiRouter = require('../services/ai/aiRouter');
const { AI_TASKS } = require('../services/ai/aiTypes');
const config = require('../config/config');

async function runTests() {
  console.log('🤖 Starting AI Model Router Verification Tests...\n');
  console.log('--- Configuration Loaded ---');
  console.log('Groq API Key status:', config.groqApiKey ? 'PRESENT' : 'MISSING');
  console.log('NVIDIA API Key status:', config.nvidiaApiKey ? 'PRESENT' : 'MISSING');
  console.log('Primary Provider:', config.aiPrimaryProvider);
  console.log('Fallback Enabled:', config.aiFallbackEnabled);
  console.log('Max Retries:', config.aiMaxRetries);
  console.log('Max Context Chunks:', config.maxContextChunks);
  console.log('Max Context Chars:', config.maxContextChars);
  console.log('----------------------------\n');

  // Test 1: Chat routing (Should target Groq as primary)
  try {
    console.log('[Test 1] Dispatching CHAT task (Target: Groq)...');
    const result = await aiRouter.generate({
      taskType: AI_TASKS.CHAT,
      prompt: 'State the first law of thermodynamics in 5 words.'
    });
    console.log('✅ Test 1 Success!');
    console.log('Provider used:', result.provider);
    console.log('Model used:', result.model);
    console.log('Response content:', result.content.trim());
    console.log('Latency:', result.latencyMs, 'ms');
  } catch (err) {
    console.error('❌ Test 1 Failed:', err);
  }

  console.log('\n----------------------------\n');

  // Test 2: Study Plan routing (Should target NVIDIA as primary)
  try {
    console.log('[Test 2] Dispatching STUDY_PLAN task (Target: NVIDIA)...');
    const result = await aiRouter.generate({
      taskType: AI_TASKS.STUDY_PLAN,
      prompt: 'Create a 1-day revision plan for chemistry.'
    });
    console.log('✅ Test 2 Success!');
    console.log('Provider used:', result.provider);
    console.log('Model used:', result.model);
    console.log('Response content:', result.content.trim().slice(0, 150) + '...');
    console.log('Latency:', result.latencyMs, 'ms');
  } catch (err) {
    console.error('❌ Test 2 Failed (Note: Expected to fallback to Groq if NVIDIA API Key is missing):', err.message || err);
  }

  console.log('\n----------------------------\n');

  // Test 3: Large Context Routing (Should dynamically override Groq to NVIDIA)
  try {
    console.log('[Test 3] Dispatching CHAT task with large context (Target: NVIDIA/Fallback)...');
    const largeContext = 'A '.repeat(25000); // 25,000 characters > 24,000 budget
    const result = await aiRouter.generate({
      taskType: AI_TASKS.CHAT,
      context: largeContext,
      prompt: 'Summarize the context'
    });
    console.log('✅ Test 3 Success!');
    console.log('Provider used:', result.provider);
    console.log('Model used:', result.model);
    console.log('Latency:', result.latencyMs, 'ms');
  } catch (err) {
    console.error('❌ Test 3 Failed:', err.message || err);
  }

  console.log('\n----------------------------\n');

  // Test 4: JSON Validation & Repair
  try {
    console.log('[Test 4] Verifying JSON extraction/repair...');
    const conversationalJson = 'Here is the response: {"exam": [{"question": "test?"}]} Hope you like it!';
    const repaired = aiRouter._repairJson(conversationalJson);
    console.log('✅ Test 4 Success!');
    console.log('Input:', conversationalJson);
    console.log('Repaired JSON:', repaired);
  } catch (err) {
    console.error('❌ Test 4 Failed:', err);
  }

  console.log('\n🏁 Verification tests completed.');
}

runTests().catch(console.error);
