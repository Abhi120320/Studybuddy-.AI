import React, { useState, useEffect, useRef } from 'react';
import { generateVivaQuestions, evaluateVivaAnswer } from '../utils/api';
import Loading from './Loading';

const VivaTab = () => {
  const [numQuestions, setNumQuestions] = useState('');
  const [sessionState, setSessionState] = useState('setup'); // setup, active, results
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  
  const [results, setResults] = useState([]);
  const [setupError, setSetupError] = useState('');
  const recognitionRef = useRef(null);

  // Setup speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        // We accumulate the final transcript manually in state to handle continuous listening better
        setTranscript((prev) => {
          // If we have final transcript, append it to the non-interim part.
          // For simplicity in React without complex ref tracking, we just use the raw latest result
          // A more robust approach might be needed, but this works for simple answers.
          return event.results[event.results.length - 1][0].transcript;
        });

        // Better approach for continuous:
        let fullTranscript = '';
        for (let i = 0; i < event.results.length; ++i) {
           fullTranscript += event.results[i][0].transcript;
        }
        setTranscript(fullTranscript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }

    return () => {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      if (recognitionRef.current) recognitionRef.current.abort();
    };
  }, []);

  const speak = (text, callback) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Stop anything currently playing
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.onend = () => {
        if (callback) callback();
      };
      window.speechSynthesis.speak(utterance);
    } else {
      if (callback) callback();
    }
  };

  const handleStart = async () => {
    if (!numQuestions || numQuestions < 1) {
      setSetupError('Enter how many viva questions you want.');
      return;
    }
    
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      setSetupError('Speech recognition needs Chrome or Edge.');
      return;
    }

    setSetupError('');

    setLoading(true);
    try {
      const data = await generateVivaQuestions(parseInt(numQuestions, 10));
      if (data.success && data.questions.length > 0) {
        setQuestions(data.questions);
        setSessionState('active');
        setCurrentIndex(0);
        setResults([]);
        setFeedback(null);
        setTranscript('');
        
        // Speak first question
        setTimeout(() => speak(data.questions[0]), 500);
      } else {
        setSetupError('Failed to generate questions. ' + (data.error || ''));
      }
    } catch (err) {
      setSetupError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      window.speechSynthesis.cancel(); // Stop AI speaking if user interrupts
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const handleTranscriptChange = (e) => {
    setTranscript(e.target.value);
  };

  const handleSubmitAnswer = async () => {
    if (!transcript.trim()) return alert('Please provide an answer first!');
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
    
    setLoading(true);
    try {
      const currentQ = questions[currentIndex];
      const data = await evaluateVivaAnswer(currentQ, transcript);
      
      if (data.success) {
        setFeedback(data.evaluation);
        setResults([...results, { question: currentQ, answer: transcript, evaluation: data.evaluation }]);
        speak(data.evaluation.feedback);
      } else {
        alert(data.error || 'Failed to evaluate answer');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNextQuestion = () => {
    window.speechSynthesis.cancel();
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(currentIndex + 1);
      setFeedback(null);
      setTranscript('');
      speak(questions[currentIndex + 1]);
    } else {
      setSessionState('results');
    }
  };

  const averageScore = results.length > 0 
    ? (results.reduce((acc, curr) => acc + (curr.evaluation.score || 0), 0) / results.length).toFixed(1)
    : 0;

  if (sessionState === 'setup') {
    return (
      <div>
        <h3 style={{ marginBottom: '0.5rem' }}>Voice viva</h3>
        <p className="page-subtitle" style={{ marginBottom: '1.25rem' }}>
          Questions are spoken aloud from your notes. Answer with the microphone or type, then get a score.
        </p>

        <div className="form-group" style={{ maxWidth: '280px' }}>
          <label htmlFor="numQuestions">Number of questions</label>
          <input
            type="number"
            id="numQuestions"
            value={numQuestions}
            placeholder="e.g., 5"
            min="1"
            max="15"
            onChange={(e) => setNumQuestions(e.target.value)}
          />
        </div>

        {setupError && <div className="status-message status-error">{setupError}</div>}

        <button type="button" className="btn btn-primary" onClick={handleStart} disabled={loading}>
          {loading ? 'Preparing…' : 'Start viva'}
        </button>
      </div>
    );
  }

  if (sessionState === 'results') {
    return (
      <div className="card">
        <h2 style={{ color: 'var(--color-primary)', textAlign: 'center', marginBottom: '0.5rem' }}>Viva Completed! 🎉</h2>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '4rem', fontWeight: 'bold', color: 'var(--color-text-dark)' }}>
            {averageScore} <span style={{ fontSize: '2rem', color: 'var(--color-text-muted)' }}>/ 10</span>
          </div>
          <p style={{ color: 'var(--color-text-muted)' }}>Average Score</p>
        </div>

        <h3 style={{ marginBottom: '1.5rem' }}>Detailed Feedback</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {results.map((r, i) => (
            <div key={i} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <h4 style={{ color: 'var(--color-primary)', margin: 0, flex: 1, paddingRight: '1rem' }}>Q{i + 1}: {r.question}</h4>
                <div style={{ background: 'var(--color-surface-hover)', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontWeight: 'bold' }}>
                  {r.evaluation.score}/10
                </div>
              </div>
              <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem', fontStyle: 'italic' }}>
                <strong>You said:</strong> "{r.answer}"
              </p>
              <div style={{ background: r.evaluation.isCorrect ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <strong style={{ color: r.evaluation.isCorrect ? 'var(--color-success)' : 'var(--color-error)' }}>Feedback:</strong> {r.evaluation.feedback}
              </div>
            </div>
          ))}
        </div>

        <button className="btn btn-primary" style={{ marginTop: '2rem', width: '100%' }} onClick={() => setSessionState('setup')}>
          Start New Viva
        </button>
      </div>
    );
  }

  // Active State
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h3 style={{ margin: 0, color: 'var(--color-primary)' }}>Question {currentIndex + 1} of {questions.length}</h3>
        <div style={{ background: 'var(--color-surface-hover)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)' }}>
          {isRecording ? <span style={{ color: 'var(--color-error)', fontWeight: 'bold' }}>🔴 Recording...</span> : 'Waiting'}
        </div>
      </div>

      <div style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '2rem', lineHeight: '1.4' }}>
        "{questions[currentIndex]}"
      </div>

      {!feedback ? (
        <>
          <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
            <button 
              onClick={toggleRecording}
              style={{
                background: isRecording ? 'var(--color-error)' : 'var(--color-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '80px',
                height: '80px',
                fontSize: '2rem',
                cursor: 'pointer',
                boxShadow: isRecording ? '0 0 15px rgba(239, 68, 68, 0.5)' : '0 4px 6px rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
            >
              {isRecording ? '⏹️' : '🎙️'}
            </button>
          </div>
          
          <div className="form-group">
            <label>Your Answer (Editable)</label>
            <textarea 
              rows="4" 
              value={transcript}
              onChange={handleTranscriptChange}
              placeholder="Speak to transcribe, or type your answer here..."
              style={{ fontSize: '1.1rem' }}
            />
          </div>

          <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleSubmitAnswer} disabled={loading || (!transcript.trim() && !isRecording)}>
            {loading ? 'Evaluating...' : 'Submit Answer'}
          </button>
        </>
      ) : (
        <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h4 style={{ margin: 0, fontSize: '1.2rem', color: feedback.isCorrect ? 'var(--color-success)' : 'var(--color-error)' }}>
              {feedback.isCorrect ? '✅ Good Answer' : '⚠️ Needs Improvement'}
            </h4>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Score: {feedback.score}/10</div>
          </div>
          
          <div style={{ background: 'var(--color-bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius-md)', marginBottom: '2rem', fontSize: '1.1rem', lineHeight: '1.6' }}>
            {feedback.feedback}
          </div>

          <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleNextQuestion}>
            {currentIndex + 1 < questions.length ? 'Next Question ➡️' : 'Finish Viva 🏁'}
          </button>
        </div>
      )}
    </div>
  );
};

export default VivaTab;
