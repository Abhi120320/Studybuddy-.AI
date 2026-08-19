import React, { useState, useEffect } from 'react';
import { fetchSubjects } from '../utils/api';
import { IconNotes, IconBubble } from './Icons';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
};

const getLast7Days = () => {
  const days = [];
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
    days.push({
      dateStr,
      label: daysOfWeek[d.getDay()],
      dayNum: d.getDate(),
      isToday: i === 0
    });
  }
  return days;
};

const Dashboard = ({ user }) => {
  const [stats, setStats] = useState({ notesLoaded: false, status: 'checking...' });
  const [subjects, setSubjects] = useState([]);
  const [streakInfo, setStreakInfo] = useState({ currentStreak: 0, history: [] });
  const [studyHistory, setStudyHistory] = useState({});

  // 1. Fetch health stats and database subjects
  useEffect(() => {
    const fetchData = async () => {
      try {
        const healthRes = await fetch(`${API_URL}/health`);
        const healthData = await healthRes.json();
        setStats(healthData);
      } catch {
        setStats({ notesLoaded: false, status: 'offline' });
      }

      try {
        const subData = await fetchSubjects();
        if (subData.success) {
          setSubjects(subData.subjects || []);
        }
      } catch (err) {
        console.error('Failed to load dashboard subjects:', err);
      }
    };
    fetchData();
  }, []);

  // 2. Manage Study Streak & Pomodoro time tracking
  const loadStreakAndStats = () => {
    try {
      const todayStr = getTodayStr();
      
      // Load study history
      const storedTime = localStorage.getItem('studybuddy_studytime');
      const timeData = storedTime ? JSON.parse(storedTime) : {};
      setStudyHistory(timeData);

      // Load and update streak
      const storedStreak = localStorage.getItem('studybuddy_streak');
      let streak = { currentStreak: 0, lastActiveDate: '', history: [] };
      
      if (storedStreak) {
        try {
          const parsed = JSON.parse(storedStreak);
          if (parsed && typeof parsed === 'object' && 'currentStreak' in parsed) {
            streak = parsed;
          } else if (typeof parsed === 'number' || !isNaN(parsed)) {
            streak.currentStreak = Number(parsed);
          }
        } catch {
          if (!isNaN(storedStreak)) {
            streak.currentStreak = Number(storedStreak);
          }
        }
      }

      // If user has studied today or yesterday (at least 30 minutes = 1800 seconds), check/update streak
      const hasStudiedToday = (timeData[todayStr] || 0) >= 1800;
      
      if (streak.lastActiveDate) {
        const lastDate = new Date(streak.lastActiveDate);
        const todayDate = new Date(todayStr);
        const diffTime = Math.abs(todayDate - lastDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (hasStudiedToday && streak.lastActiveDate !== todayStr) {
          if (diffDays === 1) {
            streak.currentStreak += 1;
          } else if (diffDays > 1) {
            streak.currentStreak = 1;
          }
          streak.lastActiveDate = todayStr;
          if (!Array.isArray(streak.history)) streak.history = [];
          if (!streak.history.includes(todayStr)) {
            streak.history.push(todayStr);
          }
          localStorage.setItem('studybuddy_streak', JSON.stringify(streak));
        } else if (!hasStudiedToday && diffDays > 1) {
          // Streak broken (more than 1 day missed since last activity)
          streak.currentStreak = 0;
          localStorage.setItem('studybuddy_streak', JSON.stringify(streak));
        }
      } else if (hasStudiedToday) {
        // First streak day
        streak.currentStreak = 1;
        streak.lastActiveDate = todayStr;
        streak.history = [todayStr];
        localStorage.setItem('studybuddy_streak', JSON.stringify(streak));
      }

      setStreakInfo(streak);
    } catch (e) {
      console.error('Error loading streak:', e);
    }
  };

  useEffect(() => {
    loadStreakAndStats();

    // Listen to Pomodoro Clock real-time updates
    window.addEventListener('studybuddy_timer_tick', loadStreakAndStats);
    return () => {
      window.removeEventListener('studybuddy_timer_tick', loadStreakAndStats);
    };
  }, []);

  const online = stats.status === 'Server running';
  const last7Days = getLast7Days();

  // Calculate totals and graph heights
  const studyMinsList = last7Days.map(day => {
    const seconds = studyHistory[day.dateStr] || 0;
    return Math.round(seconds / 60);
  });
  
  const totalMins = studyMinsList.reduce((acc, cur) => acc + cur, 0);
  const maxMins = Math.max(...studyMinsList, 15); // scaled baseline: minimum 15 mins

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Welcome back, {user.name}</h2>
        <p className="page-subtitle">Track your focus streak and access your study library folders below.</p>
      </div>

      {/* Stats row (Model removed) */}
      <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-card-title">Notes Library</div>
          <div className="stat-card-value">{stats.notesLoaded ? 'Ready' : 'No Active Notes'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-title">Workspace Status</div>
          <div className={`stat-card-value ${online ? 'status-online' : 'status-offline'}`}>
            {online ? 'Online' : stats.status}
          </div>
        </div>
      </div>

      {/* Analytics Row: Streak + Progress graph */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Streak Component */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🔥 Study Streak
            </h3>
            <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Study using the focus clock daily to build and protect your streak.
            </p>
            
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '3.5rem', fontWeight: 900, lineHeight: 1, color: 'var(--foreground)' }}>
                {streakInfo.currentStreak}
              </span>
              <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--muted-foreground)' }}>
                {streakInfo.currentStreak === 1 ? 'day' : 'days'} active
              </span>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginTop: '1rem' }}>
              {last7Days.map(day => {
                const dayMins = Math.round((studyHistory[day.dateStr] || 0) / 60);
                const isActive = dayMins >= 30 || streakInfo.history.includes(day.dateStr);
                return (
                  <div key={day.dateStr} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', flex: 1 }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '9999px',
                      border: '2px solid var(--foreground)',
                      background: isActive ? '#facc15' : 'white',
                      boxShadow: isActive ? '2px 2px 0 var(--foreground)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      color: 'var(--foreground)',
                      position: 'relative'
                    }} title={`${day.dateStr}: ${dayMins} mins studied`}>
                      {isActive ? '🔥' : day.dayNum}
                    </div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--muted-foreground)' }}>
                      {day.label}
                    </span>
                  </div>
                );
              })}
            </div>
            
            <p style={{ 
              fontSize: '0.8rem', 
              fontWeight: 700, 
              color: streakInfo.currentStreak > 0 ? '#15803d' : '#b45309',
              background: streakInfo.currentStreak > 0 ? '#f0fdf4' : '#fffbeb',
              padding: '0.65rem',
              borderRadius: '8px',
              border: '2px solid var(--foreground)',
              textAlign: 'center',
              marginTop: '1.5rem',
              boxShadow: '3px 3px 0 var(--foreground)'
            }}>
              {streakInfo.currentStreak > 0 
                ? `You're on fire! Keep it going tomorrow.` 
                : 'Study for at least 30 mins today to start a new streak.'
              }
            </p>
          </div>
        </div>

        {/* Study Time Graph Component */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              📊 Focus Hours
            </h3>
            <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Focus minutes tracked by your Pomodoro clock over the last week.
            </p>
          </div>

          {/* Bar Graph Container */}
          <div style={{ 
            height: '140px', 
            display: 'flex', 
            alignItems: 'flex-end', 
            justifyContent: 'space-between',
            gap: '0.75rem',
            paddingBottom: '0.5rem',
            borderBottom: '2.5px solid var(--foreground)'
          }}>
            {last7Days.map((day, idx) => {
              const mins = studyMinsList[idx];
              const pct = (mins / maxMins) * 100;
              return (
                <div key={day.dateStr} style={{ 
                  flex: 1, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  height: '100%',
                  justifyContent: 'flex-end'
                }}>
                  {/* Tooltip on hover */}
                  <span style={{ 
                    fontSize: '0.7rem', 
                    fontWeight: 900, 
                    color: mins > 0 ? 'var(--foreground)' : 'transparent',
                    marginBottom: '0.25rem' 
                  }}>
                    {mins}m
                  </span>
                  {/* Bar */}
                  <div style={{
                    width: '100%',
                    height: `${pct}%`,
                    minHeight: mins > 0 ? '6px' : '2px',
                    background: day.isToday ? '#6366f1' : '#a78bfa',
                    border: '2px solid var(--foreground)',
                    borderRadius: '4px 4px 0 0',
                    boxShadow: mins > 0 ? '2px 0 0 var(--foreground)' : 'none',
                    transition: 'height 0.3s ease'
                  }} />
                  <span style={{ 
                    fontSize: '0.7rem', 
                    fontWeight: 800, 
                    color: 'var(--muted-foreground)',
                    marginTop: '0.5rem',
                    whiteSpace: 'nowrap'
                  }}>
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--muted-foreground)' }}>
              Weekly Total
            </span>
            <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--foreground)' }}>
              {totalMins} mins
            </span>
          </div>
        </div>
      </div>

      {/* Library Folder Overview Section */}
      <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        📁 Subject Library
      </h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
        {subjects.map((sub, idx) => (
          <a key={idx} href="#notes" className="card" style={{ 
            textDecoration: 'none', 
            color: 'inherit',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '1rem',
            transition: 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)',
            transform: 'none',
            border: '2.5px solid var(--foreground)',
            boxShadow: `4px 4px 0 ${sub.meta?.shadow || 'var(--foreground)'}`
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translate(-2px, -2px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
            <span style={{ fontSize: '2rem' }}>{sub.meta?.emoji || '📂'}</span>
            <div>
              <h4 style={{ fontWeight: 800, margin: 0 }}>{sub.name}</h4>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'var(--muted-foreground)', fontWeight: 700 }}>
                View Notes →
              </p>
            </div>
          </a>
        ))}
        
        <a href="#notes" className="card" style={{
          textDecoration: 'none',
          color: 'var(--muted-foreground)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          padding: '1rem',
          border: '2.5px dashed var(--foreground)',
          fontWeight: 800,
          background: 'none',
          boxShadow: 'none'
        }}>
          <span>➕ Add Subject</span>
        </a>
      </div>
    </div>
  );
};

export default Dashboard;
