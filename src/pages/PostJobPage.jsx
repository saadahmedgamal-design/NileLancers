import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, getDocs } from 'firebase/firestore';

const CATEGORIES = [
  'Web Development', 'Mobile Development', 'Design', 'Marketing', 'Writing',
  'Data Science', 'Video & Animation', 'Other'
];

const PostJobPage = ({ lang, user, setPage }) => {
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const [form, setForm] = useState({
    title: '', description: '', category: '', budget: '', budget_type: 'fixed',
    deadline: '', skills: '', status: 'open'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const t = lang === 'en' ? {
    pageTitle: 'Post a New Job', subtitle: 'Find the perfect talent for your project',
    title: 'Job Title', desc: 'Job Description', category: 'Category',
    budget: 'Budget (EGP)', budgetType: 'Budget Type', fixed: 'Fixed Price', hourly: 'Hourly Rate',
    deadline: 'Deadline', skills: 'Required Skills', skillsHint: 'Separate skills with commas (e.g. React, Node.js)',
    submit: 'Post Job', submitting: 'Posting...', cancel: 'Cancel',
    successTitle: '🎉 Job Posted Successfully!', successMsg: 'Your job is now live. Freelancers can start applying.',
    viewJobs: 'View My Jobs', postAnother: 'Post Another Job',
    selectCat: 'Select a category',
    err_fields: 'Please fill in all required fields.',
    err_budget: 'Please enter a valid budget.',
    notClient: 'Only clients can post jobs.',
    goBack: 'Go Back'
  } : {
    pageTitle: 'نشر وظيفة جديدة', subtitle: 'ابحث عن الموهبة المثالية لمشروعك',
    title: 'عنوان الوظيفة', desc: 'وصف الوظيفة', category: 'التصنيف',
    budget: 'الميزانية (جنيه)', budgetType: 'نوع الميزانية', fixed: 'سعر ثابت', hourly: 'بالساعة',
    deadline: 'الموعد النهائي', skills: 'المهارات المطلوبة', skillsHint: 'افصل المهارات بفاصلة (مثل: React، Node.js)',
    submit: 'نشر الوظيفة', submitting: 'جاري النشر...', cancel: 'إلغاء',
    successTitle: '🎉 تم نشر الوظيفة بنجاح!', successMsg: 'وظيفتك الآن مرئية للمستقلين ويمكنهم التقدم إليها.',
    viewJobs: 'عرض وظائفي', postAnother: 'نشر وظيفة أخرى',
    selectCat: 'اختر تصنيفاً',
    err_fields: 'يرجى ملء جميع الحقول المطلوبة.',
    err_budget: 'يرجى إدخال ميزانية صحيحة.',
    notClient: 'فقط العملاء يمكنهم نشر الوظائف.',
    goBack: 'العودة'
  };

  // Guard: only clients
  if (user?.role !== 'client') {
    return (
      <div className="page-wrapper" dir={dir}>
        <div className="container" style={{ paddingTop: '120px', textAlign: 'center' }}>
          <i className="fas fa-lock" style={{ fontSize: '3rem', color: 'var(--text-secondary)', marginBottom: '16px' }}></i>
          <h2 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>{t.notClient}</h2>
          <button className="btn-dash-primary" style={{ marginTop: '20px' }} onClick={() => setPage('jobs')}>{t.goBack}</button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.description || !form.category || !form.deadline) {
      setError(t.err_fields); return;
    }
    if (!form.budget || isNaN(Number(form.budget))) {
      setError(t.err_budget); return;
    }
    setLoading(true);
    setError('');
    try {
      const skillsArray = form.skills.split(',').map(s => s.trim()).filter(Boolean);
      await addDoc(collection(db, 'jobs'), {
        title: form.title,
        description: form.description,
        category: form.category,
        budget: Number(form.budget),
        budget_type: form.budget_type,
        deadline: form.deadline,
        skills: skillsArray,
        status: 'open',
        postedBy: user.id,
        clientName: user.name,
        createdAt: new Date().toISOString()
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="page-wrapper" dir={dir}>
        <div className="container" style={{ paddingTop: '120px', display: 'flex', justifyContent: 'center' }}>
          <div className="post-success-card">
            <div className="success-icon"><i className="fas fa-check-circle"></i></div>
            <h2>{t.successTitle}</h2>
            <p>{t.successMsg}</p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button className="btn-dash-primary" onClick={() => setPage('dashboard')}>{t.viewJobs}</button>
              <button className="btn-dash-outline" onClick={() => { setSuccess(false); setForm({ title: '', description: '', category: '', budget: '', budget_type: 'fixed', deadline: '', skills: '', status: 'open' }); }}>
                {t.postAnother}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper" dir={dir}>
      <div className="post-job-page container">
        <div className="section-header" style={{ textAlign: dir === 'rtl' ? 'right' : 'left', paddingTop: '20px' }}>
          <span className="tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
            <i className="fas fa-plus-circle"></i> {lang === 'en' ? 'New Opportunity' : 'فرصة جديدة'}
          </span>
          <h1 className="section-title" style={{ textAlign: 'inherit', fontSize: '1.8rem' }}>{t.pageTitle}</h1>
          <p className="section-subtitle" style={{ textAlign: 'inherit' }}>{t.subtitle}</p>
        </div>

        <form className="post-job-form" onSubmit={handleSubmit}>
          {error && <div className="auth-error">{error}</div>}

          <div className="form-group">
            <label className="form-label">{t.title} *</label>
            <input className="form-input post-input" type="text" value={form.title}
              onChange={e => { set('title', e.target.value); setError(''); }}
              placeholder={lang === 'en' ? 'e.g. Full-Stack React Developer' : 'مثال: مطور React متكامل'} />
          </div>

          <div className="form-group">
            <label className="form-label">{t.desc} *</label>
            <textarea className="form-input form-textarea post-input" value={form.description}
              onChange={e => { set('description', e.target.value); setError(''); }}
              placeholder={lang === 'en' ? 'Describe the project in detail...' : 'اوصف المشروع بالتفصيل...'} rows={5} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{t.category} *</label>
              <select className="form-input post-input" value={form.category}
                onChange={e => { set('category', e.target.value); setError(''); }}>
                <option value="">{t.selectCat}</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">{t.budgetType}</label>
              <div className="budget-type-toggle">
                <button type="button" className={`budget-type-btn ${form.budget_type === 'fixed' ? 'active' : ''}`}
                  onClick={() => set('budget_type', 'fixed')}>
                  <i className="fas fa-dollar-sign"></i> {t.fixed}
                </button>
                <button type="button" className={`budget-type-btn ${form.budget_type === 'hourly' ? 'active' : ''}`}
                  onClick={() => set('budget_type', 'hourly')}>
                  <i className="fas fa-clock"></i> {t.hourly}
                </button>
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{t.budget} *</label>
              <input className="form-input post-input" type="number" min="0" value={form.budget}
                onChange={e => { set('budget', e.target.value); setError(''); }}
                placeholder="e.g. 5000" />
            </div>
            <div className="form-group">
              <label className="form-label">{t.deadline} *</label>
              <input className="form-input post-input" type="date" value={form.deadline}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => { set('deadline', e.target.value); setError(''); }} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">{t.skills}</label>
            <input className="form-input post-input" type="text" value={form.skills}
              onChange={e => set('skills', e.target.value)}
              placeholder={t.skillsHint} />
          </div>

          <div className="post-job-actions">
            <button type="submit" className="btn-dash-primary" disabled={loading}>
              {loading ? <><span className="spinner"></span>{t.submitting}</> : <><i className="fas fa-paper-plane"></i> {t.submit}</>}
            </button>
            <button type="button" className="btn-dash-outline" onClick={() => setPage('dashboard')}>{t.cancel}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PostJobPage;
