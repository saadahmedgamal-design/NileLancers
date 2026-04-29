import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import {
  collection, query, where, getDocs, addDoc, deleteDoc, doc, getDoc, orderBy
} from 'firebase/firestore';

const SavedJobsPage = ({ lang, user, setPage }) => {
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const [savedJobs, setSavedJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const t = lang === 'en' ? {
    title: 'Saved Jobs', subtitle: 'Jobs you bookmarked for later',
    empty: "You haven't saved any jobs yet.", browse: 'Browse Jobs',
    remove: 'Remove', apply: 'Apply Now', budget: 'Budget',
    deadline: 'Deadline', removing: 'Removing...'
  } : {
    title: 'الوظائف المحفوظة', subtitle: 'الوظائف التي حفظتها للمراجعة لاحقاً',
    empty: 'لم تحفظ أي وظائف بعد.', browse: 'تصفح الوظائف',
    remove: 'إزالة', apply: 'قدم الآن', budget: 'الميزانية',
    deadline: 'الموعد النهائي', removing: 'جاري الإزالة...'
  };

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    const fetch = async () => {
      try {
        const snap = await getDocs(
          query(collection(db, 'saved_jobs'), where('userId', '==', user.id))
        );
        const savedDocs = snap.docs.map(d => ({ savedId: d.id, ...d.data() }));

        // Batch-fetch job details
        const jobDetails = await Promise.all(
          savedDocs.map(async s => {
            const jobSnap = await getDoc(doc(db, 'jobs', s.jobId));
            return jobSnap.exists()
              ? { savedId: s.savedId, jobId: s.jobId, savedAt: s.savedAt, ...jobSnap.data() }
              : null;
          })
        );
        setSavedJobs(jobDetails.filter(Boolean));
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  const handleRemove = async (savedId) => {
    await deleteDoc(doc(db, 'saved_jobs', savedId));
    setSavedJobs(prev => prev.filter(j => j.savedId !== savedId));
  };

  if (!user) {
    return (
      <div className="page-wrapper" dir={dir}>
        <div className="container" style={{ paddingTop: '120px', textAlign: 'center' }}>
          <i className="fas fa-lock" style={{ fontSize: '3rem', color: 'var(--text-secondary)', marginBottom: '16px' }}></i>
          <h2 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>
            {lang === 'en' ? 'Please log in to view saved jobs.' : 'سجل دخولك لعرض الوظائف المحفوظة.'}
          </h2>
          <button className="btn-dash-primary" style={{ marginTop: '20px' }} onClick={() => setPage('login')}>
            {lang === 'en' ? 'Login' : 'تسجيل الدخول'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper" dir={dir}>
      <div className="container">
        <div className="section-header" style={{ textAlign: dir === 'rtl' ? 'right' : 'left', paddingTop: '20px' }}>
          <span className="tag" style={{ display: 'inline-flex', gap: '6px', marginBottom: '12px' }}>
            <i className="fas fa-bookmark"></i> {lang === 'en' ? 'Bookmarks' : 'المفضلة'}
          </span>
          <h1 className="section-title" style={{ textAlign: 'inherit', fontSize: '1.8rem' }}>{t.title}</h1>
          <p className="section-subtitle" style={{ textAlign: 'inherit' }}>{t.subtitle}</p>
        </div>

        {loading ? (
          <div className="loader">{lang === 'en' ? 'Loading...' : 'جاري التحميل...'}</div>
        ) : savedJobs.length === 0 ? (
          <div className="dash-empty" style={{ marginTop: '60px' }}>
            <i className="fas fa-bookmark" style={{ fontSize: '3rem', color: 'var(--text-secondary)', marginBottom: '16px' }}></i>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>{t.empty}</p>
            <button className="btn-dash-primary" onClick={() => setPage('jobs')}>{t.browse}</button>
          </div>
        ) : (
          <div className="saved-jobs-grid">
            {savedJobs.map((job) => (
              <div key={job.savedId} className="saved-job-card">
                <div className="job-card-header">
                  <div className="job-icon" style={{ backgroundColor: (job.color || '#888') + '20', color: job.color || '#888' }}>
                    <i className={`fas ${job.icon || 'fa-briefcase'}`}></i>
                  </div>
                  <span className="job-badge">{job.category}</span>
                </div>
                <h3 className="job-title" style={{ margin: '12px 0 6px' }}>{job.title}</h3>
                <p className="job-description">{(job.description || '').substring(0, 90)}...</p>

                <div className="job-meta" style={{ margin: '12px 0' }}>
                  <div className="meta-item">
                    <i className="fas fa-money-bill-wave"></i>
                    <span>{job.budget?.toLocaleString()} {lang === 'en' ? 'EGP' : 'جنيه'}</span>
                  </div>
                  {job.deadline && (
                    <div className="meta-item">
                      <i className="fas fa-calendar-alt"></i>
                      <span>{new Date(job.deadline).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}</span>
                    </div>
                  )}
                </div>

                {job.skills?.length > 0 && (
                  <div className="skills-tags">
                    {job.skills.slice(0, 3).map(s => (
                      <span key={s} className="skill-tag">{s}</span>
                    ))}
                  </div>
                )}

                <div className="saved-card-actions">
                  <button className="btn-dash-outline" style={{ flex: 1, justifyContent: 'center' }}
                    onClick={() => handleRemove(job.savedId)}>
                    <i className="fas fa-trash-alt"></i> {t.remove}
                  </button>
                  <button className="btn-dash-primary" style={{ flex: 1, justifyContent: 'center' }}
                    onClick={() => setPage('jobs')}>
                    <i className="fas fa-paper-plane"></i> {t.apply}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedJobsPage;
