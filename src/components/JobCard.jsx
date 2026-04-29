import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';

const JobCard = ({ job, lang, user, onApplied }) => {
  const { title, category, budget, budget_type, deadline, description, icon, color, id: jobId } = job;
  const [saved, setSaved] = useState(false);
  const [applied, setApplied] = useState(false);
  const [savingState, setSavingState] = useState('idle'); // idle | saving | done
  const [applyState, setApplyState] = useState('idle');   // idle | applying | done | error
  const [savedDocId, setSavedDocId] = useState(null);

  // Check initial state
  useEffect(() => {
    if (!user?.id || !jobId) return;
    const check = async () => {
      // Check saved
      const savedSnap = await getDocs(
        query(collection(db, 'saved_jobs'), where('userId', '==', user.id), where('jobId', '==', jobId))
      );
      if (!savedSnap.empty) {
        setSaved(true);
        setSavedDocId(savedSnap.docs[0].id);
      }
      // Check applied
      const appSnap = await getDocs(
        query(collection(db, 'applications'), where('userId', '==', user.id), where('jobId', '==', jobId))
      );
      if (!appSnap.empty) setApplied(true);
    };
    check();
  }, [user, jobId]);

  const handleSave = async () => {
    if (!user) return;
    setSavingState('saving');
    try {
      if (saved) {
        await deleteDoc(doc(db, 'saved_jobs', savedDocId));
        setSaved(false);
        setSavedDocId(null);
      } else {
        const ref = await addDoc(collection(db, 'saved_jobs'), {
          userId: user.id,
          jobId,
          savedAt: new Date().toISOString()
        });
        setSaved(true);
        setSavedDocId(ref.id);
      }
    } catch (e) { console.error(e); }
    setSavingState('idle');
  };

  const handleApply = async () => {
    if (!user || applied) return;
    setApplyState('applying');
    try {
      await addDoc(collection(db, 'applications'), {
        userId: user.id,
        jobId,
        status: 'pending',
        appliedAt: new Date().toISOString()
      });
      setApplied(true);
      setApplyState('done');
      if (onApplied) onApplied(jobId);
    } catch (e) {
      console.error(e);
      setApplyState('error');
      setTimeout(() => setApplyState('idle'), 2000);
    }
  };

  const t = lang === 'en' ? {
    apply: 'Apply Now', applied: '✓ Applied', applying: 'Applying...',
    save: 'Save', saved: 'Saved', login: 'Login to Apply',
    budget: 'Budget', deadline: 'Deadline', err: 'Error'
  } : {
    apply: 'قدم الآن', applied: '✓ تم التقديم', applying: 'جاري التقديم...',
    save: 'حفظ', saved: 'محفوظ', login: 'سجل دخول للتقديم',
    budget: 'الميزانية', deadline: 'الموعد النهائي', err: 'خطأ'
  };

  return (
    <div className="job-card premium-card">
      <div className="job-card-header">
        <div className="job-icon" style={{ backgroundColor: (color || '#888') + '20', color: color || '#888' }}>
          <i className={`fas ${icon || 'fa-briefcase'}`}></i>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="job-badge">{category}</span>
          {user && (
            <button className={`save-btn ${saved ? 'saved' : ''}`} onClick={handleSave} disabled={savingState === 'saving'}
              title={saved ? t.saved : t.save}>
              <i className={`fa${saved ? 's' : 'r'} fa-bookmark`}></i>
            </button>
          )}
        </div>
      </div>

      <div className="job-card-body">
        <h3 className="job-title">{title}</h3>
        <p className="job-description">{(description || '').substring(0, 100)}...</p>

        {job.skills?.length > 0 && (
          <div className="skills-tags" style={{ marginBottom: '10px' }}>
            {job.skills.slice(0, 3).map(s => (
              <span key={s} className="skill-tag">{s}</span>
            ))}
          </div>
        )}

        <div className="job-meta">
          <div className="meta-item">
            <i className="fas fa-money-bill-wave"></i>
            <span>{budget?.toLocaleString()} {lang === 'en' ? 'EGP' : 'جنيه'} {budget_type === 'hourly' ? (lang === 'en' ? '/hr' : '/ساعة') : ''}</span>
          </div>
          {deadline && (
            <div className="meta-item">
              <i className="fas fa-calendar-alt"></i>
              <span>{new Date(deadline).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}</span>
            </div>
          )}
        </div>
      </div>

      <div className="job-card-footer">
        {user ? (
          <button
            className={`full-width btn-primary apply-btn ${applied ? 'applied' : ''} ${applyState === 'error' ? 'error' : ''}`}
            onClick={handleApply}
            disabled={applied || applyState === 'applying'}>
            {applyState === 'applying'
              ? <><span className="spinner" style={{ borderTopColor: '#000' }}></span>{t.applying}</>
              : applyState === 'error' ? t.err
              : applied ? t.applied
              : <><i className="fas fa-paper-plane"></i> {t.apply}</>}
          </button>
        ) : (
          <button className="full-width btn-outline" style={{ color: 'var(--gold)', borderColor: 'var(--gold)' }}>
            <i className="fas fa-lock"></i> {t.login}
          </button>
        )}
      </div>
    </div>
  );
};

export default JobCard;
