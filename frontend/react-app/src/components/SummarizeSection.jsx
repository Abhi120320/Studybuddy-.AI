import React, { useState } from 'react';
import { generateSummary } from '../utils/api';
import Loading from './Loading';

const SummarizeSection = () => {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState('');
  const [formError, setFormError] = useState('');

  const handleSummary = async () => {
    if (!topic) {
      setFormError('Enter a topic to summarize.');
      return;
    }
    setFormError('');
    setLoading(true);
    setOutput('');

    try {
      const data = await generateSummary(topic);

      if (data.success) {
        setOutput(`
          <div class="card">
            <h3 style="margin-bottom: 1rem;">📝 Summary: ${topic}</h3>
            <div style="line-height: 1.6; color: var(--color-text-dark);">
              ${data.summary.replace(/\n/g, '<br>')}
            </div>
          </div>
        `);
      } else {
        setOutput(`<div class="status-message status-error">❌ Error: ${data.error}</div>`);
      }
    } catch (error) {
      setOutput(`<div class="status-message status-error">❌ Error: ${error.message}</div>`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Summarize</h2>
        <p className="page-subtitle">Generate a clear, extremely concise summary focused on a specific topic from your notes.</p>
      </div>

      <div className="tools-grid" style={{ gridTemplateColumns: '1fr' }}>
        <div className="card" style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Topic summary</h3>
          <div className="form-group">
            <label htmlFor="topic">Topic name or keyword</label>
            <input
              type="text"
              id="topic"
              placeholder="e.g., Limits and derivatives"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>
          <button type="button" className="btn btn-secondary btn-block" onClick={handleSummary}>
            Generate Summary
          </button>
        </div>
      </div>
      
      {formError && <div className="status-message status-error" style={{ maxWidth: '600px', margin: '1rem auto' }}>{formError}</div>}

      {loading && <Loading message="Creating summary..." />}

      {output && (
        <div
          className="output-container"
          style={{ maxWidth: '600px', margin: '1.5rem auto' }}
          dangerouslySetInnerHTML={{ __html: output }}
        />
      )}
    </div>
  );
};

export default SummarizeSection;
