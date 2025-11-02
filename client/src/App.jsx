import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import Landing from './pages/Landing.jsx';
import AuthPage from './pages/AuthPage.jsx';
import UserDashboard from './pages/UserDashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';

const STORAGE_KEY = 'theme';
const THEMES = {
  light: 'light',
  dark: 'dark'
};

export default function App() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') {
      return THEMES.light;
    }
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === THEMES.dark || stored === THEMES.light) {
      return stored;
    }
    const prefersDark =
      typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? THEMES.dark : THEMES.light;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === THEMES.dark);
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch (error) {
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((current) => (current === THEMES.dark ? THEMES.light : THEMES.dark));
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 transition-colors duration-300 dark:bg-black dark:text-gray-100">
      <div id="top" className="sr-only">
        Top
      </div>
      <Header theme={theme} onToggleTheme={toggleTheme} />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/dashboard/user" element={<UserDashboard />} />
        <Route path="/dashboard/admin" element={<AdminDashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Footer />
    </div>
  );
}
