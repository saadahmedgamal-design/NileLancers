import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import JobBoard from './pages/JobBoard';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ProfilePage from './pages/ProfilePage';
import DashboardPage from './pages/DashboardPage';
import PostJobPage from './pages/PostJobPage';
import SavedJobsPage from './pages/SavedJobsPage';
import MessagesPage from './pages/MessagesPage';
import ApplicationsPage from './pages/ApplicationsPage';
import NotificationsPage from './pages/NotificationsPage';
import AdminPanel from './pages/AdminPanel';
import { subscribeToAuth, logoutUser } from './firebase/auth';
import { seedDatabase } from './firebase/seed';
import './index.css';

function App() {
  const [page, setPage] = useState('home');
  const [lang, setLang] = useState('en');
  const [theme, setTheme] = useState('dark');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.lang = lang;
    document.body.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [theme, lang]);

  useEffect(() => {
    seedDatabase();
    const unsubscribe = subscribeToAuth((firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
    setPage('home');
  };

  const navigate = (p) => {
    const protected_pages = ['profile', 'dashboard', 'post-job', 'messages', 'saved-jobs', 'applications', 'notifications', 'admin'];
    if (protected_pages.includes(p) && !user) {
      setPage('login');
      return;
    }
    setPage(p);
    window.scrollTo(0, 0);
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: 'var(--bg)', color: 'var(--gold)',
        fontSize: '1.3rem', fontWeight: 800, gap: '14px', flexDirection: 'column'
      }}>
        <i className="fas fa-water" style={{ fontSize: '3rem', animation: 'pulse 1.5s ease-in-out infinite' }}></i>
        NileLancers
        <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-secondary)' }}>Loading your experience...</span>
      </div>
    );
  }

  const noFooterPages = ['messages'];

  return (
    <div className="app-container">
      <Navbar
        page={page}
        setPage={navigate}
        lang={lang}
        setLang={setLang}
        theme={theme}
        setTheme={setTheme}
        user={user}
        setUser={setUser}
        onLogout={handleLogout}
      />

      <main>
        {page === 'home'          && <Hero lang={lang} setPage={navigate} />}
        {page === 'jobs'          && <JobBoard lang={lang} user={user} setPage={navigate} />}
        {page === 'login'         && <LoginPage lang={lang} setPage={navigate} setUser={setUser} />}
        {page === 'signup'        && <SignupPage lang={lang} setPage={navigate} setUser={setUser} />}
        {page === 'profile'       && <ProfilePage lang={lang} user={user} setUser={setUser} setPage={navigate} />}
        {page === 'dashboard'     && <DashboardPage lang={lang} user={user} setPage={navigate} />}
        {page === 'post-job'      && <PostJobPage lang={lang} user={user} setPage={navigate} />}
        {page === 'saved-jobs'    && <SavedJobsPage lang={lang} user={user} setPage={navigate} />}
        {page === 'messages'      && <MessagesPage lang={lang} user={user} setPage={navigate} />}
        {page === 'applications'  && <ApplicationsPage lang={lang} user={user} setPage={navigate} />}
        {page === 'notifications' && <NotificationsPage lang={lang} user={user} setPage={navigate} />}
        {page === 'admin'         && <AdminPanel lang={lang} user={user} setPage={navigate} />}
      </main>

      {!noFooterPages.includes(page) && (
        <footer className="footer">
          <div className="container">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fas fa-water" style={{ color: 'var(--gold)' }}></i>
                <span style={{ fontWeight: 700 }}>NileLancers</span>
              </div>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                {[
                  { p: 'jobs', en: 'Browse Jobs', ar: 'تصفح الوظائف' },
                  { p: 'post-job', en: 'Post a Job', ar: 'نشر وظيفة' },
                ].map(l => (
                  <span key={l.p} style={{ cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '13px' }}
                    onClick={() => navigate(l.p)}>
                    {lang === 'en' ? l.en : l.ar}
                  </span>
                ))}
              </div>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '13px' }}>
                © 2025 NileLancers. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

export default App;
