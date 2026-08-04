import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { usePageData } from '../lib/usePageData.js';
import { useToast } from '../context/ToastContext.jsx';
import { usePagination } from '../lib/usePagination.js';
import { districtsForUser, circleForDistrict } from '../lib/helpers.js';
import { CIRCLES, DISTRICT_EN, CIRCLE_EN } from '../lib/seed.js';
import { downloadReportExcel } from '../lib/excel.js';
import API from '../api/client.js';
import ChartCanvas from '../components/ChartCanvas.jsx';
import Pagination from '../components/Pagination.jsx';
import { Icon } from '../components/Icons.jsx';

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
);

const EMPTY = { circle: '', dist: '' };

// This page now reads the real MDR submission data (one row per work item) from
// GET /api/pwdtemplate/report-data, which the backend scopes exactly like every
// other MDR endpoint: own submissions for regular users, ALL submissions for
// Admin/SuperAdmin. The column keys below are fixed because the MDR report data
// always uses these exact keys.
const REPORT_COLS = [
  { key: 'schemeName', marathi: 'Scheme / Work Name' },
  { key: 'pendingAsOf', marathi: 'Pending Bills (Lakh)' },
  { key: 'physicalProgress', marathi: 'Physical Progress %' },
];

export default function Reports() {
  const { currentUser } = useApp();
  const toast = useToast();
  const isAdmin = currentUser.role === 'admin';
  const uDist = districtsForUser(currentUser);

  const [submissions, setSubmissions] = useState([]);
  const { loading, error } = usePageData(async () => {
    setSubmissions((await API.getReportData()) || []);
  }, []);

  const [filters, setFilters] = useState(EMPTY);
  const [applied, setApplied] = useState(EMPTY);
  const [q, setQ] = useState('');

  const reportScoped = () => {
    let list = submissions;
    if (applied.circle) list = list.filter((s) => s.circle === applied.circle);
    if (applied.dist) list = list.filter((s) => s.district === applied.dist);
    return list;
  };

  const list = reportScoped();

  const { byDist, progMap, progLabels, progVals } = useMemo(() => {
    const byDist = {};
    const progMap = {};
    list.forEach((s) => {
      byDist[s.district] = (byDist[s.district] || 0) + parseFloat(s.data.pendingAsOf || 0);
      if (!progMap[s.district]) progMap[s.district] = { sum: 0, n: 0 };
      progMap[s.district].sum += parseFloat(s.data.physicalProgress || 0);
      progMap[s.district].n++;
    });
    const progLabels = Object.keys(progMap);
    const progVals = progLabels.map((k) => (progMap[k].n ? progMap[k].sum / progMap[k].n : 0));
    return { byDist, progMap, progLabels, progVals };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(list.map((s) => [s.district, s.data.pendingAsOf, s.data.physicalProgress]))]);

  const rep1Config = useMemo(() => ({
    type: 'bar',
    data: { labels: Object.keys(byDist), datasets: [{ label: 'Pending (Lakhs)', data: Object.values(byDist), backgroundColor: '#cf655c', borderRadius: 6, maxBarThickness: 42 }] },
    options: { plugins: { legend: { display: false } }, maintainAspectRatio: false },
  }), [byDist]);

  const rep2Config = useMemo(() => ({
    type: 'bar',
    data: { labels: progLabels, datasets: [{ label: 'Avg %', data: progVals, backgroundColor: '#3f8f74', borderRadius: 6, maxBarThickness: 42 }] },
    options: { plugins: { legend: { display: false } }, maintainAspectRatio: false, scales: { y: { max: 100 } } },
  }), [progLabels, progVals]);

  const apply = () => setApplied(filters);

  const onDownload = async () => {
    try {
      await downloadReportExcel(reportScoped(), REPORT_COLS);
      toast('Report downloaded');
    } catch (err) { toast(err.message || 'Download failed', 'err'); }
  };

  const lq = q.trim().toLowerCase();
  const rows = progLabels
    .map((d, i) => ({ d, circle: circleForDistrict(d), n: progMap[d].n, pending: byDist[d] || 0, avg: progVals[i] }))
    .filter((r) => !lq || (r.d + ' ' + r.circle + ' ' + (DISTRICT_EN[r.d] || '') + ' ' + (CIRCLE_EN[r.circle] || '')).toLowerCase().includes(lq));
  const { page, setPage, pageCount, total, pageSize, pageRows } = usePagination(rows, 10, lq);

  if (loading) return <div className="empty">Loading…</div>;
  if (error) return <div className="notice err">{error}</div>;

  return (
    <>
      <div className="toolbar">
        <div>
          <div className="page-sub">{isAdmin ? 'All circles and districts.' : 'Your assigned districts only.'}</div>
        </div>
        <button className="btn btn-blue" onClick={onDownload}><Icon name="download" size={15} /> Download Report</button>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="filters">
          {isAdmin && (
            <div>
              <label style={{ fontSize: 11, color: 'var(--muted)' }}>Circle</label><br />
              <select value={filters.circle} onChange={(e) => setFilters({ ...filters, circle: e.target.value })}>
                <option value="">All</option>
                {CIRCLES.map((x) => <option key={x} value={x}>{CIRCLE_EN[x] || x}</option>)}
              </select>
            </div>
          )}
          <div>
            <label style={{ fontSize: 11, color: 'var(--muted)' }}>District</label><br />
            <select value={filters.dist} onChange={(e) => setFilters({ ...filters, dist: e.target.value })}>
              <option value="">All</option>
              {uDist.map((d) => <option key={d} value={d}>{DISTRICT_EN[d] || d}</option>)}
            </select>
          </div>
          <div style={{ alignSelf: 'flex-end' }}>
            <button className="btn btn-blue btn-sm" onClick={apply}>Apply</button>
          </div>
        </div>
      </div>

      <div className="two-col">
        <div className="card">
          <div className="section-title">Pending Bills by District (Lakhs)</div>
          <div className="chart-box"><ChartCanvas config={rep1Config} /></div>
        </div>
        <div className="card">
          <div className="section-title">Physical Progress % (avg)</div>
          <div className="chart-box"><ChartCanvas config={rep2Config} /></div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="table-toolbar">
          <div className="section-title" style={{ margin: 0 }}>Summary Table</div>
          <div className="search-box">
            <SearchIcon />
            <input placeholder="Search district or circle…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>District</th><th>Circle</th><th># Works</th><th>Pending (Lakhs)</th><th>Avg Progress %</th></tr></thead>
            <tbody>
              {pageRows.length ? pageRows.map((r) => (
                <tr key={r.d}>
                  <td>{DISTRICT_EN[r.d] || r.d}</td>
                  <td>{CIRCLE_EN[r.circle] || r.circle}</td>
                  <td>{r.n}</td>
                  <td>{r.pending.toFixed(2)}</td>
                  <td>{r.avg.toFixed(1)}</td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="empty">No data.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} onChange={setPage} />
      </div>
    </>
  );
}