import React from 'react';
import {
  IconNotes, IconTarget, IconChat, IconMic, IconCalendar, IconSpark, IconArrow, IconBubble,
} from './Icons';

const MARQUEE = ['Quizzes', 'Mock exams', 'Chat with notes', 'Voice viva', 'Handwriting', 'Study plans', 'Pomodoro'];

const Squiggle = () => (
  <svg className="squiggle" viewBox="0 0 120 16" fill="none" aria-hidden="true">
    <path d="M2 10c8-10 16 10 24 0s16 10 24 0 16 10 24 0 16 10 24 0 16 10 22 0" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const LandingPage = () => {
  return (
    <div className="landing-page">
      <span className="confetti confetti-circle" style={{ background: '#FBBF24', top: 96, left: 32 }} />
      <span className="confetti confetti-sq" style={{ top: 180, right: 48 }} />
      <span className="confetti confetti-tri" style={{ top: 420, left: '12%' }} />

      <nav className="landing-nav">
        <div className="brand-lockup">
          <span className="logo-mark">S</span>
          StudyBuddy<span>.ai</span>
        </div>
        <a href="#auth" className="btn btn-ghost">Sign in</a>
      </nav>

      <section className="landing-hero">
        <div className="hero-copy">
          <div className="hero-blob" aria-hidden="true" />
          <div className="eyebrow">
            <IconBubble size={22} className="violet"><IconSpark size={12} /></IconBubble>
            AI study companion
          </div>
          <h1>
            Study from your notes,<br />
            <em>not generic quizzes.</em>
          </h1>
          <Squiggle />
          <p className="lede">
            Upload PDFs, then practice with questions, mock exams, chat, handwritten grading,
            and a voice viva — all grounded in your material.
          </p>
          <div className="hero-actions">
            <a href="#auth" className="btn btn-primary btn-large">
              Get started
              <span className="btn-arrow"><IconArrow /></span>
            </a>
            <a href="#features" className="btn btn-ghost btn-large">See how it works</a>
          </div>
        </div>

        <div className="hero-stage">
          <div className="hero-panel" aria-hidden="true">
            <div className="hero-panel-row">
              <IconBubble size={38}><IconNotes size={18} /></IconBubble>
              <div>
                <strong>Notes stay the source of truth</strong>
                <span>Upload once, practice everywhere</span>
              </div>
            </div>
            <div className="hero-panel-row">
              <IconBubble size={38}><IconTarget size={18} /></IconBubble>
              <div>
                <strong>Quiz, exam, then review</strong>
                <span>Instant feedback on every miss</span>
              </div>
            </div>
            <div className="hero-panel-row">
              <IconBubble size={38}><IconMic size={18} /></IconBubble>
              <div>
                <strong>Speak your answers</strong>
                <span>Viva mode for oral exams</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="marquee" aria-hidden="true">
        <div className="marquee-track">
          {[...MARQUEE, ...MARQUEE].map((word, i) => (
            <span key={`${word}-${i}`}>★ {word}</span>
          ))}
        </div>
      </div>

      <section id="features" className="landing-section">
        <h2 className="section-title">Everything you need before the exam</h2>
        <p className="section-sub">One workspace instead of a pile of tabs and flashcard apps.</p>
        <div className="feature-grid">
          <article className="feature-card">
            <IconBubble size={40}><IconNotes size={18} /></IconBubble>
            <h3>Notes library</h3>
            <p>Upload PDFs and toggle which documents the AI should use.</p>
          </article>
          <article className="feature-card">
            <IconBubble size={40}><IconTarget size={18} /></IconBubble>
            <h3>Practice arena</h3>
            <p>Generate quizzes and mock exams at easy, medium, or hard difficulty.</p>
          </article>
          <article className="feature-card">
            <IconBubble size={40}><IconChat size={18} /></IconBubble>
            <h3>Chat with notes</h3>
            <p>Ask follow-up questions and get answers from your uploaded material.</p>
          </article>
          <article className="feature-card">
            <IconBubble size={40}><IconMic size={18} /></IconBubble>
            <h3>Voice viva</h3>
            <p>Hear questions out loud, answer with your mic, and get spoken feedback.</p>
          </article>
          <article className="feature-card">
            <IconBubble size={40}><IconSpark size={18} /></IconBubble>
            <h3>Handwritten grading</h3>
            <p>Photograph an answer and receive a score with comments.</p>
          </article>
          <article className="feature-card">
            <IconBubble size={40}><IconCalendar size={18} /></IconBubble>
            <h3>Study plan</h3>
            <p>Build a day-by-day schedule and topic summaries when time is short.</p>
          </article>
        </div>
      </section>

      <section className="landing-section">
        <h2 className="section-title">Three steps</h2>
        <p className="section-sub">No setup beyond your notes and an account.</p>
        <div className="steps-grid">
          <article className="step-card">
            <span className="step-num">1</span>
            <h3>Sign in</h3>
            <p>Create a session so your study tools stay in one place.</p>
          </article>
          <article className="step-card">
            <span className="step-num">2</span>
            <h3>Upload notes</h3>
            <p>Drop in a PDF. Mark it active so quizzes and chat can use it.</p>
          </article>
          <article className="step-card">
            <span className="step-num">3</span>
            <h3>Practice</h3>
            <p>Quiz, exam, chat, write, or speak — then review what you missed.</p>
          </article>
        </div>
      </section>

      <section className="landing-cta">
        <h2 className="section-title">Ready to study smarter?</h2>
        <p className="section-sub">Start with a free session. Upload a chapter and generate your first quiz.</p>
        <a href="#auth" className="btn btn-primary btn-large">
          Create your workspace
          <span className="btn-arrow"><IconArrow /></span>
        </a>
      </section>

      <footer className="landing-footer">StudyBuddy.ai — study from your own notes.</footer>
    </div>
  );
};

export default LandingPage;
