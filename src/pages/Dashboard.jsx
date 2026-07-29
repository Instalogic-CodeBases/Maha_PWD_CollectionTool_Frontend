import { useMemo } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { usePageData } from '../lib/usePageData.js';
import { districtsForUser, todayStr } from '../lib/helpers.js';
import ChartCanvas from '../components/ChartCanvas.jsx';

export default function Dashboard() {
  const { currentUser, loadSubmissions, scopedSubmissions } = useApp();
  const { loading, error } = usePageData(() => loadSubmissions(), []);

  const scoped = scopedSubmissions();
  const isAdmin = currentUser.role === 'admin';

  const totalDistricts = districtsForUser(currentUser).length;
  const totalSubmissions = scoped.length;
  const today = todayStr();
  const todaySubs = scoped.filter((s) => s.date === today).length;
  const activeSchemes = new Set(scoped.map((s) => s.data.schemeName)).size;

  const distConfig = useMemo(() => {
    const distMap = {};
    scoped.forEach((s) => { distMap[s.district] = (distMap[s.district] || 0) + 1; });
    return {
      type: 'bar',
      data: {
        labels: Object.keys(distMap),
        datasets: [{ label: 'Submissions', data: Object.values(distMap), backgroundColor: '#3f8f74', borderRadius: 6, maxBarThickness: 42 }],
      },
      options: { plugins: { legend: { display: false } }, maintainAspectRatio: false },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(scoped.map((s) => s.district))]);

  const schConfig = useMemo(() => {
    const schMap = {};
    scoped.forEach((s) => { const k = s.data.schemeName || '—'; schMap[k] = (schMap[k] || 0) + 1; });
    return {
      type: 'doughnut',
      data: {
        labels: Object.keys(schMap),
        datasets: [{
          data: Object.values(schMap),
          backgroundColor: ['#3f8f74', '#5a67a8', '#c08a3e', '#cf655c', '#4f7f8f', '#8a6fb0', '#3fa79a', '#c2763f', '#7d8aa0'],
        }],
      },
      options: { maintainAspectRatio: false },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(scoped.map((s) => s.data.schemeName || '—'))]);

  if (loading) return <div className="empty">Loading…</div>;
  if (error) return <div className="notice err">{error}</div>;

  return (
    <>
      <div className="welcome-card">
        <div className="wc-l">
          <div>Welcome, {currentUser.name} 👋</div>
          <div>{isAdmin ? 'Manage users, template, and all submissions' : 'Fill daily data or upload Excel for your assigned districts'}</div>
        </div>
        <div className="wc-r">{new Date().toLocaleDateString()}<br />Fiscal Year 2026-27</div>
      </div>

      <div className="grid cards-row" style={{ marginBottom: 16 }}>
        <div className="card"><div className="stat-top"><div><div className="stat-value">{totalSubmissions}</div><div className="stat-label">Total Submissions</div></div><div className="stat-icon">📄</div></div></div>
        <div className="card"><div className="stat-top"><div><div className="stat-value">{todaySubs}</div><div className="stat-label">Today's Submissions</div></div><div className="stat-icon">📅</div></div></div>
        <div className="card"><div className="stat-top"><div><div className="stat-value">{totalDistricts}</div><div className="stat-label">{isAdmin ? 'Total Districts' : 'Assigned Districts'}</div></div><div className="stat-icon">🗺️</div></div></div>
        <div className="card"><div className="stat-top"><div><div className="stat-value">{activeSchemes}</div><div className="stat-label">Active Schemes</div></div><div className="stat-icon">🧩</div></div></div>
      </div>

      <div className="two-col">
        <div className="card">
          <div className="section-title">Submissions by District</div>
          <div className="chart-box"><ChartCanvas config={distConfig} /></div>
        </div>
        <div className="card">
          <div className="section-title">Submissions by Scheme</div>
          <div className="chart-box"><ChartCanvas config={schConfig} /></div>
        </div>
      </div>
    </>
  );
}