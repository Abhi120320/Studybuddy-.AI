import React, { useState, useRef } from 'react';
import { evaluateWrittenAnswer } from '../utils/api';
import Loading from './Loading';

const WrittenEvaluationTab = () => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!selectedFile.type.startsWith('image/')) {
        setError('Please select an image file (JPEG, PNG, etc).');
        return;
      }
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setError(null);
      setResult(null);
    }
  };

  const handleEvaluate = async () => {
    if (!file) {
      setError('Please upload an image first.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await evaluateWrittenAnswer(file);
      if (data.success) {
        setResult(data.evaluation);
      } else {
        setError(data.error || 'Failed to evaluate answer');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during evaluation');
    } finally {
      setLoading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  return (
    <div>
      <h3 style={{ marginBottom: '0.5rem' }}>Handwritten evaluation</h3>
      <p className="page-subtitle" style={{ marginBottom: '1.25rem' }}>
        Photograph an answer. It is compared to your active notes and graded out of 10.
      </p>

      {!preview ? (
        <div className="upload-area" onClick={triggerFileInput} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && triggerFileInput()}>
          <h3>Click to upload an image</h3>
          <p>JPG, PNG, or WebP</p>
        </div>
      ) : (
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <img 
            src={preview} 
            alt="Uploaded answer" 
            style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', marginBottom: '1rem' }} 
          />
          <div>
            <button className="btn btn-secondary" onClick={triggerFileInput} style={{ marginRight: '1rem' }}>
              Change Image
            </button>
            <button className="btn btn-primary" onClick={handleEvaluate} disabled={loading}>
              {loading ? 'Evaluating...' : 'Evaluate Answer'}
            </button>
          </div>
        </div>
      )}

      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        style={{ display: 'none' }} 
      />

      {error && (
        <div className="status-message status-error" style={{ marginTop: '1rem' }}>
          {error}
        </div>
      )}

      {loading && <Loading />}

      {result && (
        <div className="card" style={{ marginTop: '2rem', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.5rem', margin: 0 }}>Evaluation Score</h3>
            <div style={{ 
              background: 'var(--color-primary)', 
              color: 'white', 
              padding: '0.5rem 1rem', 
              borderRadius: 'var(--radius-full)',
              fontWeight: 'bold',
              fontSize: '1.25rem'
            }}>
              {result.score} / 10
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ color: 'var(--color-success)', marginBottom: '0.5rem' }}>✓ What you got right</h4>
            <ul style={{ marginLeft: '1.5rem' }}>
              {result.correctPoints && result.correctPoints.map((point, idx) => (
                <li key={idx} style={{ marginBottom: '0.25rem' }}>{point}</li>
              ))}
            </ul>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ color: 'var(--color-error)', marginBottom: '0.5rem' }}>⚠️ Mistakes & Missed Points</h4>
            <ul style={{ marginLeft: '1.5rem' }}>
              {result.mistakes && result.mistakes.map((mistake, idx) => (
                <li key={idx} style={{ marginBottom: '0.25rem' }}>{mistake}</li>
              ))}
            </ul>
          </div>

          <div style={{ background: 'var(--color-bg)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
            <h4 style={{ color: 'var(--color-primary)', marginBottom: '0.5rem' }}>💡 Overall Feedback</h4>
            <p style={{ lineHeight: '1.6' }}>{result.feedback}</p>
          </div>

          {result.transcription && (
            <div style={{ marginTop: '1.5rem', opacity: 0.7, fontSize: '0.875rem' }}>
              <strong>AI Transcription (Best Effort):</strong>
              <p style={{ fontStyle: 'italic', marginTop: '0.25rem' }}>"{result.transcription}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WrittenEvaluationTab;
