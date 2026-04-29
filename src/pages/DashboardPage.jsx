import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

const DashboardPage = ({ lang, user, setPage }) => {
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const isFreelancer = user?.role === 'freelancer';
  const isClient = user?.role === 'client';

  const [stats, setStats] = useState({ jobs: 0, applications: 0, pending: 0, accepted: 0 });
  const [recentItems, setRecentItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    const fetchData = async () => {
      try {
        if (isFreelancer) {
          // Get freelancer applications
          const appSnap = await getDocs(query(collection(db, 'applications'), where('userId', '==', user.id)));
          const apps = appSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          setStats({
            jobs: apps.length,
            applications: apps.length,
            pending: apps.filter(a => a.status === 'pending').length,
            accepted: apps.filter(a => a.status === 'accepted').length
          });
          setRecentItems(apps.slice(0, 5));
        } else if (isClient) {
          // Get client's posted jobs
          const jobSnap = await getDocs(query(collection(db, 'jobs'), where('postedBy', '==', user.id)));
          const jobs = jobSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          setStats({
            jobs: jobs.length,
            applications: 0,
            pending: jobs.filter(j => j.status === 'open').length,
            accepted: jobs.filter(j => j.status === 'completed').length
          });
          setRecentItems(jobs.slice(0, 5));
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const t = lang === 'en' ? {
    dashboard: 'Dashboard', welcome: 'Welcome back', stats_title: 'Overview',
    total_apps: 'Total Applications', total_jobs: 'Posted Jobs',
    pending: 'Pending', accepted: 'Accepted / Open',
    recent_apps: 'Recent Applications', recent_jobs: 'Recent Jobs',
    no_data: 'No data yet. Start by browsing jobs!', no_jobs: 'No jobs posted yet.',
    browse: 'Browse Jobs', post: 'Post a Job',
    status_pending: 'Pending', status_accepted: 'Accepted', status_rejected: 'Rejected',
    status_open: 'Open', status_completed: 'Completed'
  } : {
    dashboard: 'لوحة التحكم', welcome: 'مرحباً بعودتك', stats_title: 'نظرة عامة',
    total_apps: 'إجمالي الطلبات', total_jobs: 'الوظائف المنشورة',
    pending: 'قيد الانتظار', accepted: 'مقبول / مفتوح',
    recent_apps: 'آخر الطلبات', recent_jobs: 'آخر الوظائف',
    no_data: 'لا توجد بيانات بعد. ابدأ بتصفح الوظائف!', no_jobs: 'لم تنشر أي وظائف بعد.',
    browse: 'تصفح الوظائف', post: 'نشر وظيفة',
    status_pending: 'قيد الانتظار', status_accepted: 'مقبول', status_rejected: 'مرفوض',
    status_open: 'مفتوح', status_completed: 'مكتمل'
  };

  const statusColor = { pending: '#f39c12', accepted: '#2ecc71', rejected: '#e74c3c', open: '#3498db', completed: '#2ecc71', withdrawn: '#95a5a6' };
  const statusLabel = { pending: t.status_pending, accepted: t.status_accepted, rejected: t.status_rejected, open: t.status_open, completed: t.status_completed };

  const statCards = isFreelancer ? [
    { icon: 'fa-file-alt', label: t.total_apps, value: stats.applications, color: '#3498db' },
    { icon: 'fa-clock', label: t.pending, value: stats.pending, color: '#f39c12' },
    { icon: 'fa-check-circle', label: t.accepted, value: stats.accepted, color: '#2ecc71' },
  ] : [
    { icon: 'fa-briefcase', label: t.total_jobs, value: stats.jobs, color: '#9b59b6' },
    { icon: 'fa-door-open', label: t.accepted, value: stats.pending, color: '#3498db' },
    { icon: 'fa-flag-checkered', label: t.accepted, value: stats.accepted, color: '#2ecc71' },
  ];

  return (
    <div className="page-wrapper" dir={dir}>
      <div className="dashboard-page container">
        {/* Welcome */}
        <div className="dashboard-welcome">
          <div>
            <h1 className="dashboard-title">{t.welcome}, <span style={{ color: 'var(--gold)' }}>{user?.name?.split(' ')[0] || 'User'}</span> 👋</h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: '6px' }}>
              {isFreelancer
                ? (lang === 'en' ? 'Track your applications and grow your career.' : 'تابع طلباتك وطوّر مسيرتك المهنية.')
                : (lang === 'en' ? 'Manage your projects and find top talent.' : 'أدر مشاريعك وابحث عن أفضل المواهب.')}
            </p>
          </div>
          <div className="dashboard-actions">
            {isFreelancer && (
              <button className="btn-dash-primary" onClick={() => setPage('jobs')}>
                <i className="fas fa-search"></i> {t.browse}
              </button>
            )}
            {isClient && (
              <button className="btn-dash-primary" onClick={() => setPage('post-job')}>
                <i className="fas fa-plus"></i> {t.post}
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="dash-stats-grid">
          {statCards.map((s, i) => (
            <div key={i} className="dash-stat-card">
              <div className="dash-stat-icon" style={{ background: s.color + '20', color: s.color }}>
                <i className={`fas ${s.icon}`}></i>
              </div>
              <div className="dash-stat-value">{loading ? '—' : s.value}</div>
              <div className="dash-stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="dash-section">
          <h2 className="dash-section-title">{isFreelancer ? t.recent_apps : t.recent_jobs}</h2>
          {loading ? (
            <div className="loader">{lang === 'en' ? 'Loading...' : 'جاري التحميل...'}</div>
          ) : recentItems.length === 0 ? (
            <div className="dash-empty">
              <i className="fas fa-inbox" style={{ fontSize: '2.5rem', color: 'var(--text-secondary)', marginBottom: '12px' }}></i>
              <p>{isFreelancer ? t.no_data : t.no_jobs}</p>
              <button className="btn-dash-primary" style={{ marginTop: '16px' }}
                onClick={() => setPage(isFreelancer ? 'jobs' : 'post-job')}>
                {isFreelancer ? t.browse : t.post}
              </button>
            </div>
          ) : (
            <div className="dash-list">
              {recentItems.map((item, i) => {
                const status = item.status || 'pending';
                return (
                  <div key={i} className="dash-list-item">
                    <div className="dash-list-icon">
                      <i className={`fas ${isFreelancer ? 'fa-file-alt' : 'fa-briefcase'}`}></i>
                    </div>
                    <div className="dash-list-info">
                      <div className="dash-list-title">{item.jobId || item.title || `Item #${i + 1}`}</div>
                      <div className="dash-list-date">
                        {item.appliedAt || item.createdAt
                          ? new Date(item.appliedAt || item.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')
                          : '—'}
                      </div>
                    </div>
                    <span className="dash-status-badge"
                      style={{ background: (statusColor[status] || '#888') + '22', color: statusColor[status] || '#888', border: `1px solid ${statusColor[status] || '#888'}44` }}>
                      {statusLabel[status] || status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
