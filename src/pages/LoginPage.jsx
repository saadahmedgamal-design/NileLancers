import React, { useState } from 'react';
import { loginUser } from '../firebase/auth';

const LoginPage = ({ lang, setPage, setUser }) => {
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const t = lang === 'en' ? {
    title: 'Welcome Back',
    sub: 'Login to your account.',
    email: 'Email Address',
    password: 'Password',
    forgot: 'Forgot Password?',
    btn: 'LOGIN',
    newUser: 'New to NileLancers?',
    signup: 'Sign Up',
    loggingIn: 'Logging in...'
  } : {
    title: 'مرحباً بعودتك',
    sub: 'سجل دخول إلى حسابك.',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    forgot: 'نسيت كلمة المرور؟',
    btn: 'تسجيل الدخول',
    newUser: 'جديد على نايل لانسرز؟',
    signup: 'إنشاء حساب',
    loggingIn: 'جاري الدخول...'
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !pass) {
      setError(lang === 'en' ? 'Please fill in all fields.' : 'يرجى ملء جميع الحقول.');
      return;
    }
    setLoading(true);
    setError('');
    const result = await loginUser({ email, password: pass });
    setLoading(false);
    if (result.ok) {
      setUser(result.user);
      setPage('home');
    } else {
      const msgs = {
        en: { not_found: '❌ No account found with this email.', wrong_password: '❌ Incorrect password.', unknown: '❌ Something went wrong.' },
        ar: { not_found: '❌ لا يوجد حساب بهذا البريد الإلكتروني.', wrong_password: '❌ كلمة المرور غير صحيحة.', unknown: '❌ حدث خطأ ما.' }
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
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{t.email}</label>
            <div className="input-icon-wrap">
              <i className="fas fa-envelope input-icon"></i>
              <input className="form-input" type="email" value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                placeholder="you@example.com" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">{t.password}</label>
            <div className="input-icon-wrap">
              <i className="fas fa-lock input-icon"></i>
              <input className="form-input" type="password" value={pass}
                onChange={e => { setPass(e.target.value); setError(''); }}
                placeholder="Enter password" />
            </div>
          </div>
          <span className="forgot-link" onClick={() => setPage('forgot-password')}>{t.forgot}</span>
          <button className="btn-auth btn-auth-primary" type="submit" disabled={loading}>
            {loading ? <><span className="spinner"></span>{t.loggingIn}</> : t.btn}
          </button>
        </form>
        <div className="auth-switch">
          {t.newUser}{' '}
          <span className="auth-switch-link" onClick={() => setPage('signup')}>{t.signup}</span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
