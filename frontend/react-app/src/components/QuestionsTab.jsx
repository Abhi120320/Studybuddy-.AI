import React, { useState } from 'react';
import { generateQuestions } from '../utils/api';
import Loading from './Loading';

/* ── Styled segmented control for difficulty ── */
const DIFFICULTY_OPTIONS = [
  { value: 'easy',   label: 'Easy',   color: '#34d399', shadow: '#065f46', text: '#fff' },
  { value: 'medium', label: 'Medium', color: '#fbbf24', shadow: '#b45309', text: '#1e293b' },
  { value: 'hard',   label: 'Hard',   color: '#f87171', shadow: '#991b1b', text: '#fff' },
];

function DifficultyPicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
      {DIFFICULTY_OPTIONS.map(opt => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              padding: '0.55rem 1.4rem',
              border: `2px solid ${active ? '#1e293b' : '#cbd5e1'}`,
              borderRadius: '9999px',
              background: active ? opt.color : 'white',
              color: active ? opt.text : 'var(--muted-foreground)',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: active ? `3px 3px 0 ${opt.shadow}` : 'none',
              transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
              transform: active ? 'translate(-1px,-1px)' : '',
            }}
            onMouseEnter={e => {
              if (!active) {
                e.currentTarget.style.borderColor = '#1e293b';
                e.currentTarget.style.background = '#f8fafc';
              }
            }}
            onMouseLeave={e => {
              if (!active) {
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.background = 'white';
              }
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

const QuestionsTab = () => {
  const [difficulty,     setDifficulty]     = useState('medium');
  const [questionCount,  setQuestionCount]  = useState('');
  const [loading,        setLoading]        = useState(false);
  const [questions,      setQuestions]      = useState([]);
  const [userAnswers,    setUserAnswers]    = useState({});
  const [submitted,      setSubmitted]      = useState(false);
  const [error,          setError]          = useState(null);
  const [warnUnanswered, setWarnUnanswered] = useState(false);

  const handleGenerate = async () => {
    if (!questionCount) {
      setError('Enter how many questions you want (1–20).');
      return;
    }
    setLoading(true);
    setError(null);
    setQuestions([]);
    setUserAnswers({});
    setSubmitted(false);
    setWarnUnanswered(false);

    try {
      const data = await generateQuestions(difficulty, questionCount);
      if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions);
      } else {
        setError('Failed to generate questions. Make sure you have active notes uploaded.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = (qIndex, option) => {
    if (submitted) return;
    setWarnUnanswered(false);
    setUserAnswers(prev => ({ ...prev, [qIndex]: option }));
  };

  const handleSubmit = () => {
    const answered = Object.keys(userAnswers).length;
    if (answered < questions.length) {
      setWarnUnanswered(true);
      return;
    }
    setSubmitted(true);
    setWarnUnanswered(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleForceSubmit = () => {
    setSubmitted(true);
    setWarnUnanswered(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const checkIsCorrect = (q, userAns) => {
    if (!userAns) return false;
    const correctPrefix = q.correctAnswer.split(')')[0].trim().toUpperCase();
    const userPrefix    = userAns.split(')')[0].trim().toUpperCase();
    return correctPrefix === userPrefix;
  };

  const score = questions.reduce((acc, q, idx) => {
    return checkIsCorrect(q, userAnswers[idx]) ? acc + 1 : acc;
  }, 0);

  const percentage = questions.length > 0
    ? Math.round((score / questions.length) * 100)
    : 0;

  return (
    <div>
      {/* ── Setup form ── */}
      <div className="form-row">
        <div className="form-group">
          <label>Difficulty</label>
          <DifficultyPicker value={difficulty} onChange={setDifficulty} />
        </div>
        <div className="form-group">
          <label htmlFor="questionCount">Number of questions</label>
          <input
            type="number"
            id="questionCount"
            value={questionCount}
            placeholder="e.g., 5"
            min="1"
            max="20"
            onChange={e => setQuestionCount(e.target.value)}
          />
        </div>
      </div>

      <button
        type="button"
        className="btn btn-primary btn-block"
        onClick={handleGenerate}
        disabled={loading}
      >
        {loading ? 'Generating…' : 'Generate Quiz'}
      </button>

      {loading && <Loading message="Generating questions…" />}

      {error && (
        <div className="status-message status-error" style={{ marginTop: '1rem' }}>
          {error}
        </div>
      )}

      {/* ── Score card (after submit) ── */}
      {submitted && (
        <div className="results-container">
          <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Practice Results</h2>
          <div className="chart-wrapper">
            <div
              className="circular-chart"
              style={{ background: `conic-gradient(var(--color-primary) ${percentage}%, #e2e8f0 0)` }}
            >
              <div className="circular-chart-inner">
                <span className="score-text">{percentage}%</span>
              </div>
            </div>
            <div className="score-details">
              <p>Correct: <strong>{score}</strong></p>
              <p>Incorrect: <strong>{questions.length - score}</strong></p>
            </div>
          </div>
        </div>
      )}

      {/* ── Questions list ── */}
      {questions.length > 0 && (
        <div className="exam-questions" style={{ marginTop: '2rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Practice Questions</h3>

          {questions.map((q, idx) => {
            const userAns  = userAnswers[idx];
            const isCorrect = checkIsCorrect(q, userAns);
            const showMistake = submitted && !isCorrect;

            return (
              <div
                key={idx}
                className={`question-card ${submitted ? (isCorrect ? 'is-correct' : 'is-wrong') : ''}`}
              >
                <h4>Q{idx + 1}: {q.question}</h4>
                <div className="options-list">
                  {q.options.map((opt, i) => {
                    let optionClass = 'option-label';
                    if (submitted) {
                      if (checkIsCorrect(q, opt))  optionClass += ' is-right';
                      else if (userAns === opt)     optionClass += ' is-wrong';
                    } else if (userAns === opt) {
                      optionClass += ' is-selected';
                    }

                    return (
                      <label
                        key={i}
                        className={optionClass}
                        style={{ cursor: submitted ? 'default' : 'pointer' }}
                      >
                        <input
                          type="radio"
                          name={`practice${idx}`}
                          value={opt}
                          checked={userAns === opt}
                          onChange={() => handleOptionSelect(idx, opt)}
                          disabled={submitted}
                          style={{ display: submitted ? 'none' : 'inline-block' }}
                        />
                        <span>{opt}</span>
                        {submitted && checkIsCorrect(q, opt) && (
                          <span style={{ marginLeft: 'auto' }}>✅</span>
                        )}
                        {submitted && userAns === opt && !checkIsCorrect(q, opt) && (
                          <span style={{ marginLeft: 'auto' }}>❌</span>
                        )}
                      </label>
                    );
                  })}
                </div>

                {showMistake && (
                  <div className="mistake-analysis" style={{
                    marginTop: '1.5rem', padding: '1rem',
                    backgroundColor: '#fff1f2', borderRadius: 'var(--radius-md)',
                    borderLeft: '4px solid #ef4444',
                  }}>
                    <h5 style={{ color: '#be123c', marginBottom: '0.5rem' }}>Mistake Analysis</h5>
                    <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                      <strong>Your Answer:</strong> {userAns || 'Skipped'}<br />
                      <strong>Correct Answer:</strong> {q.correctAnswer}
                    </p>
                    <p style={{ fontSize: '0.9rem', color: '#881337' }}>
                      <strong>Why:</strong> {q.explanation}
                    </p>
                  </div>
                )}

                {submitted && isCorrect && (
                  <div style={{ marginTop: '1rem', color: '#15803d', fontSize: '0.9rem' }}>
                    <strong>Explanation:</strong> {q.explanation}
                  </div>
                )}
              </div>
            );
          })}

          {/* ── Unanswered warning banner ── */}
          {warnUnanswered && !submitted && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '1rem',
              background: '#fffbeb', border: '2px solid #f59e0b',
              borderRadius: '12px', padding: '1rem 1.25rem',
              marginTop: '1rem',
            }}>
              <span style={{ fontSize: '1.4rem' }}>⚠️</span>
              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: '0.95rem' }}>
                  You have {questions.length - Object.keys(userAnswers).length} unanswered question(s).
                </strong>
                <p style={{ fontSize: '0.85rem', color: '#92400e', margin: '0.2rem 0 0' }}>
                  Unanswered questions will be marked incorrect.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={handleForceSubmit}
                  style={{
                    background: '#f59e0b', color: '#1e293b',
                    border: '2px solid #1e293b', borderRadius: '9999px',
                    padding: '0.4rem 1rem', fontWeight: 800, fontSize: '0.82rem',
                    cursor: 'pointer', boxShadow: '2px 2px 0 #92400e',
                  }}
                >
                  Submit anyway
                </button>
                <button
                  type="button"
                  onClick={() => setWarnUnanswered(false)}
                  style={{
                    background: 'white', color: '#1e293b',
                    border: '2px solid #1e293b', borderRadius: '9999px',
                    padding: '0.4rem 1rem', fontWeight: 700, fontSize: '0.82rem',
                    cursor: 'pointer',
                  }}
                >
                  Go back
                </button>
              </div>
            </div>
          )}

          {!submitted && !warnUnanswered && (
            <button
              type="button"
              className="btn btn-secondary btn-block"
              onClick={handleSubmit}
              style={{ marginTop: '1.25rem' }}
            >
              Submit and See Results
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default QuestionsTab;
