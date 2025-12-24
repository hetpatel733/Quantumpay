import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check localStorage for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    // Default to dark mode for all users
    localStorage.setItem('theme', 'dark');
    return true;
  });

  useEffect(() => {
    // Update the document class and localStorage when theme changes
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const styleId = 'autofill-theme-fix';
    let styleEl = document.getElementById(styleId);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    const background = isDarkMode ? '#0f172a' : '#f8fafc';
    const textColor = isDarkMode ? '#f8fafc' : '#0f172a';

    styleEl.textContent = `
      input:-webkit-autofill,
      textarea:-webkit-autofill,
      select:-webkit-autofill,
      input:-webkit-autofill:hover,
      textarea:-webkit-autofill:hover,
      select:-webkit-autofill:hover,
      input:-webkit-autofill:focus,
      textarea:-webkit-autofill:focus,
      select:-webkit-autofill:focus,
      input:-webkit-autofill:active,
      textarea:-webkit-autofill:active,
      select:-webkit-autofill:active,
      input:-internal-autofill-selected,
      textarea:-internal-autofill-selected,
      select:-internal-autofill-selected {
        box-shadow: 0 0 0px 1000px ${background} inset !important;
        -webkit-text-fill-color: ${textColor} !important;
        transition: background-color 5000s ease-in-out 0s;
      }
    `;
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
