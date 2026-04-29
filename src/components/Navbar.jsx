import React, { useState, useEffect } from 'react';
import { TRANSLATIONS } from '../translations';
import { NotificationBell } from '../pages/NotificationsPage';

const Navbar = ({ lang, setLang, theme, setTheme, user, setUser, setPage, page, onLogout }) => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  
  const t = TRANSLATIONS[lang].nav;
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const nav = (p) => {
    setPage(p);
    setMenuOpen(false);
    setDropOpen(false);
    window.scrollTo(0, 0);
  };

  const navLinks = [
    { label: t.home, page: 'home' },
    { label: t.services, page: 'jobs' },
    { label: lang === 'en' ? 'About Us' : 'من نحن', page: 'about' },
    { label: lang === 'en' ? 'Contact' : 'تواصل', page: 'contact' },
  ];

  return (
    <header className={`header${scrolled ? ' scrolled' : ''}`}>
      <nav className="nav" dir={dir}>
        <div className="nav-logo" onClick={() => nav('home')}>
          <i className="fas fa-water nav-logo-img"></i>
          <span className="nav-logo-text">NileLancers</span>
        </div>
        
        <div className="nav-links">
          {navLinks.map((l, i) => (
            <span key={i} className={`nav-link${page === l.page ? ' active' : ''}`} onClick={() => nav(l.page)}>
              {l.label}
            </span>
          ))}
          <span className={`nav-link${page === 'post-job' ? ' active' : ''}`} onClick={() => nav('post-job')}>
            {t.post_job}
          </span>
        </div>

        <div className="nav-actions">
          <button className="nav-icon-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title="Toggle theme">
            <i className={`fas fa-${theme === 'dark' ? 'sun' : 'moon'}`}></i>
          </button>
          
          <button className="lang-btn" onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}>
            {lang === 'en' ? 'ع' : 'EN'}
          </button>

          <NotificationBell lang={lang} user={user} setPage={setPage} />

          {user ? (
            <div style={{ position: 'relative' }}>
              <div className="avatar-btn" onClick={() => setDropOpen(!dropOpen)}>
                {(user.name?.[0] || 'U').toUpperCase()}
              </div>
              {dropOpen && (
                <div className="dropdown" dir={dir}>
                  <div className="dropdown-header">
                    <div style={{ fontWeight: 800, fontSize: '14px' }}>{user.name}</div>
                    <small>{user.email}</small>
                  </div>
                  {[
                    { icon: 'user', label: t.my_profile, page: 'profile' },
                    { icon: 'tachometer-alt', label: lang === 'en' ? 'Dashboard' : 'لوحة التحكم', page: 'dashboard' },
                    { icon: 'file-alt', label: t.applications, page: 'applications' },
                    { icon: 'bookmark', label: lang === 'en' ? 'Saved Jobs' : 'الوظائف المحفوظة', page: 'saved-jobs' },
                    { icon: 'comments', label: t.messages || 'Messages', page: 'messages' },
                    { icon: 'wallet', label: t.wallet, page: 'wallet' },
                    { icon: 'cog', label: t.settings, page: 'settings' },
                    ...(user?.role === 'admin' ? [{ icon: 'shield-alt', label: t.admin || 'Admin Panel', page: 'admin' }] : []),
                  ].map((item) => (
                    <div key={item.page} className="dropdown-item" onClick={() => nav(item.page)}>
                      <i className={`fas fa-${item.icon}`}></i>{item.label}
                    </div>
                  ))}
                  <div className="dropdown-divider"></div>
                  <div className="dropdown-item dropdown-logout" onClick={() => { onLogout && onLogout(); setDropOpen(false); }}>
                    <i className="fas fa-sign-out-alt"></i>{t.logout}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <button className="btn-login" onClick={() => nav('login')}>{t.login}</button>
              <button className="btn-signup" onClick={() => nav('signup')}>{t.signup}</button>
            </>
          )}
          
          <div className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
            <span></span><span></span><span></span>
          </div>
        </div>
      </nav>
      
      <div className={`mobile-menu${menuOpen ? ' open' : ''}`} dir={dir}>
        {navLinks.map((l, i) => (
          <div key={i} className="mobile-nav-link" onClick={() => nav(l.page)}>{l.label}</div>
        ))}
        {user ? (
          <div className="mobile-nav-link" style={{ color: 'var(--gold)' }} onClick={() => { onLogout && onLogout(); setMenuOpen(false); }}>
            <i className="fas fa-sign-out-alt" style={{ marginRight: '8px' }}></i>{t.logout}
          </div>
        ) : (
          <>
            <div className="mobile-nav-link" style={{ color: 'var(--gold)' }} onClick={() => nav('login')}>{t.login}</div>
            <div className="mobile-nav-link" style={{ color: 'var(--gold)' }} onClick={() => nav('signup')}>{t.signup}</div>
          </>
        )}
      </div>
    </header>
  );
};

export default Navbar;
