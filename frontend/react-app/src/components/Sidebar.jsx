import React from 'react';
import { IconLayout, IconNotes, IconTarget, IconCalendar, IconLogout, IconSpark } from './Icons';

const nav = [
  { href: '#dashboard', id: 'dashboard', label: 'Home', Icon: IconLayout },
  { href: '#notes', id: 'notes', label: 'Notes', Icon: IconNotes },
  { href: '#practice', id: 'practice', label: 'Practice', Icon: IconTarget },
  { href: '#summarize', id: 'summarize', label: 'Summarize', Icon: IconSpark },
  { href: '#studyplan', id: 'studyplan', label: 'Study plan', Icon: IconCalendar },
];

const Sidebar = ({ user, currentPage, open, onClose }) => {
  const handleLogout = () => {
    sessionStorage.removeItem('userEmail');
    sessionStorage.removeItem('studybuddy_token');
  };

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Main navigation">
      <div className="sidebar-logo">
        <span className="logo-mark">S</span>
        StudyBuddy<span>.ai</span>
      </div>

      <div className="user-profile">
        <div className="avatar" aria-hidden="true">{user.initial}</div>
        <div className="user-info">
          <h4>{user.name}</h4>
          <p>{user.plan} plan</p>
        </div>
      </div>

      <nav className="nav-menu" onClick={onClose}>
        {nav.map(({ href, id, label, Icon }) => (
          <a
            key={id}
            href={href}
            className={`nav-item ${currentPage === id ? 'active' : ''}`}
            aria-current={currentPage === id ? 'page' : undefined}
          >
            <span className="nav-icon"><Icon size={16} /></span>
            {label}
          </a>
        ))}
      </nav>

      <a href="#landing" className="logout-btn" onClick={handleLogout}>
        <IconLogout size={18} />
        Sign out
      </a>
    </aside>
  );
};

export default Sidebar;
