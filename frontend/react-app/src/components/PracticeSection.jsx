import React, { useState } from 'react';
import QuestionsTab from './QuestionsTab';
import ExamTab from './ExamTab';
import ChatTab from './ChatTab';
import WrittenEvaluationTab from './WrittenEvaluationTab';
import VivaTab from './VivaTab';

const tabs = [
  {
    id: 'questions',
    label: 'Quiz',
    emoji: '🧠',
    desc: 'Auto-generate questions from your notes and test yourself instantly.',
    color: '#8b5cf6',
    shadow: '#5b21b6',
  },
  {
    id: 'exam',
    label: 'Mock Exam',
    emoji: '📝',
    desc: 'Simulate a full timed exam experience with AI-graded answers.',
    color: '#f472b6',
    shadow: '#be185d',
  },
  {
    id: 'chat',
    label: 'Chat',
    emoji: '💬',
    desc: 'Ask anything about your study material — get instant AI answers.',
    color: '#fbbf24',
    shadow: '#b45309',
  },
  {
    id: 'written',
    label: 'Handwriting',
    emoji: '✍️',
    desc: 'Write answers by hand and get them evaluated by AI.',
    color: '#34d399',
    shadow: '#065f46',
  },
  {
    id: 'viva',
    label: 'Voice Viva',
    emoji: '🎙️',
    desc: 'Practice oral exams with your voice and get spoken feedback.',
    color: '#60a5fa',
    shadow: '#1d4ed8',
  },
];

function textColor(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? '#1e293b' : '#ffffff';
}

const PracticeSection = () => {
  const [activeTab, setActiveTab] = useState(null); // null = grid view

  const activeConfig = tabs.find(t => t.id === activeTab);

  /* ═══════════════════════════════
     GRID VIEW — show mode cards
  ════════════════════════════════ */
  if (!activeTab) {
    return (
      <div>
        <div className="page-header">
          <h2 className="page-title">Practice Arena</h2>
          <p className="page-subtitle">Choose a mode to start practising — all tools use your active notes.</p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
            gap: '1.25rem',
          }}
          role="tablist"
          aria-label="Practice modes"
        >
          {tabs.map(tab => {
            const tc = textColor(tab.color);
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={false}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  background: tab.color,
                  border: '2px solid #1e293b',
                  borderRadius: '18px',
                  padding: '1.6rem 1.25rem 1.35rem',
                  boxShadow: `5px 5px 0 ${tab.shadow}`,
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem',
                  transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translate(-3px,-3px) rotate(-1.5deg)';
                  e.currentTarget.style.boxShadow = `8px 8px 0 ${tab.shadow}`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = '';
                  e.currentTarget.style.boxShadow = `5px 5px 0 ${tab.shadow}`;
                }}
              >
                <span style={{ fontSize: '2.4rem', lineHeight: 1 }}>{tab.emoji}</span>
                <strong style={{
                  fontSize: '1.05rem',
                  fontFamily: 'var(--font-display)',
                  color: tc,
                  marginTop: '0.3rem',
                }}>
                  {tab.label}
                </strong>
                <span style={{
                  fontSize: '0.8rem',
                  color: tc,
                  opacity: 0.85,
                  lineHeight: 1.45,
                  fontWeight: 500,
                }}>
                  {tab.desc}
                </span>

                {/* Arrow hint */}
                <span style={{
                  marginTop: '0.5rem',
                  fontSize: '1rem',
                  color: tc,
                  opacity: 0.6,
                  alignSelf: 'flex-end',
                }}>→</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════
     INSIDE VIEW — feature content
  ════════════════════════════════ */
  const tc = textColor(activeConfig.color);

  return (
    <div>
      {/* Header with back button */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
        <button
          type="button"
          onClick={() => setActiveTab(null)}
          style={{
            background: 'white',
            border: '2px solid #1e293b',
            borderRadius: '9999px',
            padding: '0.45rem 1rem',
            cursor: 'pointer',
            fontWeight: 800,
            fontSize: '0.9rem',
            boxShadow: '3px 3px 0 #1e293b',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            marginTop: '0.35rem',
            flexShrink: 0,
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#fef3c7'}
          onMouseLeave={e => e.currentTarget.style.background = 'white'}
        >
          ← All Modes
        </button>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <span style={{
              background: activeConfig.color,
              border: '2px solid #1e293b',
              borderRadius: '9999px',
              padding: '0.25rem 0.85rem',
              fontSize: '0.72rem',
              fontWeight: 800,
              color: tc,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}>
              {activeConfig.emoji} Practice
            </span>
            <h2 className="page-title" style={{ margin: 0 }}>{activeConfig.label}</h2>
          </div>
          <p className="page-subtitle" style={{ marginTop: '0.25rem' }}>
            {activeConfig.desc}
          </p>
        </div>
      </div>

      {/* Feature content card */}
      <div className="card" style={{ borderTop: `4px solid ${activeConfig.color}` }}>
        {activeTab === 'questions' && <QuestionsTab />}
        {activeTab === 'exam'      && <ExamTab />}
        {activeTab === 'chat'      && <ChatTab />}
        {activeTab === 'written'   && <WrittenEvaluationTab />}
        {activeTab === 'viva'      && <VivaTab />}
      </div>
    </div>
  );
};

export default PracticeSection;
