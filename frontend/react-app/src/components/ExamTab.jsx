import React, { useState } from 'react';
import { generateMockExam } from '../utils/api';
import Loading from './Loading';

const ExamTab = () => {
  const [examQuestions,  setExamQuestions]  = useState('');
  const [loading,        setLoading]        = useState(false);
  const [questions,      setQuestions]      = useState([]);
  const [userAnswers,    setUserAnswers]    = useState({});
  const [submitted,      setSubmitted]      = useState(false);
  const [error,          setError]          = useState(null);
  const [warnUnanswered, setWarnUnanswered] = useState(false);

  const handleGenerate = async () => {
    if (!examQuestions) {
      setError('Enter how many exam questions you want.');
      return;
    }
    setLoading(true);
    setError(null);
    setQuestions([]);
    setUserAnswers({});
    setSubmitted(false);

    try {
      const data = await generateMockExam(examQuestions);
      if (data.exam && data.exam.length > 0) {
        setQuestions(data.exam);
      } else {
        setError('Failed to generate exam');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = (qIndex, option) => {
    if (submitted) return;
    setUserAnswers({
      ...userAnswers,
      [qIndex]: option
    });
  };

  const handleSubmit = () => {
    if (Object.keys(userAnswers).length < questions.length) {
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
    // Normalize to handle cases where correctAnswer is "A" or "A) Option text"
    const correctPrefix = q.correctAnswer.split(')')[0].trim().toUpperCase();
    const userPrefix = userAns.split(')')[0].trim().toUpperCase();
    return correctPrefix === userPrefix;
  };

  const score = questions.reduce((acc, q, idx) => {
    if (checkIsCorrect(q, userAnswers[idx])) return acc + 1;
    return acc;
  }, 0);

  const percentage = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

  return (
    <div>
      <div className="form-group">
        <label htmlFor="examQuestions">Number of questions</label>
        <input
          type="number"
          id="examQuestions"
          value={examQuestions}
          placeholder="e.g., 10"
          min="5"
          max="20"
          onChange={(e) => setExamQuestions(e.target.value)}
        />
      </div>
      <button type="button" className="btn btn-primary btn-block" onClick={handleGenerate}>
        Start exam
      </button>
      
      {loading && <Loading message="Preparing exam…" />}
      
      {error && (
        <div className="status-message status-error" style={{ marginTop: '1rem' }}>
          {error}
        </div>
      )}

      {submitted && (
        <div className="results-container">
          <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Exam results</h2>
          <div className="chart-wrapper">
            <div className="circular-chart" style={{ background: `conic-gradient(var(--color-primary) ${percentage}%, #e2e8f0 0)` }}>
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

      {questions.length > 0 && (
        <div className="exam-questions" style={{ marginTop: '2rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Mock exam ({questions.length} questions)</h3>
          
          {questions.map((q, idx) => {
            const userAns = userAnswers[idx];
            const isCorrect = checkIsCorrect(q, userAns);
            const showMistake = submitted && !isCorrect;

            return (
              <div key={idx} className={`question-card ${submitted ? (isCorrect ? 'is-correct' : 'is-wrong') : ''}`}>
                <h4>Q{idx + 1}: {q.question}</h4>
                <div className="options-list">
                  {q.options.map((opt, i) => {
                    let optionClass = 'option-label';
                    if (submitted) {
                      const isThisOptionCorrect = checkIsCorrect(q, opt);
                      const isThisOptionSelected = userAns === opt;
                      if (isThisOptionCorrect) optionClass += ' is-right';
                      else if (isThisOptionSelected) optionClass += ' is-wrong';
                    } else if (userAns === opt) {
                      optionClass += ' is-selected';
                    }

                    return (
                      <label key={i} className={optionClass} style={{ cursor: submitted ? 'default' : 'pointer' }}>
                        <input 
                          type="radio" 
                          name={`exam${idx}`} 
                          value={opt} 
                          checked={userAns === opt}
                          onChange={() => handleOptionSelect(idx, opt)}
                          disabled={submitted}
                          style={{ display: submitted ? 'none' : 'inline-block' }}
                        />
                        <span>{opt}</span>
                      </label>
                    );
                  })}
                </div>
                
                {showMistake && (
                  <div className="mistake-analysis">
                    <h5 style={{ color: '#be123c', marginBottom: '0.5rem' }}>Why this was marked wrong</h5>
                    <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                      <strong>Your answer:</strong> {userAns || 'Skipped'}<br/>
                      <strong>Correct answer:</strong> {q.correctAnswer}
                    </p>
                    <p style={{ fontSize: '0.9rem', color: '#881337' }}>
                      <strong>Explanation:</strong> {q.explanation}
                    </p>
                  </div>
                )}
                
                {submitted && isCorrect && (
                  <div className="explanation">
                    <strong>Explanation:</strong> {q.explanation}
                  </div>
                )}
              </div>
            );
          })}

          {/* Unanswered warning banner */}
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
            <button type="button" className="btn btn-secondary btn-block" onClick={handleSubmit} style={{ marginTop: '1.25rem' }}>
              Submit and See Results
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ExamTab;
