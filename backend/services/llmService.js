const axios = require('axios');
const config = require('../config/config');

class LLMService {
    constructor() {
        this.apiKey = config.llmApiKey;
        this.apiUrl = config.llmApiUrl;
        this.model = config.llmModel;

        if (!this.apiKey) {
            console.warn('⚠️  LLM_API_KEY is not set in environment variables');
        }
    }

    async chat(messages, temperature = 0.7) {
        const maxRetries = 3;
        let attempt = 0;

        while (attempt <= maxRetries) {
            try {
                const response = await axios.post(
                    this.apiUrl,
                    {
                        model: this.model,
                        messages: messages,
                        temperature: temperature,
                        max_tokens: 2048,
                        stream: false
                    },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${this.apiKey}`
                        },
                        timeout: 60000, // 60 second timeout for larger models
                    }
                );

                return response.data.choices[0].message.content;
            } catch (error) {
                const shouldRetry = error.response && (error.response.status === 503 || error.response.status === 429 || error.response.status === 502);

                if (shouldRetry && attempt < maxRetries) {
                    attempt++;
                    const delay = Math.pow(2, attempt) * 1000;
                    console.log(`LLM API overloaded/error (Status ${error.response.status}). Retrying in ${delay}ms (Attempt ${attempt}/${maxRetries})...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }

                console.error('LLM API Error Details:');
                console.error('Message:', error.message);
                if (error.response) {
                    console.error('Status:', error.response.status);
                    console.error('Data:', JSON.stringify(error.response.data, null, 2));
                }

                throw new Error('AI service error: ' + (error.response?.data?.error?.message || error.message));
            }
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

        return await this.chat(messages, 0.7);
    }
}

module.exports = new LLMService();
