import React, { useState, useRef, useEffect } from 'react';
import { sendChatMessage } from '../utils/api';
import Loading from './Loading';

const ChatTab = () => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    const userMessage = message.trim();
    if (!userMessage) return;

    // Add user message to display
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: userMessage },
    ]);

    setMessage('');
    setLoading(true);

    // Add to conversation history
    const newHistory = [...conversationHistory, { role: 'user', content: userMessage }];
    setConversationHistory(newHistory);

    try {
      const data = await sendChatMessage(userMessage, newHistory);

      if (data.success) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.answer },
        ]);
        setConversationHistory([
          ...newHistory,
          { role: 'assistant', content: data.answer },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'error', content: `Error: ${data.error}` },
        ]);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: 'error', content: `Error: ${error.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="chat-container">
        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="empty-state" style={{ margin: 'auto' }}>
              Ask anything about your active notes. Answers stay grounded in what you uploaded.
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`message ${
                  msg.role === 'user' ? 'message-user' : msg.role === 'error' ? 'message-error' : 'message-ai'
                }`}
              >
                {msg.content}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="chat-input-area">
          <input
            type="text"
            placeholder="Ask a question..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            disabled={loading}
          />
          <button 
            className="btn btn-primary" 
            onClick={handleSend}
            disabled={loading || !message.trim()}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatTab;
