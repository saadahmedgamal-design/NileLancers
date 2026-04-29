import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { doc, updateDoc } from 'firebase/firestore';

const ProfilePage = ({ lang, user, setUser }) => {
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    bio: user?.bio || '',
    phone: user?.phone || '',
    location: user?.location || '',
    yearsOfExperience: user?.yearsOfExperience || '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.id), { ...form });
      setUser(u => ({ ...u, ...form }));
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const t = lang === 'en' ? {
    profile: 'My Profile', editProfile: 'Edit Profile', save: 'Save Changes', saving: 'Saving...',
    cancel: 'Cancel', name: 'Full Name', bio: 'Bio', phone: 'Phone', location: 'Location',
    experience: 'Years of Experience', role: 'Account Type', memberSince: 'Member Since',
    savedMsg: '✅ Profile saved successfully!', freelancer: 'Freelancer', client: 'Client', admin: 'Admin'
  } : {
    profile: 'ملفي الشخصي', editProfile: 'تعديل الملف', save: 'حفظ التغييرات', saving: 'جاري الحفظ...',
    cancel: 'إلغاء', name: 'الاسم الكامل', bio: 'نبذة عني', phone: 'الهاتف', location: 'الموقع',
    experience: 'سنوات الخبرة', role: 'نوع الحساب', memberSince: 'عضو منذ',
    savedMsg: '✅ تم حفظ الملف بنجاح!', freelancer: 'مستقل', client: 'عميل', admin: 'مسؤول'
  };

  const roleLabel = { freelancer: t.freelancer, client: t.client, admin: t.admin };
  const roleColor = { freelancer: '#2ecc71', client: '#3498db', admin: '#e74c3c' };
  const joinDate = user?.createdAt ? new Date(user.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'long' }) : '—';

  return (
    <div className="page-wrapper" dir={dir}>
      <div className="profile-page container">
        {/* Header Card */}
        <div className="profile-header-card">
          <div className="profile-avatar-large">
            {(user?.name?.[0] || 'U').toUpperCase()}
          </div>
          <div className="profile-header-info">
            <h1 className="profile-name">{user?.name || '—'}</h1>
            <p className="profile-username">@{user?.username || user?.email?.split('@')[0] || '—'}</p>
            <div className="profile-meta-row">
              <span className="profile-role-badge" style={{ background: (roleColor[user?.role] || '#888') + '22', color: roleColor[user?.role] || '#888', border: `1px solid ${roleColor[user?.role] || '#888'}44` }}>
                {roleLabel[user?.role] || user?.role}
              </span>
              <span className="profile-meta-item"><i className="fas fa-calendar-alt"></i> {t.memberSince}: {joinDate}</span>
              {user?.location && <span className="profile-meta-item"><i className="fas fa-map-marker-alt"></i> {user.location}</span>}
            </div>
          </div>
          {!editing && (
            <button className="btn-edit-profile" onClick={() => setEditing(true)}>
              <i className="fas fa-pen"></i> {t.editProfile}
            </button>
          )}
        </div>

        {saved && <div className="profile-success-banner">{t.savedMsg}</div>}

        {/* Edit Form */}
        {editing ? (
          <div className="profile-edit-card">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">{t.name}</label>
                <input className="form-input" style={{ paddingLeft: '14px' }} type="text" value={form.name}
                  onChange={e => set('name', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">{t.phone}</label>
                <input className="form-input" style={{ paddingLeft: '14px' }} type="text" value={form.phone}
                  onChange={e => set('phone', e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">{t.location}</label>
                <input className="form-input" style={{ paddingLeft: '14px' }} type="text" value={form.location}
                  onChange={e => set('location', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">{t.experience}</label>
                <input className="form-input" style={{ paddingLeft: '14px' }} type="number" min="0" max="50" value={form.yearsOfExperience}
                  onChange={e => set('yearsOfExperience', e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">{t.bio}</label>
              <textarea className="form-input form-textarea" value={form.bio}
                onChange={e => set('bio', e.target.value)}
                placeholder={lang === 'en' ? 'Tell clients about yourself...' : 'أخبر العملاء عن نفسك...'} />
            </div>
            <div className="edit-actions">
              <button className="btn-auth btn-auth-primary" style={{ maxWidth: '180px' }} onClick={handleSave} disabled={saving}>
                {saving ? <><span className="spinner"></span>{t.saving}</> : t.save}
              </button>
              <button className="btn-cancel-edit" onClick={() => setEditing(false)}>{t.cancel}</button>
            </div>
          </div>
        ) : (
          /* Info Display */
          <div className="profile-info-grid">
            {[
              { icon: 'fa-envelope', label: lang === 'en' ? 'Email' : 'البريد', value: user?.email },
              { icon: 'fa-phone', label: t.phone, value: user?.phone || (lang === 'en' ? 'Not set' : 'غير محدد') },
              { icon: 'fa-map-marker-alt', label: t.location, value: user?.location || (lang === 'en' ? 'Not set' : 'غير محدد') },
              { icon: 'fa-briefcase', label: t.experience, value: user?.yearsOfExperience ? `${user.yearsOfExperience} ${lang === 'en' ? 'years' : 'سنوات'}` : (lang === 'en' ? 'Not set' : 'غير محدد') },
            ].map((item, i) => (
              <div key={i} className="profile-info-card">
                <div className="profile-info-icon"><i className={`fas ${item.icon}`}></i></div>
                <div>
                  <div className="profile-info-label">{item.label}</div>
                  <div className="profile-info-value">{item.value || '—'}</div>
                </div>
              </div>
            ))}
            {user?.bio && (
              <div className="profile-bio-card">
                <div className="profile-info-label">{t.bio}</div>
                <p className="profile-bio-text">{user.bio}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
