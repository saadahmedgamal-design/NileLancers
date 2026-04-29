import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, getDocs, doc, getDoc, deleteDoc } from 'firebase/firestore';

const ApplicationsPage = ({ lang, user, setPage }) => {
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  const t = lang === 'en' ? {
    title: 'My Applications', subtitle: 'Track all your job applications',
    empty: "You haven't applied to any jobs yet.", browse: 'Browse Jobs',
    withdraw: 'Withdraw', status_pending: 'Pending', status_accepted: 'Accepted',
    status_rejected: 'Rejected', status_withdrawn: 'Withdrawn',
    applied: 'Applied', budget: 'Budget', withdrawing: 'Withdrawing...'
  } : {
    title: 'طلباتي', subtitle: 'تتبع جميع طلباتك على الوظائف',
    empty: 'لم تتقدم لأي وظيفة بعد.', browse: 'تصفح الوظائف',
    withdraw: 'سحب الطلب', status_pending: 'قيد الانتظار', status_accepted: 'مقبول',
    status_rejected: 'مرفوض', status_withdrawn: 'مسحوب',
    applied: 'تقدمت', budget: 'الميزانية', withdrawing: 'جاري السحب...'
  };

  const statusColor = { pending: '#f39c12', accepted: '#2ecc71', rejected: '#e74c3c', withdrawn: '#95a5a6' };
  const statusLabel = { pending: t.status_pending, accepted: t.status_accepted, rejected: t.status_rejected, withdrawn: t.status_withdrawn };

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    const fetch = async () => {
      try {
        const snap = await getDocs(
          query(collection(db, 'applications'), where('userId', '==', user.id))
        );
        const apps = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Enrich with job details
        const enriched = await Promise.all(apps.map(async app => {
          const jobSnap = await getDoc(doc(db, 'jobs', app.jobId));
          return jobSnap.exists()
            ? { ...app, job: { id: jobSnap.id, ...jobSnap.data() } }
            : { ...app, job: null };
        }));

        // Sort newest first
        enriched.sort((a, b) => (b.appliedAt || '') > (a.appliedAt || '') ? 1 : -1);
        setApplications(enriched);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  const handleWithdraw = async (appId) => {
    await deleteDoc(doc(db, 'applications', appId));
    setApplications(prev => prev.filter(a => a.id !== appId));
  };

  if (!user) {
    return (
      <div className="page-wrapper" dir={dir}>
        <div className="container" style={{ paddingTop: '120px', textAlign: 'center' }}>
          <i className="fas fa-lock" style={{ fontSize: '3rem', color: 'var(--text-secondary)', marginBottom: '16px' }}></i>
          <h2 style={{ color: 'var(--text-primary)' }}>
            {lang === 'en' ? 'Please log in to view your applications.' : 'سجل دخولك لعرض طلباتك.'}
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
            <i className="fas fa-file-alt"></i> {lang === 'en' ? 'Applications' : 'الطلبات'}
          </span>
          <h1 className="section-title" style={{ textAlign: 'inherit', fontSize: '1.8rem' }}>{t.title}</h1>
          <p className="section-subtitle" style={{ textAlign: 'inherit' }}>{t.subtitle}</p>
        </div>

        {/* Summary badges */}
        {!loading && applications.length > 0 && (
          <div className="app-summary">
            {Object.entries(statusLabel).map(([key, label]) => {
              const count = applications.filter(a => a.status === key).length;
              return count > 0 ? (
                <div key={key} className="app-summary-badge"
                  style={{ background: statusColor[key] + '18', border: `1px solid ${statusColor[key]}44`, color: statusColor[key] }}>
                  <span className="app-count">{count}</span> {label}
                </div>
              ) : null;
            })}
          </div>
        )}

        {loading ? (
          <div className="loader">{lang === 'en' ? 'Loading...' : 'جاري التحميل...'}</div>
        ) : applications.length === 0 ? (
          <div className="dash-empty" style={{ marginTop: '60px' }}>
            <i className="fas fa-file-alt" style={{ fontSize: '3rem', color: 'var(--text-secondary)', marginBottom: '16px' }}></i>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>{t.empty}</p>
            <button className="btn-dash-primary" onClick={() => setPage('jobs')}>{t.browse}</button>
          </div>
        ) : (
          <div className="applications-list">
            {applications.map(app => (
              <div key={app.id} className="application-card">
                <div className="application-card-left">
                  <div className="job-icon"
                    style={{ backgroundColor: (app.job?.color || '#888') + '20', color: app.job?.color || '#888', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className={`fas ${app.job?.icon || 'fa-briefcase'}`}></i>
                  </div>
                  <div>
                    <h3 className="app-job-title">{app.job?.title || app.jobId}</h3>
                    <div className="app-job-meta">
                      <span><i className="fas fa-tag"></i> {app.job?.category || '—'}</span>
                      {app.job?.budget && (
                        <span><i className="fas fa-money-bill-wave"></i> {app.job.budget.toLocaleString()} {lang === 'en' ? 'EGP' : 'جنيه'}</span>
                      )}
                      <span><i className="fas fa-clock"></i> {t.applied}: {app.appliedAt ? new Date(app.appliedAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US') : '—'}</span>
                    </div>
                  </div>
                </div>
                <div className="application-card-right">
                  <span className="dash-status-badge"
                    style={{ background: (statusColor[app.status] || '#888') + '20', color: statusColor[app.status] || '#888', border: `1px solid ${statusColor[app.status] || '#888'}44` }}>
                    {statusLabel[app.status] || app.status}
                  </span>
                  {app.status === 'pending' && (
                    <button className="btn-withdraw" onClick={() => handleWithdraw(app.id)}>
                      <i className="fas fa-undo-alt"></i> {t.withdraw}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ApplicationsPage;
