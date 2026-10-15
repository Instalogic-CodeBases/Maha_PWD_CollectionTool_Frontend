import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { usePagination } from '../lib/usePagination.js';
import API from '../api/client.js';
import Modal from '../components/Modal.jsx';
import Pagination from '../components/Pagination.jsx';
import { Icon } from '../components/Icons.jsx';
import { CIRCLES, CIRCLE_EN } from '../lib/seed.js';

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

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
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function fmtTime(iso) {
  const d = toLocalDate(iso);
  return d ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
}

export default function SoftLoanViewData() {
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
  const [expCircle, setExpCircle] = useState('');

  // SUPER ADMIN: download the complete Soft Loan Excel across all circles (optional date range & circle).
  const onExportAll = async () => {
    setExporting(true);
    try {
      const dmy = (iso) => { if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${d}-${m}-${y}`; };
      let name;
      const circleLabel = expCircle ? `_${(CIRCLE_EN[expCircle] || expCircle).replace(/[^a-z0-9]+/gi, '_')}` : '_AllCircles';
      if (expFrom && expTo) name = `SoftLoan${circleLabel}_${dmy(expFrom)}_to_${dmy(expTo)}.xlsx`;
      else if (expFrom) name = `SoftLoan${circleLabel}_from_${dmy(expFrom)}.xlsx`;
      else if (expTo) name = `SoftLoan${circleLabel}_upto_${dmy(expTo)}.xlsx`;
      else name = `SoftLoan${circleLabel}_${dmy(new Date().toISOString().slice(0, 10))}.xlsx`;

      const selectedStoredCircle = expCircle
        ? (subs.find((s) => {
            const stored = String(s.pwCircle || '').trim().toLowerCase();
            return stored === expCircle.trim().toLowerCase()
              || stored === String(CIRCLE_EN[expCircle] || '').trim().toLowerCase();
          })?.pwCircle || CIRCLE_EN[expCircle] || expCircle)
        : undefined;

      const blob = await API.exportAllSoftLoan(expFrom || undefined, expTo || undefined, selectedStoredCircle);
      saveBlob(blob, name);
      toast(expCircle ? `Exported ${CIRCLE_EN[expCircle] || expCircle}` : 'Exported all soft loan submissions');
    } catch (err) {
      toast(err.message || 'Export failed', 'err');
    } finally {
      setExporting(false);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = await API.getSoftLoanSubmissions();
      setSubs(data || []);
    } catch (err) {
      toast(err.message || 'Could not load soft loan submissions', 'err');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openSubmissionExcel = async (id) => {
    try {
      const blob = await API.downloadSoftLoanSubmission(id);
      saveBlob(blob, `SoftLoan_Submission_${id}.xlsx`);
      toast('Downloading saved Soft Loan submission…');
    } catch (err) {
      toast(err.message || 'Download failed', 'err');
    }
  };

  const startEdit = async (id) => {
    setEditRow({ id });
    setEditErrors(null);
    try {
      const blob = await API.downloadSoftLoanSubmission(id);
      saveBlob(blob, `SoftLoan_Submission_${id}.xlsx`);
      toast('Downloaded — edit the file, then upload it here.');
    } catch (err) {
      toast(err.message || 'Could not start edit', 'err');
    }
  };

  const submitEdit = async (file) => {
    if (!editRow) return;
    setBusy(true);
    setEditErrors(null);
    try {
      const res = await API.updateSoftLoanSubmission(editRow.id, file);
      if (res.success) {
        toast(res.message || 'Updated successfully');
        setEditRow(null);
        await load();
      } else {
        setEditErrors(res.errors || []);
        toast(res.message || 'Validation failed', 'err');
      }
    } catch (err) {
      toast(err.message || 'Update failed', 'err');
    } finally {
      setBusy(false);
    }
  };

  const lq = q.trim().toLowerCase();
  const filtered = useMemo(() => {
    let list = lq
      ? subs.filter((s) =>
          [s.uploadedBy, s.pwCircle, s.status, s.lastUpdatedBy].join(' ').toLowerCase().includes(lq)
        )
      : subs.slice();

    const { key, dir } = sort;
    list.sort((a, b) => {
      let av = a[key], bv = b[key];
      if (key.includes('Date') || key.includes('On')) {
        av = av ? new Date(av).getTime() : 0;
        bv = bv ? new Date(bv).getTime() : 0;
      }
      if (typeof av === 'string') {
        av = av.toLowerCase();
        bv = (bv || '').toLowerCase();
      }
      if (av < bv) return dir === 'asc' ? -1 : 1;
      if (av > bv) return dir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [subs, lq, sort]);

  const { page, setPage, pageCount, total, pageSize, pageRows } = usePagination(
    filtered,
    10,
    lq + sort.key + sort.dir
  );

  const th = (key, label) => (
    <th
      style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
      onClick={() =>
        setSort((s) => ({
          key,
          dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc'
        }))
      }
    >
      {label}
      {sort.key === key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
    </th>
  );

  return (
    <>
      <div className="card">
        <div className="table-toolbar">
          <div className="section-title" style={{ margin: 0 }}>
            {isAdmin ? 'All Soft Loan Submissions' : 'My Soft Loan Submissions'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isAdmin && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} title="Optional: export all circles or one selected circle, with an optional date range">
                <label style={{ fontSize: 12, color: '#6b5b54' }}>Circle</label>
                <select value={expCircle} onChange={(e) => setExpCircle(e.target.value)} style={{ padding: '5px 7px', borderRadius: 8, border: '1px solid #e0d2cc', fontSize: 12 }}>
                  <option value="">All</option>
                  {CIRCLES.map((circle) => <option key={circle} value={circle}>{CIRCLE_EN[circle] || circle}</option>)}
                </select>
                <label style={{ fontSize: 12, color: '#6b5b54' }}>From</label>
                <input type="date" min="1900-01-01" value={expFrom} onChange={(e) => setExpFrom(e.target.value)} style={{ padding: '5px 7px', borderRadius: 8, border: '1px solid #e0d2cc', fontSize: 12 }} />
                <label style={{ fontSize: 12, color: '#6b5b54' }}>To</label>
                <input type="date" min="1900-01-01" value={expTo} onChange={(e) => setExpTo(e.target.value)} style={{ padding: '5px 7px', borderRadius: 8, border: '1px solid #e0d2cc', fontSize: 12 }} />
              </div>
            )}
            {isAdmin && (
              <button className="btn btn-blue btn-sm" onClick={onExportAll} disabled={exporting} title="Export the complete Soft Loan Excel across all circles" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Icon name="download" size={15} /> {exporting ? 'Exporting…' : expCircle ? 'Export Selected Circle (Excel)' : 'Export All (Excel)'}
              </button>
            )}
            <div className="search-box">
              <SearchIcon />
              <input
                placeholder="Search uploaded by, circle, status…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
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
                {th('modifiedOn', 'Last Updated Date')}
                {th('lastUpdatedBy', 'Last Updated By')}
                <th style={{ whiteSpace: 'nowrap' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="empty">
                    Loading…
                  </td>
                </tr>
              ) : pageRows.length ? (
                pageRows.map((s) => (
                  <tr key={s.id}>
                    <td>{fmtDate(s.submissionDate)}</td>
                    <td>{fmtTime(s.submissionDate)}</td>
                    <td>{s.uploadedBy}</td>
                    <td>{s.pwCircle}</td>
                    <td>{s.totalRecords}</td>
                    <td>
                      <span
                        className={
                          'badge ' +
                          (s.status === 'Updated' ? 'badge-warning' : 'badge-success')
                        }
                      >
                        {s.status}
                      </span>
                    </td>
                    <td>
                      {fmtDate(s.createdOn)} {fmtTime(s.createdOn)}
                    </td>
                    <td>
                      {s.modifiedOn ? `${fmtDate(s.modifiedOn)} ${fmtTime(s.modifiedOn)}` : '—'}
                    </td>
                    <td>{s.lastUpdatedBy || '—'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button
                        className="icon-btn"
                        title="Download Excel"
                        onClick={() => openSubmissionExcel(s.id)}
                      >
                        <Icon name="download" />
                      </button>
                      {(isAdmin || s.isOwner) && (
                        <button
                          className="icon-btn"
                          title="Edit & Re-upload"
                          onClick={() => startEdit(s.id)}
                        >
                          <Icon name="edit" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="empty">
                    No soft loan submissions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          page={page}
          pageCount={pageCount}
          total={total}
          pageSize={pageSize}
          onChange={setPage}
        />
      </div>

      <Modal
        open={!!editRow}
        title={editRow ? `Edit Soft Loan Submission #${editRow.id}` : ''}
        onClose={() => setEditRow(null)}
        footer={
          <>
            <button className="btn" onClick={() => setEditRow(null)}>
              Close
            </button>
            <button
              className="btn btn-blue"
              disabled={busy}
              onClick={() => editFileRef.current?.click()}
            >
              {busy ? 'Uploading…' : 'Upload edited file'}
            </button>
          </>
        }
      >
        <p style={{ marginTop: 0, fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
          The workbook for this Soft Loan submission was downloaded automatically with your saved data populated.
          Update Date of Completion, Physical Progress (%), or Financial Progress (Crore) across any sheet, save the file,
          then click <b>Upload edited file</b> to update this submission.
        </p>
        <input
          ref={editFileRef}
          type="file"
          accept=".xlsx"
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files[0]) submitEdit(e.target.files[0]);
            e.target.value = '';
          }}
        />
        {editErrors && editErrors.length > 0 && (
          <div className="notice err" style={{ marginTop: 12 }}>
            <div style={{ marginBottom: 8, fontWeight: 600 }}>
              ❌ Validation failed — nothing was saved:
            </div>
            <div className="table-wrap" style={{ maxHeight: 220, overflow: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Sheet</th>
                    <th>Row</th>
                    <th>Column</th>
                    <th>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {editErrors.map((er, i) => (
                    <tr key={i}>
                      <td>{er.sheet}</td>
                      <td>{er.row}</td>
                      <td>{er.column}</td>
                      <td>{er.error}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
