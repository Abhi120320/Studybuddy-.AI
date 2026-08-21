import React, { useState, useEffect } from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import UploadSection from './components/UploadSection';
import PracticeSection from './components/PracticeSection';
import ToolsSection from './components/ToolsSection';
import SummarizeSection from './components/SummarizeSection';
import AuthPage from './components/AuthPage';
import PomodoroClock from './components/PomodoroClock';
import { IconMenu, IconClock } from './components/Icons';

const PAGE_META = {
  dashboard: { title: 'Home', subtitle: 'Pick up where you left off' },
  notes: { title: 'Notes', subtitle: 'Your study library' },
  practice: { title: 'Practice', subtitle: 'Quizzes, exams, chat, and viva' },
  summarize: { title: 'Summarize', subtitle: 'Key topic summaries' },
  studyplan: { title: 'Study plan', subtitle: 'Create an exam study schedule' },
};

function App() {
  const [currentPage, setCurrentPage] = useState('landing');
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [pomodoroOpen, setPomodoroOpen] = useState(false);
  const [user, setUser] = useState({ name: 'Student', initial: 'S', plan: 'Free' });

  /** Re-read user info from sessionStorage whenever navigation happens */
  function refreshUser() {
    const storedName  = sessionStorage.getItem('userName')  || '';
    const storedEmail = sessionStorage.getItem('userEmail') || '';
    const displayName = storedName || (storedEmail ? storedEmail.split('@')[0] : 'Student');
    setUser({
      name   : displayName,
      initial: displayName.charAt(0).toUpperCase(),
      plan   : 'Free',
    });
  }

  useEffect(() => {
    const handleHashChange = () => {
      const hash  = window.location.hash.replace('#', '') || 'landing';
      const token = sessionStorage.getItem('studybuddy_token');

      // If no token, restrict access to auth / landing pages only
      if (!token && hash !== 'landing' && hash !== 'auth') {
        window.location.hash = 'auth';
        return;
      }

      refreshUser();          // ← pick up name/email stored after OTP verify
      setCurrentPage(hash);
      setSidebarOpen(false);
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);


  if (currentPage === 'landing') {
    return <LandingPage />;
  }

  if (currentPage === 'auth') {
    return <AuthPage />;
  }

  const meta = PAGE_META[currentPage] || PAGE_META.dashboard;

  return (
    <div className="app-container">
      {sidebarOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        user={user}
        currentPage={currentPage}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="app-main">
        <header className="topbar">
          <button
            type="button"
            className="icon-btn topbar-menu"
            aria-label="Open navigation"
            onClick={() => setSidebarOpen(true)}
          >
            <IconMenu />
          </button>
          <div className="topbar-copy">
            <h1>{meta.title}</h1>
            <p>{meta.subtitle}</p>
          </div>
          <button
            type="button"
            className={`icon-btn pomodoro-toggle ${pomodoroOpen ? 'active' : ''}`}
            aria-expanded={pomodoroOpen}
            aria-label="Toggle focus timer"
            onClick={() => setPomodoroOpen((open) => !open)}
          >
            <IconClock />
            <span>Focus</span>
          </button>
        </header>

        {pomodoroOpen && <PomodoroClock onClose={() => setPomodoroOpen(false)} />}

        <main className="main-content">
          {currentPage === 'dashboard' && <Dashboard user={user} />}
          {currentPage === 'notes' && <UploadSection />}
          {currentPage === 'practice' && <PracticeSection />}
          {currentPage === 'summarize' && <SummarizeSection />}
          {currentPage === 'studyplan' && <ToolsSection />}
        </main>
      </div>
    </div>
  );
}

export default App;
