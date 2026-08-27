import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { usePageData } from '../lib/usePageData.js';
import { useToast } from '../context/ToastContext.jsx';
import { usePagination } from '../lib/usePagination.js';
import { districtsForUser, circleForDistrict } from '../lib/helpers.js';
import { CIRCLES, DISTRICT_ROWS, DISTRICT_EN, CIRCLE_EN } from '../lib/seed.js';
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
    const rows = await API.getReportData();
    setSubmissions(Array.isArray(rows) ? rows : []);
  }, []);

  const [filters, setFilters] = useState(EMPTY);
  const [applied, setApplied] = useState(EMPTY);
  const [q, setQ] = useState('');

  // Normalize so the dropdown value matches the data regardless of language
  // (Marathi vs English) or stray whitespace/case. This is the root-cause fix
  // for the Admin filter: the report data's circle/district strings did not
  // always byte-match the dropdown option values, so equality filtering silently
  // returned nothing. We compare on a normalized key and also accept the English
  // alias for each Marathi name.
  const norm = (v) => String(v || '').trim().toLowerCase();
  const circleMatches = (dataCircle, picked) => {
    if (!picked) return true;
    const n = norm(dataCircle);
    return n === norm(picked) || n === norm(CIRCLE_EN[picked] || '');
  };
  const distMatches = (dataDist, picked) => {
    if (!picked) return true;
    const n = norm(dataDist);
    return n === norm(picked) || n === norm(DISTRICT_EN[picked] || '');
  };

  // One physical work can appear on multiple uploads and all four sheets.
  // Keep the latest report row for each Budget Item No. so Reports uses the
  // same filled physical-work population as the Dashboard.
  const filledWorks = useMemo(() => {
    const latest = new Map();
    submissions.forEach((s) => {
      const key = String(s.budgetItemNo || '').trim();
      if (!key) return;
      const previous = latest.get(key);
      if (!previous || Number(s.id || 0) >= Number(previous.id || 0)) latest.set(key, s);
    });
    return Array.from(latest.values());
  }, [submissions]);

  const reportScoped = () => {
    let list = filledWorks;
    if (applied.circle) list = list.filter((s) => circleMatches(s.circle, applied.circle));
    if (applied.dist) list = list.filter((s) => distMatches(s.district, applied.dist));
    return list;
  };

  const list = reportScoped();
  const districtOptions = filters.circle
    ? DISTRICT_ROWS.filter(([district, circle]) => circleMatches(circle, filters.circle) && uDist.includes(district)).map(([district]) => district)
    : uDist;

  // If a selected circle has exactly one assigned district, select it directly.
  // Keep the All option for every circle and keep multiple districts unselected.
  useEffect(() => {
    if (!filters.circle || districtOptions.length !== 1 || filters.dist === districtOptions[0]) return;
    setFilters((prev) => ({ ...prev, dist: districtOptions[0] }));
  }, [filters.circle, filters.dist, districtOptions.join('|')]);

  const { byDist, progMap, progLabels, progVals, circleByDist } = useMemo(() => {
    const byDist = {};
    const progMap = {};
    // Root-cause fix (Summary Table circle): the real PW Circle for each district
    // comes from the submission data itself (s.circle = PwCircle.Name from the DB,
    // which reflects the latest PW-Circle mapping). The old code re-derived the
    // circle from a hardcoded frontend map, so after remapping it showed blank or
    // wrong circles. We now record the actual circle seen in the data per district.
    const circleByDist = {};
    list.forEach((s) => {
      byDist[s.district] = (byDist[s.district] || 0) + parseFloat(s.data.pendingAsOf || 0);
      if (!progMap[s.district]) progMap[s.district] = { workCount: 0, progressSum: 0, progressCount: 0 };
      // # Works counts every filled work. Average Progress must use only
      // works whose Physical Progress cell contains a numeric value.
      progMap[s.district].workCount++;
      const rawProgress = String(s.data?.physicalProgress ?? '').trim();
      const progress = Number(rawProgress);
      if (rawProgress !== '' && Number.isFinite(progress)) {
        progMap[s.district].progressSum += progress;
        progMap[s.district].progressCount++;
      }
      if (s.circle && !circleByDist[s.district]) circleByDist[s.district] = s.circle;
    });
    const progLabels = Object.keys(progMap);
    const progVals = progLabels.map((k) => (progMap[k].progressCount ? progMap[k].progressSum / progMap[k].progressCount : 0));
    return { byDist, progMap, progLabels, progVals, circleByDist };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(list.map((s) => [s.district, s.circle, s.budgetItemNo, s.data.pendingAsOf, s.data.physicalProgress, s.id]))]);

  const rep1Config = useMemo(() => ({
    type: 'bar',
    data: { labels: Object.keys(byDist), datasets: [{ label: 'Pending (Lakhs) — filled works', data: Object.values(byDist), backgroundColor: '#cf655c', borderRadius: 6, maxBarThickness: 42 }] },
    options: { plugins: { legend: { display: false } }, maintainAspectRatio: false },
  }), [byDist]);

  const rep2Config = useMemo(() => ({
    type: 'bar',
    data: { labels: progLabels, datasets: [{ label: 'Avg % — filled works', data: progVals, backgroundColor: '#3f8f74', borderRadius: 6, maxBarThickness: 42 }] },
    options: { plugins: { legend: { display: false } }, maintainAspectRatio: false, scales: { y: { max: 100 } } },
  }), [progLabels, progVals]);

  const apply = () => setApplied(filters);

  const onDownload = async () => {
    try {
      await downloadReportExcel(list, REPORT_COLS);
      toast('Report downloaded');
    } catch (err) { toast(err.message || 'Download failed', 'err'); }
  };

  const lq = q.trim().toLowerCase();
  const rows = progLabels
    .map((d, i) => ({ d, circle: circleByDist[d] || circleForDistrict(d), n: progMap[d].workCount, pending: byDist[d] || 0, avg: progVals[i] }))
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

      {isAdmin && (
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="filters">
          {isAdmin && (
            <div>
              <label style={{ fontSize: 11, color: 'var(--muted)' }}>Circle</label><br />
                <select value={filters.circle} onChange={(e) => setFilters({ circle: e.target.value, dist: '' })}>
                <option value="">All</option>
                {CIRCLES.map((x) => <option key={x} value={x}>{CIRCLE_EN[x] || x}</option>)}
              </select>
            </div>
          )}
              {isAdmin && (
            <div>
              <label style={{ fontSize: 11, color: 'var(--muted)' }}>District</label><br />
              <select value={filters.dist} onChange={(e) => setFilters({ ...filters, dist: e.target.value })}>
                <option value="">All</option>
                {districtOptions.map((d) => <option key={d} value={d}>{DISTRICT_EN[d] || d}</option>)}
              </select>
            </div>
          )}
          <div style={{ alignSelf: 'flex-end' }}>
            <button className="btn btn-blue btn-sm" onClick={apply}>Apply</button>
          </div>
        </div>
      </div>
      )}

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