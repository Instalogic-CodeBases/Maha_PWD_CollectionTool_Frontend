import { useEffect, useMemo, useState } from 'react';
import { useToast } from '../context/ToastContext.jsx';
import { usePagination } from '../lib/usePagination.js';
import API from '../api/client.js';
import Modal from '../components/Modal.jsx';
import Pagination from '../components/Pagination.jsx';

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
);
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString() : '—');

// Circle Login management: each Circle is a login account (Circle + Password).
export default function Users() {
  const toast = useToast();

  const [rows, setRows] = useState([]);      // [{ pwCircleId, circleName, hasLogin, createdOn }]
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  const [open, setOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);   // set when resetting an existing login
  const [circleId, setCircleId] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = async () => {
    setLoading(true);
    try { setRows(await API.getCircleLogins() || []); }
    catch (e) { toast(e.message || 'Could not load circle logins', 'err'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditRow(null); setCircleId(''); setPassword(''); setConfirm(''); setErr(''); setOpen(true); };
  const openReset = (row) => { setEditRow(row); setCircleId(String(row.pwCircleId)); setPassword(''); setConfirm(''); setErr(''); setOpen(true); };

  const save = async () => {
    setErr('');
    const cid = Number(circleId);
    if (!cid) return setErr('Please select a Circle.');
    if (!password || password.length < 6) return setErr('Password must be at least 6 characters long.');
    if (password !== confirm) return setErr('Password and confirmation do not match.');
    setBusy(true);
    try {
      const res = await API.upsertCircleLogin(cid, password);
      if (res && res.success) { toast(res.message || 'Saved', 'ok'); setOpen(false); await load(); }
      else setErr((res && res.message) || 'Could not save.');
    } catch (e) { setErr(e.message || 'Could not save.'); }
    finally { setBusy(false); }
  };

  const deactivate = async (row) => {
    try { const res = await API.deactivateCircleLogin(row.pwCircleId); toast(res.message || 'Deactivated', 'ok'); await load(); }
    catch (e) { toast(e.message || 'Could not deactivate', 'err'); }
  };

  const lq = q.trim().toLowerCase();
  const filtered = useMemo(
    () => (lq ? rows.filter((r) => r.circleName.toLowerCase().includes(lq)) : rows),
    [rows, lq]
  );
  const { page, setPage, pageCount, total, pageSize, pageRows } = usePagination(filtered, 10, lq);

  // circles without a login (for the Create dropdown); when resetting, current circle is allowed
  const availableCircles = rows.filter((r) => !r.hasLogin || (editRow && r.pwCircleId === editRow.pwCircleId));

  return (
    <>
      <div className="card">
        <div className="table-toolbar">
          <div className="section-title" style={{ margin: 0 }}>Circle Logins</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div className="search-box">
              <SearchIcon />
              <input placeholder="Search Circle…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <button className="btn btn-blue" onClick={openCreate}>+ Create Circle Login</button>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Circle</th>
                <th>Login Status</th>
                <th>Created</th>
                <th style={{ whiteSpace: 'nowrap' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="empty">Loading…</td></tr>
              ) : pageRows.length ? pageRows.map((r) => (
                <tr key={r.pwCircleId}>
                  <td>{r.circleName}</td>
                  <td>
                    {r.hasLogin
                      ? <span className="badge badge-success">Active</span>
                      : <span className="badge badge-muted">No login</span>}
                  </td>
                  <td>{fmtDate(r.createdOn)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {r.hasLogin ? (
                      <>
                        <button className="btn btn-sm" onClick={() => openReset(r)}>Reset Password</button>
                        <button className="btn btn-sm btn-red" style={{ marginLeft: 6 }} onClick={() => deactivate(r)}>Deactivate</button>
                      </>
                    ) : (
                      <button className="btn btn-sm btn-blue" onClick={() => { setEditRow(null); setCircleId(String(r.pwCircleId)); setPassword(''); setConfirm(''); setErr(''); setOpen(true); }}>
                        Create Login
                      </button>
                    )}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="empty">No circles found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} onChange={setPage} />
      </div>

      <Modal
        open={open}
        title={editRow ? `Reset Password — ${editRow.circleName}` : 'Create Circle Login'}
        onClose={() => setOpen(false)}
        footer={<>
          <button className="btn" onClick={() => setOpen(false)} disabled={busy}>Cancel</button>
          <button className="btn btn-blue" onClick={save} disabled={busy}>{busy ? 'Saving…' : (editRow ? 'Reset Password' : 'Create Login')}</button>
        </>}
      >
        <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
          <div className="form-field">
            <label>Circle <span className="req">*</span></label>
            <select value={circleId} onChange={(e) => setCircleId(e.target.value)} disabled={!!editRow}>
              <option value="">Select Circle</option>
              {availableCircles.map((c) => <option key={c.pwCircleId} value={c.pwCircleId}>{c.circleName}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>Password <span className="req">*</span></label>
            <input type="password" placeholder="Enter Password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          </div>
          <div className="form-field">
            <label>Confirm Password <span className="req">*</span></label>
            <input type="password" placeholder="Re-enter Password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
            {confirm && password !== confirm && <div style={{ fontSize: 11.5, color: '#e11d48', marginTop: 4 }}>Passwords do not match.</div>}
          </div>
          {err && <div className="notice err" style={{ marginTop: 2 }}>{err}</div>}
          <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
            The officer logs in with this Circle and password. Share the password offline. To change officer, just reset the password.
          </div>
        </div>
      </Modal>
    </>
  );
}