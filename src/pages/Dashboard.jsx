import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { usePageData } from '../lib/usePageData.js';
import { districtsForUser, todayStr } from '../lib/helpers.js';
import API from '../api/client.js';
import ChartCanvas from '../components/ChartCanvas.jsx';
import { Icon } from '../components/Icons.jsx';

// KPI cards/graphs read the real MDR submission data (one row per work item) from
// GET /api/pwdtemplate/report-data, scoped server-side exactly like every other
// MDR endpoint: own submissions for regular users, ALL submissions for Admin/SuperAdmin.
export default function Dashboard() {
  const { currentUser } = useApp();
  const [scoped, setScoped] = useState([]);
  const { loading, error } = usePageData(async () => {
    const rows = await API.getReportData();
    setScoped(Array.isArray(rows) ? rows : []);
  }, []);
  const isAdmin = currentUser.role === 'admin';

  const totalDistricts = districtsForUser(currentUser).length;
  const totalSubmissions = scoped.length;
  const today = todayStr();
  const todaySubs = scoped.filter((s) => s.date === today).length;
  // One work is identified by its master Budget Item No. within its Head of Account.
  // The API is already scoped: admins receive all submissions; regular users receive their own.
  const totalWorks = new Set(
    scoped
      .map((s) => `${s.budgetItemNo || ''}::${s.headOfAccountId ?? ''}`)
      .filter((key) => key !== '::')
  ).size;

  const distConfig = useMemo(() => {
    const distMap = {};
    scoped.forEach((s) => { distMap[s.district] = (distMap[s.district] || 0) + 1; });
    return {
      type: 'bar',
      data: {
        labels: Object.keys(distMap),
        datasets: [{ label: 'Submissions', data: Object.values(distMap), backgroundColor: '#0f8b93', borderRadius: 6, maxBarThickness: 42 }],
      },
      options: { plugins: { legend: { display: false } }, maintainAspectRatio: false },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(scoped.map((s) => s.district))]);

  if (loading) return <div className="empty">Loading…</div>;
  if (error) return <div className="notice err">{error}</div>;

  return (
    <>
      <div className="welcome-card">
        <div className="wc-l">
          <div>Welcome, {currentUser.name}</div>
          <div>{isAdmin ? 'Manage users, template, and all submissions' : 'Fill daily data or upload Excel for your assigned districts'}</div>
        </div>
        <div className="wc-r">{new Date().toLocaleDateString()}<br />Fiscal Year 2026-27</div>
      </div>

      <div className="grid cards-row" style={{ marginBottom: 16 }}>
        <div className="card"><div className="stat-top"><div><div className="stat-value">{totalSubmissions}</div><div className="stat-label">Total Submissions</div></div><div className="stat-icon"><Icon name="file" size={21} /></div></div></div>
        <div className="card"><div className="stat-top"><div><div className="stat-value">{todaySubs}</div><div className="stat-label">Today's Submissions</div></div><div className="stat-icon"><Icon name="calendar" size={21} /></div></div></div>
        {isAdmin && (
        <div className="card"><div className="stat-top"><div><div className="stat-value">{totalDistricts}</div><div className="stat-label">Total Districts</div></div><div className="stat-icon"><Icon name="map" size={21} /></div></div></div>
        )}
        <div className="card"><div className="stat-top"><div><div className="stat-value">{totalWorks}</div><div className="stat-label">Total Works</div></div><div className="stat-icon"><Icon name="layers" size={21} /></div></div></div>
      </div>

      <div>
        <div className="card">
          <div className="section-title">Submissions by District</div>
          <div className="chart-box"><ChartCanvas config={distConfig} /></div>
        </div>
      </div>
    </>
  );
}