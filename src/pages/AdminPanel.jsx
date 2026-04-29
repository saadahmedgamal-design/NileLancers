import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import {
  collection, getDocs, query, orderBy, where,
  updateDoc, deleteDoc, doc, addDoc, limit, startAfter, getCountFromServer
} from 'firebase/firestore';

const AdminPanel = ({ lang, user, setPage }) => {
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const [tab, setTab] = useState('overview');
  const [users, setUsers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState({ users: 0, jobs: 0, applications: 0, freelancers: 0, clients: 0 });
  const [loading, setLoading] = useState(true);
  const [notifForm, setNotifForm] = useState({ title: '', message: '', type: 'info', target: 'all' });
  const [sending, setSending] = useState(false);
  const [sentMsg, setSentMsg] = useState('');

  const isAdmin = user?.role === 'admin';

  const t = lang === 'en' ? {
    title: 'Admin Panel', overview: 'Overview', users_tab: 'Users',
    jobs_tab: 'Jobs', notifications_tab: 'Send Notification',
    totalUsers: 'Total Users', totalJobs: 'Total Jobs',
    totalApps: 'Applications', freelancers: 'Freelancers', clients: 'Clients',
    name: 'Name', email: 'Email', role: 'Role', joined: 'Joined',
    makeFreelancer: 'Set Freelancer', makeClient: 'Set Client', makeAdmin: 'Set Admin',
    deleteUser: 'Delete', jobTitle: 'Job Title', category: 'Category',
    budget: 'Budget', status: 'Status', posted: 'Posted',
    deleteJob: 'Delete', notifTitle: 'Notification Title', notifMsg: 'Message',
    notifType: 'Type', notifTarget: 'Target', allUsers: 'All Users',
    send: 'Send Notification', sending: 'Sending...', sent: '✅ Notification sent!',
    accessDenied: 'Access Denied — Admin only.',
    noPermission: 'You do not have permission to view this page.'
  } : {
    title: 'لوحة المسؤول', overview: 'نظرة عامة', users_tab: 'المستخدمون',
    jobs_tab: 'الوظائف', notifications_tab: 'إرسال إشعار',
    totalUsers: 'إجمالي المستخدمين', totalJobs: 'إجمالي الوظائف',
    totalApps: 'الطلبات', freelancers: 'المستقلون', clients: 'العملاء',
    name: 'الاسم', email: 'البريد', role: 'الدور', joined: 'انضم',
    makeFreelancer: 'مستقل', makeClient: 'عميل', makeAdmin: 'مسؤول',
    deleteUser: 'حذف', jobTitle: 'عنوان الوظيفة', category: 'التصنيف',
    budget: 'الميزانية', status: 'الحالة', posted: 'نُشر',
    deleteJob: 'حذف', notifTitle: 'عنوان الإشعار', notifMsg: 'الرسالة',
    notifType: 'النوع', notifTarget: 'المستهدف', allUsers: 'جميع المستخدمين',
    send: 'إرسال الإشعار', sending: 'جاري الإرسال...', sent: '✅ تم إرسال الإشعار!',
    accessDenied: 'وصول مرفوض — للمسؤولين فقط.',
    noPermission: 'ليس لديك صلاحية لعرض هذه الصفحة.'
  };

  useEffect(() => {
    if (!isAdmin) return;
    const fetchAll = async () => {
      try {
        const [usersSnap, jobsSnap, appsSnap] = await Promise.all([
          getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc'))),
          getDocs(query(collection(db, 'jobs'), orderBy('createdAt', 'desc'))),
          getDocs(collection(db, 'applications'))
        ]);
        const allUsers = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const allJobs = jobsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setUsers(allUsers);
        setJobs(allJobs);
        setStats({
          users: allUsers.length,
          jobs: allJobs.length,
          applications: appsSnap.size,
          freelancers: allUsers.filter(u => u.role === 'freelancer').length,
          clients: allUsers.filter(u => u.role === 'client').length
        });
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchAll();
  }, [isAdmin]);

  const changeRole = async (userId, role) => {
    await updateDoc(doc(db, 'users', userId), { role });
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
  };

  const deleteUser = async (userId) => {
    if (!window.confirm('Delete this user?')) return;
    await deleteDoc(doc(db, 'users', userId));
    setUsers(prev => prev.filter(u => u.id !== userId));
  };

  const deleteJob = async (jobId) => {
    if (!window.confirm('Delete this job?')) return;
    await deleteDoc(doc(db, 'jobs', jobId));
    setJobs(prev => prev.filter(j => j.id !== jobId));
  };

  const sendNotification = async () => {
    if (!notifForm.title || !notifForm.message) return;
    setSending(true);
    try {
      const targets = notifForm.target === 'all' ? users : users.filter(u => u.role === notifForm.target);
      await Promise.all(targets.map(u =>
        addDoc(collection(db, 'notifications'), {
          user_id: u.id,
          title: notifForm.title,
          message: notifForm.message,
          type: notifForm.type,
          is_read: false,
          created_at: new Date().toISOString()
        })
      ));
      setSentMsg(t.sent);
      setNotifForm({ title: '', message: '', type: 'info', target: 'all' });
      setTimeout(() => setSentMsg(''), 4000);
    } catch (e) { console.error(e); }
    setSending(false);
  };

  const roleColor = { freelancer: '#2ecc71', client: '#3498db', admin: '#e74c3c' };
  const statusColor = { open: '#3498db', in_progress: '#f39c12', completed: '#2ecc71', cancelled: '#e74c3c' };

  if (!isAdmin) {
    return (
      <div className="page-wrapper" dir={dir}>
        <div className="container" style={{ paddingTop: '120px', textAlign: 'center' }}>
          <i className="fas fa-shield-alt" style={{ fontSize: '3.5rem', color: '#e74c3c', marginBottom: '20px' }}></i>
          <h2 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>{t.accessDenied}</h2>
          <p style={{ color: 'var(--text-secondary)' }}>{t.noPermission}</p>
          <button className="btn-dash-primary" style={{ marginTop: '24px' }} onClick={() => setPage('home')}>
            {lang === 'en' ? 'Go Home' : 'الرئيسية'}
          </button>
        </div>
      </div>
    );
  }

  const tabList = [
    { id: 'overview', icon: 'fa-chart-bar', label: t.overview },
    { id: 'users', icon: 'fa-users', label: t.users_tab },
    { id: 'jobs', icon: 'fa-briefcase', label: t.jobs_tab },
    { id: 'send-notif', icon: 'fa-bell', label: t.notifications_tab },
  ];

  return (
    <div className="page-wrapper" dir={dir}>
      <div className="admin-page container">
        <div style={{ paddingTop: '20px', marginBottom: '28px' }}>
          <span className="tag" style={{ display: 'inline-flex', gap: '6px', marginBottom: '12px', background: 'rgba(231,76,60,0.12)', color: '#e74c3c', border: '1px solid rgba(231,76,60,0.3)' }}>
            <i className="fas fa-shield-alt"></i> Admin
          </span>
          <h1 className="section-title" style={{ fontSize: '1.8rem', margin: 0 }}>{t.title}</h1>
        </div>

        {/* Tabs */}
        <div className="admin-tabs">
          {tabList.map(tb => (
            <button key={tb.id} className={`admin-tab ${tab === tb.id ? 'active' : ''}`} onClick={() => setTab(tb.id)}>
              <i className={`fas ${tb.icon}`}></i> {tb.label}
            </button>
          ))}
        </div>

        {loading && tab !== 'send-notif' ? (
          <div className="loader">{lang === 'en' ? 'Loading...' : 'جاري التحميل...'}</div>
        ) : (
          <>
            {/* Overview */}
            {tab === 'overview' && (
              <div className="admin-overview">
                {[
                  { icon: 'fa-users', label: t.totalUsers, value: stats.users, color: '#3498db' },
                  { icon: 'fa-user-tie', label: t.freelancers, value: stats.freelancers, color: '#2ecc71' },
                  { icon: 'fa-briefcase', label: t.clients, value: stats.clients, color: '#9b59b6' },
                  { icon: 'fa-list-alt', label: t.totalJobs, value: stats.jobs, color: '#f39c12' },
                  { icon: 'fa-file-alt', label: t.totalApps, value: stats.applications, color: '#e74c3c' },
                ].map((s, i) => (
                  <div key={i} className="dash-stat-card">
                    <div className="dash-stat-icon" style={{ background: s.color + '20', color: s.color }}><i className={`fas ${s.icon}`}></i></div>
                    <div className="dash-stat-value">{s.value}</div>
                    <div className="dash-stat-label">{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Users Table */}
            {tab === 'users' && (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr><th>{t.name}</th><th>{t.email}</th><th>{t.role}</th><th>{t.joined}</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td>{u.name || '—'}</td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{u.email}</td>
                        <td>
                          <span style={{ background: (roleColor[u.role] || '#888') + '20', color: roleColor[u.role] || '#888', border: `1px solid ${roleColor[u.role] || '#888'}44`, borderRadius: '50px', padding: '3px 10px', fontSize: '11px', fontWeight: 700 }}>
                            {u.role}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {['freelancer', 'client', 'admin'].filter(r => r !== u.role).map(r => (
                              <button key={r} className="admin-action-btn" onClick={() => changeRole(u.id, r)} style={{ borderColor: roleColor[r] + '66', color: roleColor[r] }}>
                                {lang === 'en' ? r : { freelancer: 'مستقل', client: 'عميل', admin: 'مسؤول' }[r]}
                              </button>
                            ))}
                            <button className="admin-action-btn danger" onClick={() => deleteUser(u.id)}>
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Jobs Table */}
            {tab === 'jobs' && (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr><th>{t.jobTitle}</th><th>{t.category}</th><th>{t.budget}</th><th>{t.status}</th><th>{t.posted}</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {jobs.map(j => (
                      <tr key={j.id}>
                        <td style={{ fontWeight: 600 }}>{j.title}</td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{j.category}</td>
                        <td style={{ color: 'var(--gold)', fontWeight: 700 }}>{j.budget?.toLocaleString()} EGP</td>
                        <td>
                          <span style={{ background: (statusColor[j.status] || '#888') + '20', color: statusColor[j.status] || '#888', border: `1px solid ${statusColor[j.status] || '#888'}44`, borderRadius: '50px', padding: '3px 10px', fontSize: '11px', fontWeight: 700 }}>
                            {j.status || 'open'}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {j.createdAt ? new Date(j.createdAt).toLocaleDateString() : '—'}
                        </td>
                        <td>
                          <button className="admin-action-btn danger" onClick={() => deleteJob(j.id)}>
                            <i className="fas fa-trash"></i> {t.deleteJob}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Send Notification */}
            {tab === 'send-notif' && (
              <div className="admin-notif-form">
                {sentMsg && <div className="profile-success-banner">{sentMsg}</div>}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">{t.notifTarget}</label>
                    <select className="form-input post-input" value={notifForm.target} onChange={e => setNotifForm(f => ({ ...f, target: e.target.value }))}>
                      <option value="all">{t.allUsers}</option>
                      <option value="freelancer">{lang === 'en' ? 'Freelancers only' : 'المستقلون فقط'}</option>
                      <option value="client">{lang === 'en' ? 'Clients only' : 'العملاء فقط'}</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t.notifType}</label>
                    <select className="form-input post-input" value={notifForm.type} onChange={e => setNotifForm(f => ({ ...f, type: e.target.value }))}>
                      <option value="info">ℹ️ Info</option>
                      <option value="success">✅ Success</option>
                      <option value="warning">⚠️ Warning</option>
                      <option value="error">❌ Error</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.notifTitle}</label>
                  <input className="form-input post-input" type="text" value={notifForm.title}
                    onChange={e => setNotifForm(f => ({ ...f, title: e.target.value }))}
                    placeholder={lang === 'en' ? 'Notification title...' : 'عنوان الإشعار...'} />
                </div>
                <div className="form-group">
                  <label className="form-label">{t.notifMsg}</label>
                  <textarea className="form-input form-textarea post-input" value={notifForm.message}
                    onChange={e => setNotifForm(f => ({ ...f, message: e.target.value }))}
                    placeholder={lang === 'en' ? 'Write your message...' : 'اكتب رسالتك...'} rows={4} />
                </div>
                <button className="btn-dash-primary" onClick={sendNotification} disabled={sending || !notifForm.title || !notifForm.message}>
                  {sending ? <><span className="spinner"></span>{t.sending}</> : <><i className="fas fa-paper-plane"></i> {t.send}</>}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
