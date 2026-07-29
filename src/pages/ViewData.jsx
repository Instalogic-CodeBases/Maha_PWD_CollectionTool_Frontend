import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { usePageData } from '../lib/usePageData.js';
import { useToast } from '../context/ToastContext.jsx';
import { usePagination } from '../lib/usePagination.js';
import API from '../api/client.js';
import Modal from '../components/Modal.jsx';
import Pagination from '../components/Pagination.jsx';
import { districtsForUser } from '../lib/helpers.js';
import { CIRCLES } from '../lib/seed.js';
import { downloadViewExcel } from '../lib/excel.js';

function esc(s) {
  return (s == null ? '' : String(s)).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
// Time is not returned by the current API (only a date is stored). This reads a
// `time` value if the backend later provides one; otherwise the cell shows "—".
export function timeOf(s) { return s.time || (s.data && s.data.__time) || ''; }

// Marathi column labels for the fixed (non-dynamic) columns.
const L = { circle: 'मंडळ', district: 'जिल्हा', submittedBy: 'सादरकर्ता', date: 'दिनांक', time: 'वेळ', action: 'क्रिया' };

const EMPTY = { date: '', circle: '', dist: '', q: '' };

export default function ViewData() {
  const { currentUser, scopedSubmissions, loadSubmissions } = useApp();
  const toast = useToast();
  const isAdmin = currentUser.role === 'admin';
  const uDist = districtsForUser(currentUser);
  const { loading, error } = usePageData(() => loadSubmissions(), []);

  const [filters, setFilters] = useState(EMPTY);
  const [applied, setApplied] = useState(EMPTY);
  const [viewItem, setViewItem] = useState(null);

  if (loading) return <div className="empty">Loading…</div>;
  if (error) return <div className="notice err">{error}</div>;

  return <ViewDataInner
    isAdmin={isAdmin} uDist={uDist}
    filters={filters} setFilters={setFilters}
    applied={applied} setApplied={setApplied}
    viewItem={viewItem} setViewItem={setViewItem}
    scopedSubmissions={scopedSubmissions} loadSubmissions={loadSubmissions} toast={toast}
  />;
}

function ViewDataInner({ isAdmin, uDist, filters, setFilters, applied, setApplied, viewItem, setViewItem, scopedSubmissions, loadSubmissions, toast }) {
  const { fields } = useApp();
  const cols = fields.filter((f) => f.type !== 'district');

  const filteredSubs = () => {
    let list = scopedSubmissions();
    const { date, circle, dist, q } = applied;
    if (date) list = list.filter((s) => s.date === date);
    if (circle) list = list.filter((s) => s.circle === circle);
    if (dist) list = list.filter((s) => s.district === dist);
    if (q) { const lq = q.toLowerCase(); list = list.filter((s) => JSON.stringify(s.data).toLowerCase().includes(lq)); }
    return list;
  };

  const list = filteredSubs();
  const { page, setPage, pageCount, total, pageSize, pageRows } = usePagination(list, 10, JSON.stringify(applied));

  const apply = () => setApplied(filters);
  const clear = () => { setFilters(EMPTY); setApplied(EMPTY); };

  const del = async (id) => {
    if (!window.confirm('Delete this submission?')) return;
    try { await API.deleteSubmission(id); await loadSubmissions(); toast('Deleted'); }
    catch (err) { toast(err.message || 'Delete failed', 'err'); }
  };

  const onExcel = async () => {
    try { await downloadViewExcel(filteredSubs(), cols); toast('Excel downloaded'); }
    catch (err) { toast(err.message || 'Excel failed', 'err'); }
  };

  // PDF: landscape + wrapping so every column fits, Marathi headers, includes Time.
  const onPDF = () => {
    const l = filteredSubs();
    const w = window.open('', '_blank');
    const style = `<style>
      @page { size: A4 landscape; margin: 8mm; }
      * { box-sizing: border-box; }
      body { font-family: Arial, 'Noto Sans Devanagari', sans-serif; font-size: 8.5px; color: #1f2937; }
      h2 { margin: 0 0 4px; font-size: 14px; }
      .meta { font-size: 9px; color: #555; margin-bottom: 8px; }
      table { border-collapse: collapse; width: 100%; table-layout: fixed; }
      th, td { border: 1px solid #9aa4af; padding: 4px 5px; text-align: left; vertical-align: top;
               word-break: break-word; overflow-wrap: anywhere; white-space: normal; }
      th { background: #e9f3ee; font-weight: 700; font-size: 8.5px; }
      tr { page-break-inside: avoid; }
    </style>`;
    const head = `<th style="width:52px">${L.circle}</th><th style="width:46px">${L.district}</th>`
      + cols.map((f) => `<th>${esc(f.marathi)}</th>`).join('')
      + `<th style="width:56px">${L.submittedBy}</th><th style="width:46px">${L.date}</th><th style="width:38px">${L.time}</th>`;
    const body = l.map((s) => `<tr>`
      + `<td>${esc(s.circle)}</td><td>${esc(s.district)}</td>`
      + cols.map((f) => `<td>${esc(s.data[f.key] || '')}</td>`).join('')
      + `<td>${esc(s.submittedBy || '')}</td><td>${esc(s.date || '')}</td><td>${esc(timeOf(s) || '')}</td>`
      + `</tr>`).join('');
    const html = `<html><head><meta charset="utf-8"><title>Submissions</title>${style}</head><body>
      <h2>PWD Submissions — प्रपत्र-ब</h2>
      <div class="meta">Generated ${new Date().toLocaleString()} · ${l.length} record(s)</div>
      <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
      <script>window.onload=()=>window.print()<\/script></body></html>`;
    w.document.write(html);
    w.document.close();
  };

  const viewRows = viewItem
    ? [
        [L.circle, viewItem.circle],
        [L.district, viewItem.district],
        ...cols.map((f) => [f.marathi, viewItem.data[f.key] || '—']),
        [L.submittedBy, viewItem.submittedBy || '—'],
        [L.date, viewItem.date || '—'],
        [L.time, timeOf(viewItem) || '—'],
      ]
    : [];

  const fixedCols = 6; // मंडळ, जिल्हा, सादरकर्ता, दिनांक, वेळ, क्रिया

  return (
    <>
      <div className="toolbar">
        <div>
          {/* <h2 className="page-title">View Submitted Data</h2> */}
          <div className="page-sub">{isAdmin ? 'All submissions with Date / Circle / District filters.' : 'Your assigned districts.'}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={onExcel}>⬇️ Excel</button>
          <button className="btn" onClick={onPDF}>⬇️ PDF</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="filters">
          <div>
            <label style={{ fontSize: 11, color: 'var(--muted)' }}>Date</label><br />
            <input type="date" value={filters.date} onChange={(e) => setFilters({ ...filters, date: e.target.value })} />
          </div>
          {isAdmin && (
            <div>
              <label style={{ fontSize: 11, color: 'var(--muted)' }}>Circle</label><br />
              <select value={filters.circle} onChange={(e) => setFilters({ ...filters, circle: e.target.value })}>
                <option value="">All</option>
                {CIRCLES.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            </div>
          )}
          <div>
            <label style={{ fontSize: 11, color: 'var(--muted)' }}>District</label><br />
            <select value={filters.dist} onChange={(e) => setFilters({ ...filters, dist: e.target.value })}>
              <option value="">All</option>
              {uDist.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--muted)' }}>Search</label><br />
            <input placeholder="Search text..." value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
          </div>
          <div style={{ alignSelf: 'flex-end' }}>
            <button className="btn btn-blue btn-sm" onClick={apply}>Apply</button>{' '}
            <button className="btn btn-sm" onClick={clear}>Clear</button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{L.circle}</th><th>{L.district}</th>
                {cols.map((f) => <th key={f.id}>{f.marathi}</th>)}
                <th>{L.submittedBy}</th><th>{L.date}</th><th>{L.time}</th><th>{L.action}</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length ? pageRows.map((s) => (
                <tr key={s.id}>
                  <td>{s.circle}</td><td>{s.district}</td>
                  {cols.map((f) => <td key={f.id}>{s.data[f.key] || ''}</td>)}
                  <td>{s.submittedBy || ''}</td>
                  <td>{s.date || ''}</td>
                  <td>{timeOf(s) || '—'}</td>
                  <td>
                    <button className="icon-btn" title="View" onClick={() => setViewItem(s)}>👁️</button>
                    {isAdmin && <button className="icon-btn danger" title="Delete" onClick={() => del(s.id)}>🗑️</button>}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={cols.length + fixedCols} className="empty">No submissions yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} onChange={setPage} />
      </div>

      <Modal open={!!viewItem} title="Submission Details" onClose={() => setViewItem(null)}>
        <table>
          <tbody>
            {viewRows.map((r, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 700, width: '45%', background: 'var(--blue-lighter)' }}>{r[0]}</td>
                <td>{r[1]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Modal>
    </>
  );
}