import React, { useEffect, useState } from 'react';
import './ThemeToggle.css';

export const ThemeToggle: React.FC = () => {
  const [isDark, setIsDark] = useState(false);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('f-plan:theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (prefersDark ? 'dark' : 'light');

    setIsDark(theme === 'dark');
    document.documentElement.setAttribute('data-theme', theme);
  }, []);

  const handleToggle = () => {
    const newTheme = isDark ? 'light' : 'dark';
    setIsDark(!isDark);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('f-plan:theme', newTheme);
  };

  return (
    <button
      className="theme-toggle"
      onClick={handleToggle}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      aria-label="Toggle theme"
    >
      {isDark ? (
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          className="theme-icon"
        >
          <circle cx="10" cy="10" r="4" strokeWidth="1.5" />
          <line x1="10" y1="1" x2="10" y2="3" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="10" y1="17" x2="10" y2="19" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="19" y1="10" x2="17" y2="10" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="3" y1="10" x2="1" y2="10" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="16.5" y1="3.5" x2="15" y2="5" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="5" y1="15" x2="3.5" y2="16.5" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="16.5" y1="16.5" x2="15" y2="15" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="5" y1="5" x2="3.5" y2="3.5" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ) : (
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          className="theme-icon"
        >
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
};
