import React, { useState } from 'react';
import { generateSchedule } from '../utils/api';
import Loading from './Loading';

const ToolsSection = () => {
  const [daysUntilExam, setDaysUntilExam] = useState('');
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState('');
  const [formError, setFormError] = useState('');

  const handleSchedule = async () => {
    if (!daysUntilExam) {
      setFormError('Enter how many days you have until the exam.');
      return;
    }
    setFormError('');
    setLoading(true);
    setOutput('');

    try {
      const data = await generateSchedule(daysUntilExam);

      if (data.schedule) {
        let html = `<div class="card"><h3 style="margin-bottom: 1.5rem;">📅 ${daysUntilExam}-Day Study Schedule</h3>`;
        data.schedule.forEach((day) => {
          html += `
            <div class="question-card">
              <h4 style="color: var(--color-primary);">Day ${day.day}: ${day.topic}</h4>
              <p style="color: var(--color-text-muted); margin-bottom: 1rem;">Duration: ${day.duration}</p>
              <strong>Activities:</strong>
              <ul style="margin-top: 0.5rem; margin-left: 1.5rem; color: var(--color-text-dark);">
                ${day.activities.map((a) => `<li style="margin-bottom: 0.25rem;">${a}</li>`).join('')}
              </ul>
            </div>
          `;
        });
        if (data.tips) {
          html += `<h3 style="margin: 2rem 0 1rem 0;">💡 Tips</h3>`;
          data.tips.forEach((tip) => {
            html += `<div class="status-message status-success" style="margin-bottom: 0.5rem;">✓ ${tip}</div>`;
          });
        }
        html += `</div>`;
        setOutput(html);
      } else {
        setOutput(`<div class="status-message status-error">❌ Failed to generate schedule</div>`);
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
        <h2 className="page-title">Study plan</h2>
        <p className="page-subtitle">Create a structured day-by-day countdown study schedule based on your active notes.</p>
      </div>

      <div className="tools-grid" style={{ gridTemplateColumns: '1fr' }}>
        <div className="card" style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Exam countdown</h3>
          <div className="form-group">
            <label htmlFor="daysUntilExam">Days until exam</label>
            <input
              type="number"
              id="daysUntilExam"
              value={daysUntilExam}
              placeholder="e.g., 7"
              min="1"
              max="30"
              onChange={(e) => setDaysUntilExam(e.target.value)}
            />
          </div>
          <button type="button" className="btn btn-primary btn-block" onClick={handleSchedule}>
            Create Study Plan
          </button>
        </div>
      </div>
      
      {formError && <div className="status-message status-error" style={{ maxWidth: '600px', margin: '1rem auto' }}>{formError}</div>}

      {loading && <Loading message="Creating your study countdown plan..." />}

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

export default ToolsSection;
