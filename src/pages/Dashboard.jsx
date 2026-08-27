import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { usePageData } from '../lib/usePageData.js';
import { districtsForUser } from '../lib/helpers.js';
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
  const workRows = useMemo(() => {
    // The same physical work is repeated on each of the four Head-of-Account
    // sheets. Identify it by Budget Item No. only so the KPI counts one work once.
    const byWork = new Map();
    scoped.forEach((s) => {
      const key = String(s.budgetItemNo || '').trim();
      if (key) byWork.set(key, s);
    });
    return Array.from(byWork.values());
  }, [scoped]);
  const totalWorks = workRows.length;
  // A completed work means the saved row contains user-entered data in AD..AK.
  // Do not compare Physical Progress or Works status values; those are report data,
  // not the completion rule for this KPI.
  const completedWorks = workRows.filter((s) => s.isCompleted === true).length;
  const pendingWorks = Math.max(totalWorks - completedWorks, 0);
  const filledDistricts = new Set(scoped.map((s) => s.district).filter(Boolean)).size;

  const distConfig = useMemo(() => {
    const distMap = {};
    // Use the exact same unique filled-work set as Total Works. This prevents
    // repeated submissions or repeated sheet rows from inflating the chart.
    workRows.forEach((s) => { distMap[s.district] = (distMap[s.district] || 0) + 1; });
    return {
      type: 'bar',
      data: {
        labels: Object.keys(distMap),
        datasets: [{ label: 'Filled works', data: Object.values(distMap), backgroundColor: '#0f8b93', borderRadius: 6, maxBarThickness: 42 }],
      },
      options: { plugins: { legend: { display: false } }, maintainAspectRatio: false },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workRows]);

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
        {isAdmin && (
          <div className="card"><div className="stat-top"><div><div className="stat-value">{filledDistricts}<span className="stat-denom">/{totalDistricts}</span></div><div className="stat-label">Districts with Data</div></div><div className="stat-icon"><Icon name="map" size={21} /></div></div></div>
        )}
        <div className="card"><div className="stat-top"><div><div className="stat-value">{totalWorks}</div><div className="stat-label">Total Works</div></div><div className="stat-icon"><Icon name="layers" size={21} /></div></div></div>
        <div className="card"><div className="stat-top"><div><div className="stat-value">{completedWorks}</div><div className="stat-label">Total Filled Records</div></div><div className="stat-icon stat-icon-success"><Icon name="check" size={21} /></div></div></div>
        <div className="card"><div className="stat-top"><div><div className="stat-value">{pendingWorks}</div><div className="stat-label">Works Yet to Be Filled</div></div><div className="stat-icon stat-icon-warning"><Icon name="calendar" size={21} /></div></div></div>
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