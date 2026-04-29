import React, { useState } from 'react';
import { registerUser } from '../firebase/auth';

const SignupPage = ({ lang, setPage, setUser }) => {
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const [form, setForm] = useState({
    name: '', username: '', email: '', password: '',
    role: 'freelancer', phone: '', location: '', bio: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const t = lang === 'en' ? {
    title: 'Join NileLancers', sub: 'Create your account.',
    name: 'Full Name', username: 'Username', email: 'Email Address',
    password: 'Password', role: 'Account Type',
    freelancer: 'I want to Work', client: 'I want to Hire',
    btn: 'CREATE ACCOUNT', existing: 'Already have an account?',
    login: 'Login', creating: 'Creating account...'
  } : {
    title: 'انضم إلى نايل لانسرز', sub: 'أنشئ حسابك الجديد.',
    name: 'الاسم بالكامل', username: 'اسم المستخدم', email: 'البريد الإلكتروني',
    password: 'كلمة المرور', role: 'نوع الحساب',
    freelancer: 'أريد أن أعمل', client: 'أريد أن أوظف',
    btn: 'إنشاء حساب', existing: 'لديك حساب بالفعل؟',
    login: 'تسجيل الدخول', creating: 'جاري إنشاء الحساب...'
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { name, username, email, password } = form;
    if (!name || !username || !email || !password) {
      setError(lang === 'en' ? 'Please fill in all required fields.' : 'يرجى ملء جميع الحقول المطلوبة.');
      return;
    }
    if (password.length < 6) {
      setError(lang === 'en' ? 'Password must be at least 6 characters.' : 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.');
      return;
    }
    setLoading(true);
    setError('');
    const result = await registerUser(form);
    setLoading(false);
    if (result.ok) {
      setUser(result.user);
      setPage('home');
    } else {
      const msgs = {
        en: { email_taken: '❌ This email is already registered.', weak_password: '❌ Password too weak.', unknown: '❌ Registration failed.' },
        ar: { email_taken: '❌ هذا البريد الإلكتروني مسجل بالفعل.', weak_password: '❌ كلمة المرور ضعيفة جداً.', unknown: '❌ فشل التسجيل.' }
      };
      setError(msgs[lang][result.error] || msgs[lang].unknown);
    }
  };

  return (
    <div className="auth-page" dir={dir}>
      <div className="auth-card">
        <div className="auth-logo"><span>NileLancers</span></div>
        <div className="auth-header">
          <h2>{t.title}</h2>
          <p>{t.sub}</p>
        </div>

        {/* Role Selector */}
        <div className="role-selector">
          <div className={`role-card ${form.role === 'freelancer' ? 'active' : ''}`} onClick={() => set('role', 'freelancer')}>
            <i className="fas fa-laptop-code"></i>
            <span>{t.freelancer}</span>
          </div>
          <div className={`role-card ${form.role === 'client' ? 'active' : ''}`} onClick={() => set('role', 'client')}>
            <i className="fas fa-briefcase"></i>
            <span>{t.client}</span>
          </div>
        </div>

        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{t.name}</label>
              <div className="input-icon-wrap">
                <i className="fas fa-user input-icon"></i>
                <input className="form-input" type="text" value={form.name}
                  onChange={e => { set('name', e.target.value); setError(''); }}
                  placeholder={lang === 'en' ? 'Your full name' : 'اسمك الكامل'} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">{t.username}</label>
              <div className="input-icon-wrap">
                <i className="fas fa-at input-icon"></i>
                <input className="form-input" type="text" value={form.username}
                  onChange={e => { set('username', e.target.value.toLowerCase()); setError(''); }}
                  placeholder="username" />
              </div>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">{t.email}</label>
            <div className="input-icon-wrap">
              <i className="fas fa-envelope input-icon"></i>
              <input className="form-input" type="email" value={form.email}
                onChange={e => { set('email', e.target.value); setError(''); }}
                placeholder="you@example.com" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">{t.password}</label>
            <div className="input-icon-wrap">
              <i className="fas fa-lock input-icon"></i>
              <input className="form-input" type="password" value={form.password}
                onChange={e => { set('password', e.target.value); setError(''); }}
                placeholder={lang === 'en' ? 'Min. 6 characters' : '6 أحرف على الأقل'} />
            </div>
          </div>
          <button className="btn-auth btn-auth-primary" type="submit" disabled={loading}>
            {loading ? <><span className="spinner"></span>{t.creating}</> : t.btn}
          </button>
        </form>
        <div className="auth-switch">
          {t.existing}{' '}
          <span className="auth-switch-link" onClick={() => setPage('login')}>{t.login}</span>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
