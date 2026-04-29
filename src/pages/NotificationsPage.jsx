import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase/config';
import {
  collection, query, where, onSnapshot, orderBy,
  updateDoc, doc, getDocs, deleteDoc
} from 'firebase/firestore';

// Bell icon component with badge
export const NotificationBell = ({ lang, user, setPage }) => {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!user?.id) return;
    const q = query(
      collection(db, 'notifications'),
      where('user_id', '==', user.id),
      orderBy('created_at', 'desc')
    );
    const unsub = onSnapshot(q, snap => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unread = notifications.filter(n => !n.is_read).length;

  const markAllRead = async () => {
    const unreadNotifs = notifications.filter(n => !n.is_read);
    await Promise.all(unreadNotifs.map(n => updateDoc(doc(db, 'notifications', n.id), { is_read: true })));
  };

  const markRead = async (id) => {
    await updateDoc(doc(db, 'notifications', id), { is_read: true });
  };

  const clearAll = async () => {
    await Promise.all(notifications.map(n => deleteDoc(doc(db, 'notifications', n.id))));
    setOpen(false);
  };

  const typeIcon = { info: 'fa-info-circle', success: 'fa-check-circle', warning: 'fa-exclamation-triangle', error: 'fa-times-circle', message: 'fa-comment' };
  const typeColor = { info: '#3498db', success: '#2ecc71', warning: '#f39c12', error: '#e74c3c', message: '#9b59b6' };

  const t = lang === 'en'
    ? { title: 'Notifications', markAll: 'Mark all read', clear: 'Clear all', empty: 'No notifications yet.' }
    : { title: 'التنبيهات', markAll: 'تعليم الكل كمقروء', clear: 'مسح الكل', empty: 'لا توجد تنبيهات بعد.' };

  if (!user) return null;

  return (
    <div className="notif-bell-wrap" ref={ref}>
      <button className="notif-bell-btn" onClick={() => { setOpen(o => !o); if (!open && unread > 0) markAllRead(); }}>
        <i className="fas fa-bell"></i>
        {unread > 0 && <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="notif-dropdown">
          <div className="notif-header">
            <span className="notif-title">{t.title}</span>
            <div style={{ display: 'flex', gap: '10px' }}>
              {notifications.length > 0 && (
                <button className="notif-action-btn" onClick={clearAll}>{t.clear}</button>
              )}
            </div>
          </div>
          <div className="notif-list">
            {notifications.length === 0 ? (
              <div className="notif-empty">
                <i className="fas fa-bell-slash"></i>
                <p>{t.empty}</p>
              </div>
            ) : (
              notifications.slice(0, 15).map(n => (
                <div key={n.id}
                  className={`notif-item ${!n.is_read ? 'unread' : ''}`}
                  onClick={() => markRead(n.id)}>
                  <div className="notif-icon" style={{ background: (typeColor[n.type] || '#888') + '20', color: typeColor[n.type] || '#888' }}>
                    <i className={`fas ${typeIcon[n.type] || 'fa-bell'}`}></i>
                  </div>
                  <div className="notif-body">
                    <div className="notif-msg-title">{n.title}</div>
                    <div className="notif-msg-text">{n.message}</div>
                    <div className="notif-time">
                      {n.created_at ? new Date(n.created_at).toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }) : ''}
                    </div>
                  </div>
                  {!n.is_read && <div className="notif-dot"></div>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Standalone Notifications Page
const NotificationsPage = ({ lang, user, setPage }) => {
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const t = lang === 'en'
    ? { title: 'Notifications', subtitle: 'Stay updated with everything on NileLancers', empty: 'No notifications yet.', markAll: 'Mark all as read', clear: 'Clear all' }
    : { title: 'التنبيهات', subtitle: 'ابق على اطلاع بكل ما يحدث في نايل لانسرز', empty: 'لا توجد تنبيهات بعد.', markAll: 'تعليم الكل كمقروء', clear: 'مسح الكل' };

  const typeIcon = { info: 'fa-info-circle', success: 'fa-check-circle', warning: 'fa-exclamation-triangle', error: 'fa-times-circle', message: 'fa-comment' };
  const typeColor = { info: '#3498db', success: '#2ecc71', warning: '#f39c12', error: '#e74c3c', message: '#9b59b6' };

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    const q = query(collection(db, 'notifications'), where('user_id', '==', user.id), orderBy('created_at', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const markAll = async () => {
    await Promise.all(notifications.filter(n => !n.is_read).map(n => updateDoc(doc(db, 'notifications', n.id), { is_read: true })));
  };

  const clearAll = async () => {
    await Promise.all(notifications.map(n => deleteDoc(doc(db, 'notifications', n.id))));
  };

  return (
    <div className="page-wrapper" dir={dir}>
      <div className="container">
        <div style={{ paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px', marginBottom: '32px' }}>
          <div>
            <span className="tag" style={{ display: 'inline-flex', gap: '6px', marginBottom: '12px' }}>
              <i className="fas fa-bell"></i> {lang === 'en' ? 'Updates' : 'التحديثات'}
            </span>
            <h1 className="section-title" style={{ fontSize: '1.8rem', margin: 0 }}>{t.title}</h1>
            <p className="section-subtitle">{t.subtitle}</p>
          </div>
          {notifications.length > 0 && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-dash-outline" onClick={markAll}><i className="fas fa-check-double"></i> {t.markAll}</button>
              <button className="btn-dash-outline" style={{ color: '#e74c3c', borderColor: '#e74c3c44' }} onClick={clearAll}><i className="fas fa-trash"></i> {t.clear}</button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="loader">{lang === 'en' ? 'Loading...' : 'جاري التحميل...'}</div>
        ) : notifications.length === 0 ? (
          <div className="dash-empty" style={{ marginTop: '60px' }}>
            <i className="fas fa-bell-slash" style={{ fontSize: '3rem', color: 'var(--text-secondary)', marginBottom: '16px' }}></i>
            <p style={{ color: 'var(--text-secondary)' }}>{t.empty}</p>
          </div>
        ) : (
          <div className="notif-page-list">
            {notifications.map(n => (
              <div key={n.id} className={`notif-page-item ${!n.is_read ? 'unread' : ''}`}
                onClick={() => updateDoc(doc(db, 'notifications', n.id), { is_read: true })}>
                <div className="notif-icon" style={{ background: (typeColor[n.type] || '#888') + '20', color: typeColor[n.type] || '#888', width: '48px', height: '48px', borderRadius: '12px' }}>
                  <i className={`fas ${typeIcon[n.type] || 'fa-bell'}`}></i>
                </div>
                <div className="notif-body" style={{ flex: 1 }}>
                  <div className="notif-msg-title" style={{ fontSize: '15px' }}>{n.title}</div>
                  <div className="notif-msg-text" style={{ fontSize: '14px' }}>{n.message}</div>
                  <div className="notif-time" style={{ marginTop: '6px' }}>
                    {n.created_at ? new Date(n.created_at).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US') : ''}
                  </div>
                </div>
                {!n.is_read && <div className="notif-dot"></div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
