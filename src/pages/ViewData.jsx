import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { usePagination } from '../lib/usePagination.js';
import API from '../api/client.js';
import Modal from '../components/Modal.jsx';
import Pagination from '../components/Pagination.jsx';
import { Icon } from '../components/Icons.jsx';

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
);

// Key master columns to show in the PDF (kept short for readability). Entry
// columns (AD–AK) are always included.
const PDF_MASTER_HEADERS = ['Budget Item No.', 'District', 'Name of the work'];

function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = name;
  document.body.appendChild(link); link.click(); link.remove();
  URL.revokeObjectURL(url);
}
// Backend timestamps are stored in UTC. When they come back without a timezone
// designator, the browser would (incorrectly) treat them as LOCAL time — showing a
// wrong time. Treat a timezone-less value as UTC, then format in the viewer's locale.
function toLocalDate(iso) {
  if (!iso) return null;
  const hasTz = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(String(iso));
  const d = new Date(hasTz ? iso : iso + 'Z');
  return isNaN(d.getTime()) ? new Date(iso) : d;
}
function fmtDate(iso) {
  const d = toLocalDate(iso);
  if (!d) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}-${mm}-${d.getFullYear()}`;   // dd-MM-yyyy everywhere
}
// Format a saved cell for the PDF; dates -> dd-MM-yyyy.
function fmtPdfCell(header, val) {
  if (val == null || val === '') return '';
  if (/date/i.test(header)) {
    const d = toLocalDate(String(val));
    if (d && !isNaN(d.getTime())) {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      return `${dd}-${mm}-${d.getFullYear()}`;
    }
  }
  return String(val);
}
function fmtTime(iso) { const d = toLocalDate(iso); return d ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''; }
function esc(s) { return (s == null ? '' : String(s)).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

export default function ViewData() {
  const { currentUser } = useApp();
  const toast = useToast();
  const isAdmin = currentUser.role === 'admin';

  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState({ key: 'submissionDate', dir: 'desc' });
  const [editRow, setEditRow] = useState(null);
  const [busy, setBusy] = useState(false);
  const [editErrors, setEditErrors] = useState(null);
  const editFileRef = useRef(null);
  const [exporting, setExporting] = useState(false);
  const [expFrom, setExpFrom] = useState('');
  const [expTo, setExpTo] = useState('');

  // SUPER ADMIN: download the complete Excel across all circles (optional date range).
  const onExportAll = async () => {
    setExporting(true);
    try {
      const dmy = (iso) => { if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${d}-${m}-${y}`; };
      let name;
      if (expFrom && expTo) name = `MDR_AllCircles_${dmy(expFrom)}_to_${dmy(expTo)}.xlsx`;
      else if (expFrom) name = `MDR_AllCircles_from_${dmy(expFrom)}.xlsx`;
      else if (expTo) name = `MDR_AllCircles_upto_${dmy(expTo)}.xlsx`;
      else name = `MDR_AllCircles_${dmy(new Date().toISOString().slice(0, 10))}.xlsx`;
      saveBlob(await API.exportAllCircles(expFrom || undefined, expTo || undefined), name);
      toast('Exported all circles');
    } catch (err) {
      toast(err.message || 'Export failed', 'err');
    } finally {
      setExporting(false);
    }
  };

  const load = async () => {
    setLoading(true);
    try { setSubs(await API.getSubmissions() || []); }
    catch (err) { toast(err.message || 'Could not load submissions', 'err'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  // View & Download both open this submission's saved workbook (values filled).
  const openSubmissionExcel = async (id) => {
    try { saveBlob(await API.downloadSubmission(id, false), `MDR_Submission_${id}.xlsx`); toast('Opening saved submission…'); }
    catch (err) { toast(err.message || 'Download failed', 'err'); }
  };

  const onDownloadPdf = async (id) => {
    try {
      const d = await API.getSubmission(id);
      const allCols = d.columns || [];
      const cols = allCols.filter((c) => c.grouping === 'Entry' || PDF_MASTER_HEADERS.includes(c.header));
      const groups = {};
      (d.rows || []).forEach((r) => { const k = r['Head of Accounts'] || '—'; (groups[k] = groups[k] || []).push(r); });

      const style = `<style>
        @page { size: A4 landscape; margin: 10mm; }
        body { font-family: Arial, 'Noto Sans Devanagari', sans-serif; font-size: 9px; color: #1f2937; }
        h2 { font-size: 15px; margin: 0 0 2px; }
        .meta { font-size: 10px; color: #555; margin-bottom: 10px; }
        h3 { font-size: 12px; margin: 0 0 6px; color: #1f2937; border-left: 4px solid #2f6f4f; padding: 4px 8px; background: #f1f5f2; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #b7c0cc; padding: 5px 7px; text-align: left; vertical-align: top; word-break: break-word; }
        th { background: #eef2f7; font-weight: 700; }
        tbody tr:nth-child(even) { background: #fafbfc; }
        .grp { margin-bottom: 16px; page-break-inside: avoid; }
        .grp + .grp { page-break-before: always; }
      </style>`;
      const head = cols.map((c) => `<th>${esc(c.header)}${c.grouping === 'Entry' ? ' *' : ''}</th>`).join('');
      const sections = Object.entries(groups).map(([hoa, rows]) => `
        <div class="grp">
          <h3>Head of Account: ${esc(hoa)} &nbsp;·&nbsp; ${rows.length} record(s)</h3>
          <table><thead><tr>${head}</tr></thead><tbody>
          ${rows.map((r) => `<tr>${cols.map((c) => `<td>${esc(fmtPdfCell(c.header, r[c.header]))}</td>`).join('')}</tr>`).join('')}
          </tbody></table>
        </div>`).join('');
      const w = window.open('', '_blank');
      w.document.write(`<html><head><meta charset="utf-8"><title>Submission ${id}</title>${style}</head><body>
        <h2>PWD Submission #${id}</h2>
        <div class="meta">Generated ${fmtDate(new Date().toISOString())} ${fmtTime(new Date().toISOString())} &nbsp;·&nbsp; * user-entered columns</div>
        ${sections}
        <script>window.onload=()=>window.print()<\/script></body></html>`);
      w.document.close();
      toast('Preparing PDF…');
    } catch (err) { toast(err.message || 'PDF failed', 'err'); }
  };

  const startEdit = async (id) => {
    setEditRow({ id }); setEditErrors(null);
    try { saveBlob(await API.downloadSubmission(id, true, isAdmin), `MDR_Submission_${id}.xlsx`); toast('Downloaded — edit the file, then upload it here.'); }
    catch (err) { toast(err.message || 'Could not start edit', 'err'); }
  };
  const submitEdit = async (file) => {
    if (!editRow) return;
    setBusy(true); setEditErrors(null);
    try {
      const res = await API.updateSubmission(editRow.id, file);
      if (res.success) { toast(res.message || 'Updated'); setEditRow(null); await load(); }
      else { setEditErrors(res.errors || []); toast(res.message || 'Validation failed', 'err'); }
    } catch (err) { toast(err.message || 'Update failed', 'err'); }
    finally { setBusy(false); }
  };

  const lq = q.trim().toLowerCase();
  const filtered = useMemo(() => {
    let list = lq ? subs.filter((s) => [s.uploadedBy, s.pwCircle, s.status].join(' ').toLowerCase().includes(lq)) : subs.slice();
    const { key, dir } = sort;
    list.sort((a, b) => {
      let av = a[key], bv = b[key];
      if (key.includes('Date') || key.includes('On')) { av = av ? new Date(av).getTime() : 0; bv = bv ? new Date(bv).getTime() : 0; }
      if (typeof av === 'string') { av = av.toLowerCase(); bv = (bv || '').toLowerCase(); }
      if (av < bv) return dir === 'asc' ? -1 : 1;
      if (av > bv) return dir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [subs, lq, sort]);
  const { page, setPage, pageCount, total, pageSize, pageRows } = usePagination(filtered, 10, lq + sort.key + sort.dir);

  const th = (key, label) => (
    <th style={{ cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => setSort((s) => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }))}>
      {label}{sort.key === key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
    </th>
  );

  return (
    <>
      <div className="card">
        <div className="table-toolbar">
          <div className="section-title" style={{ margin: 0 }}>{isAdmin ? 'All Submissions' : 'My Submissions'}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isAdmin && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} title="Optional: export only records submitted/updated in this date range">
                <label style={{ fontSize: 12, color: '#6b5b54' }}>From</label>
                <input type="date" value={expFrom} onChange={(e) => setExpFrom(e.target.value)} style={{ padding: '5px 7px', borderRadius: 8, border: '1px solid #e0d2cc', fontSize: 12 }} />
                <label style={{ fontSize: 12, color: '#6b5b54' }}>To</label>
                <input type="date" value={expTo} onChange={(e) => setExpTo(e.target.value)} style={{ padding: '5px 7px', borderRadius: 8, border: '1px solid #e0d2cc', fontSize: 12 }} />
              </div>
            )}
            {isAdmin && (
              <button className="btn btn-blue btn-sm" onClick={onExportAll} disabled={exporting} title="Export the complete Excel across all circles" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Icon name="download" size={15} /> {exporting ? 'Exporting…' : 'Export All Circles (Excel)'}
              </button>
            )}
            <div className="search-box">
              <SearchIcon />
              <input placeholder="Search uploaded by, circle, status…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {th('submissionDate', 'Date')}
                <th>Time</th>
                {th('uploadedBy', 'Uploaded By')}
                {th('pwCircle', 'PW Circle')}
                {th('totalRecords', 'Total Records')}
                {th('status', 'Status')}
                {th('createdOn', 'Created')}
                {th('modifiedOn', 'Modified')}
                <th style={{ whiteSpace: 'nowrap' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="empty">Loading…</td></tr>
              ) : pageRows.length ? pageRows.map((s) => (
                <tr key={s.id}>
                  <td>{fmtDate(s.submissionDate)}</td>
                  <td>{fmtTime(s.submissionDate)}</td>
                  <td>{s.uploadedBy}</td>
                  <td>{s.pwCircle}</td>
                  <td>{s.totalRecords}</td>
                  <td><span className={'badge ' + (s.status === 'Updated' ? 'badge-warning' : 'badge-success')}>{s.status}</span></td>
                  <td>{fmtDate(s.createdOn)} {fmtTime(s.createdOn)}</td>
                  <td>{s.modifiedOn ? `${fmtDate(s.modifiedOn)} ${fmtTime(s.modifiedOn)}` : '—'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="icon-btn" title="Download Excel" onClick={() => openSubmissionExcel(s.id)}><Icon name="download" /></button>
                    <button className="icon-btn" title="Download PDF" onClick={() => onDownloadPdf(s.id)}><Icon name="pdf" /></button>
                    {(isAdmin || s.isOwner) && <button className="icon-btn" title={isAdmin ? 'Edit (all columns)' : 'Edit'} onClick={() => startEdit(s.id)}><Icon name="edit" /></button>}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={9} className="empty">No submissions yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} onChange={setPage} />
      </div>

      <Modal
        open={!!editRow}
        title={editRow ? `Edit Submission #${editRow.id}` : ''}
        onClose={() => setEditRow(null)}
        footer={<><button className="btn" onClick={() => setEditRow(null)}>Close</button>
          <button className="btn btn-blue" disabled={busy} onClick={() => editFileRef.current?.click()}>{busy ? 'Uploading…' : 'Upload edited file'}</button></>}
      >
        <p style={{ marginTop: 0, fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
          The workbook for this submission was downloaded automatically. Your saved rows appear first;
          the remaining works for your PW Circle are below so you can add more. Edit columns AD onwards, save the file,
          then click <b>Upload edited file</b> to update this submission.
        </p>
        <input ref={editFileRef} type="file" accept=".xlsx" style={{ display: 'none' }}
          onChange={(e) => { if (e.target.files[0]) submitEdit(e.target.files[0]); e.target.value = ''; }} />
        {editErrors && editErrors.length > 0 && (
          <div className="notice err" style={{ marginTop: 12 }}>
            <div style={{ marginBottom: 8, fontWeight: 600 }}>❌ Validation failed — nothing was saved:</div>
            <div className="table-wrap" style={{ maxHeight: 220, overflow: 'auto' }}>
              <table>
                <thead><tr><th>Sheet</th><th>Row</th><th>Column</th><th>Error</th></tr></thead>
                <tbody>{editErrors.map((er, i) => (<tr key={i}><td>{er.sheet}</td><td>{er.row}</td><td>{er.column}</td><td>{er.error}</td></tr>))}</tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}