import React, { useState, useEffect } from 'react';
import { getJobs, getCategories } from '../firebase/db';
import JobCard from '../components/JobCard';

const JobBoard = ({ lang }) => {
  const [jobs, setJobs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const fetchedJobs = await getJobs();
      const fetchedCategories = await getCategories();
      setJobs(fetchedJobs);
      setCategories([{ id: 'all', name: 'All' }, ...fetchedCategories]);
      setLoading(false);
    };
    fetchData();
  }, []);

  const filteredJobs = selectedCategory === 'All' 
    ? jobs 
    : jobs.filter(job => job.category === selectedCategory);

  if (loading) return <div className="loader">Loading jobs...</div>;

  return (
    <div className="job-board container section">
      <div className="section-header">
        <h2 className="section-title">
          {lang === 'ar' ? 'الوظائف المتاحة' : 'Available Jobs'}
        </h2>
        <p className="section-subtitle">
          {lang === 'ar' ? 'استكشف أفضل الفرص في السوق المصري' : 'Explore the best opportunities in the Egyptian market'}
        </p>
      </div>

      <div className="filters">
        {categories.map(cat => (
          <button 
            key={cat.id} 
            className={`filter-btn ${selectedCategory === cat.name ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat.name)}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div className="jobs-grid">
        {filteredJobs.length > 0 ? (
          filteredJobs.map(job => <JobCard key={job.id} job={job} lang={lang} />)
        ) : (
          <div className="no-results">
            {lang === 'ar' ? 'لا توجد وظائف تطابق هذا التصنيف' : 'No jobs found for this category'}
          </div>
        )}
      </div>
    </div>
  );
};

export default JobBoard;
