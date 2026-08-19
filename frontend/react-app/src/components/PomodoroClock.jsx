import React, { useState, useEffect, useRef } from 'react';

const MODES = [
  { label: 'Focus',       minutes: 25, color: '#6366f1', shadow: '#4338ca' },
  { label: 'Short Break', minutes: 5,  color: '#22c55e', shadow: '#15803d' },
  { label: 'Long Break',  minutes: 15, color: '#f59e0b', shadow: '#b45309' },
];

const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
};

/* ── Tiny draggable pill that expands on click ── */
const PomodoroClock = ({ onClose }) => {
  const [modeIdx,            setModeIdx]            = useState(0);
  const [timeLeft,           setTimeLeft]           = useState(MODES[0].minutes * 60);
  const [isRunning,          setIsRunning]          = useState(false);
  
  const today = getTodayStr();
  const [totalSecondsStudied, setTotalSecondsStudied] = useState(() => {
    try {
      const stored = localStorage.getItem('studybuddy_studytime');
      const data = stored ? JSON.parse(stored) : {};
      return data[today] || 0;
    } catch {
      return 0;
    }
  });
  const [expanded,           setExpanded]           = useState(false);

  // Drag state
  const [pos,      setPos]      = useState({ x: 0, y: 0 });  // offset from default right-edge anchor
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef(null);
  const panelRef     = useRef(null);

  const mode = MODES[modeIdx];

  /* ── Timer tick ── */
  useEffect(() => {
    let timer;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(p => p - 1);
        setTotalSecondsStudied(p => {
          const newVal = p + 1;
          try {
            const stored = localStorage.getItem('studybuddy_studytime');
            const data = stored ? JSON.parse(stored) : {};
            const curDate = getTodayStr();
            data[curDate] = (data[curDate] || 0) + 1;
            localStorage.setItem('studybuddy_studytime', JSON.stringify(data));
            
            // Dispatch a storage event so Dashboard can update in real-time
            window.dispatchEvent(new Event('studybuddy_timer_tick'));
          } catch (e) {
            console.error('Failed to update localStorage studytime:', e);
          }
          return newVal;
        });
      }, 1000);
    } else if (isRunning && timeLeft === 0) {
      setIsRunning(false);
    }
    return () => clearInterval(timer);
  }, [isRunning, timeLeft]);

  /* ── Mode change ── */
  const switchMode = (idx) => {
    setModeIdx(idx);
    setTimeLeft(MODES[idx].minutes * 60);
    setIsRunning(false);
  };

  const reset = () => {
    setTimeLeft(mode.minutes * 60);
    setIsRunning(false);
  };

  const fmt = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const fmtTotal = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const progress = 1 - timeLeft / (mode.minutes * 60);
  const radius   = 30;
  const circ     = 2 * Math.PI * radius;
  const dash     = circ * progress;

  /* ── Drag handlers ── */
  const onMouseDown = (e) => {
    if (e.target.closest('button')) return;  // don't drag on button clicks
    e.preventDefault();
    dragStartRef.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
    setDragging(true);
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      const { mx, my, px, py } = dragStartRef.current;
      setPos({ x: px + (e.clientX - mx), y: py + (e.clientY - my) });
    };
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [dragging]);

  /* ── Collapsed pill ── */
  const pill = (
    <div
      ref={panelRef}
      onMouseDown={onMouseDown}
      style={{
        position: 'fixed',
        top: `calc(var(--topbar-height, 60px) + 0.75rem + ${pos.y}px)`,
        right: `calc(1.25rem - ${pos.x}px)`,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        background: 'white',
        border: `2.5px solid ${mode.color}`,
        borderRadius: '9999px',
        padding: '0.35rem 0.7rem 0.35rem 0.5rem',
        boxShadow: `3px 3px 0 ${mode.shadow}`,
        cursor: dragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        transition: dragging ? 'none' : 'box-shadow 0.15s ease',
      }}
    >
      {/* Tiny SVG ring */}
      <svg width="28" height="28" viewBox="0 0 72 72" style={{ flexShrink: 0 }}>
        <circle cx="36" cy="36" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle
          cx="36" cy="36" r={radius}
          fill="none"
          stroke={mode.color}
          strokeWidth="8"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          transform="rotate(-90 36 36)"
          style={{ transition: 'stroke-dasharray 1s linear' }}
        />
      </svg>

      {/* Countdown */}
      <span style={{ fontWeight: 800, fontSize: '0.9rem', fontVariantNumeric: 'tabular-nums', color: '#1e293b' }}>
        {fmt(timeLeft)}
      </span>

      {/* Play/Pause */}
      <button
        type="button"
        onClick={() => setIsRunning(r => !r)}
        style={{
          background: mode.color,
          color: 'white',
          border: 'none',
          borderRadius: '9999px',
          width: '24px', height: '24px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
          fontSize: '0.7rem',
          fontWeight: 800,
          flexShrink: 0,
        }}
        aria-label={isRunning ? 'Pause' : 'Start'}
      >
        {isRunning ? '⏸' : '▶'}
      </button>

      {/* Expand */}
      <button
        type="button"
        onClick={() => setExpanded(true)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: '0.7rem', color: '#94a3b8', padding: '2px 0',
          lineHeight: 1, flexShrink: 0,
        }}
        aria-label="Expand timer"
        title="Expand"
      >
        ⛶
      </button>

      {/* Close */}
      <button
        type="button"
        onClick={onClose}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: '0.75rem', color: '#94a3b8', padding: '2px 0',
          lineHeight: 1, flexShrink: 0,
        }}
        aria-label="Close timer"
        title="Close"
      >
        ✕
      </button>
    </div>
  );

  /* ── Expanded panel ── */
  const panel = (
    <div
      ref={panelRef}
      onMouseDown={onMouseDown}
      style={{
        position: 'fixed',
        top: `calc(var(--topbar-height, 60px) + 0.75rem + ${pos.y}px)`,
        right: `calc(1.25rem - ${pos.x}px)`,
        zIndex: 9999,
        width: '230px',
        background: 'white',
        border: `2.5px solid ${mode.color}`,
        borderRadius: '16px',
        padding: '1rem 1rem 0.85rem',
        boxShadow: `5px 5px 0 ${mode.shadow}`,
        cursor: dragging ? 'grabbing' : 'grab',
        userSelect: 'none',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: mode.color }}>
          Focus Clock
        </span>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <button
            type="button"
            onClick={() => setExpanded(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1 }}
            title="Minimise"
          >
            ─
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1 }}
            title="Close"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Mode pills */}
      <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.9rem' }}>
        {MODES.map((m, i) => (
          <button
            key={m.label}
            type="button"
            onClick={() => switchMode(i)}
            style={{
              flex: 1,
              padding: '0.25rem 0',
              border: `2px solid ${i === modeIdx ? m.color : '#e2e8f0'}`,
              borderRadius: '9999px',
              background: i === modeIdx ? m.color : 'white',
              color: i === modeIdx ? 'white' : '#94a3b8',
              fontWeight: 800,
              fontSize: '0.58rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s',
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* SVG Ring + Countdown */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0', marginBottom: '0.75rem' }}>
        <svg width="110" height="110" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="#e2e8f0" strokeWidth="8" />
          <circle
            cx="50" cy="50" r="42"
            fill="none"
            stroke={mode.color}
            strokeWidth="8"
            strokeDasharray={`${2 * Math.PI * 42 * progress} ${2 * Math.PI * 42 * (1 - progress)}`}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
            style={{ transition: 'stroke-dasharray 1s linear' }}
          />
          <text x="50" y="58" textAnchor="middle"
            style={{ fontSize: '1.4rem', fontWeight: 800, fill: '#1e293b', fontFamily: 'monospace', letterSpacing: '-2px' }}
          >
            {fmt(timeLeft)}
          </text>
        </svg>

        {timeLeft === 0 && (
          <p style={{ fontSize: '0.75rem', color: '#22c55e', fontWeight: 700, margin: '0.25rem 0 0' }}>
            ✅ Session complete!
          </p>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem' }}>
        <button
          type="button"
          onClick={() => setIsRunning(r => !r)}
          style={{
            flex: 1, padding: '0.5rem',
            background: isRunning ? '#f1f5f9' : mode.color,
            color: isRunning ? '#475569' : 'white',
            border: `2px solid ${isRunning ? '#e2e8f0' : mode.shadow}`,
            borderRadius: '9999px',
            fontWeight: 800, fontSize: '0.82rem',
            cursor: 'pointer',
            boxShadow: isRunning ? 'none' : `2px 2px 0 ${mode.shadow}`,
            transition: 'all 0.15s',
          }}
        >
          {isRunning ? '⏸ Pause' : '▶ Start'}
        </button>
        <button
          type="button"
          onClick={reset}
          style={{
            padding: '0.5rem 0.85rem',
            background: 'white',
            color: '#64748b',
            border: '2px solid #e2e8f0',
            borderRadius: '9999px',
            fontWeight: 700, fontSize: '0.82rem',
            cursor: 'pointer',
          }}
        >
          ↺
        </button>
      </div>

      {/* Stats */}
      <div style={{
        paddingTop: '0.6rem',
        borderTop: '2px dashed #e2e8f0',
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '0.72rem',
        fontWeight: 700,
        color: '#94a3b8',
      }}>
        <span>Studied today</span>
        <span style={{ color: '#1e293b' }}>{fmtTotal(totalSecondsStudied)}</span>
      </div>
    </div>
  );

  return expanded ? panel : pill;
};

export default PomodoroClock;
