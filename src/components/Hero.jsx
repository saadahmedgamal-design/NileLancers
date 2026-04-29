import React from 'react';
import { TRANSLATIONS } from '../translations';

const Hero = ({ lang, setPage }) => {
  const t = TRANSLATIONS[lang].hero;
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  return (
    <section className="hero" dir={dir}>
      <div className="hero-bg-grid"></div>
      <div className="container">
        <div className="hero-content">
          <div className="hero-tag tag">#1 Freelance Platform in Egypt</div>
          <h1 className="hero-title">
            {lang === 'en' ? (
              <>Find the Best <span className="highlight">Digital Talent</span> for Your Business</>
            ) : (
              <>ابحث عن أفضل <span className="highlight">المواهب الرقمية</span> لعملك</>
            )}
          </h1>
          <p className="hero-desc">{t.desc}</p>
          <div className="hero-btns">
            <button className="btn-primary" onClick={() => setPage('signup')}>
              {t.btn_start} <i className={`fas fa-arrow-${lang === 'en' ? 'right' : 'left'}`}></i>
            </button>
            <button className="btn-secondary" onClick={() => setPage('jobs')}>
              {t.btn_hire}
            </button>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <div className="hero-stat-value">50k+</div>
              <div className="hero-stat-label">Freelancers</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-value">12k+</div>
              <div className="hero-stat-label">Projects</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Floating Card Design from Legacy */}
      <div className="hero-floating-card">
        <div className="hero-card-row">
          <div className="hero-card-icon"><i className="fas fa-check-circle"></i></div>
          <div>
            <div className="hero-card-label">Verified Pro</div>
            <div className="hero-card-value">Nile Expert</div>
          </div>
        </div>
        <div className="hero-card-row">
          <div className="hero-card-icon"><i className="fas fa-shield-alt"></i></div>
          <div>
            <div className="hero-card-label">Security</div>
            <div className="hero-card-value">Escrow Protected</div>
          </div>
        </div>
        <div className="hero-card-badge">Top Rated</div>
      </div>
    </section>
  );
};

export default Hero;
