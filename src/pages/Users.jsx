import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { usePageData } from '../lib/usePageData.js';
import { useToast } from '../context/ToastContext.jsx';
import { usePagination } from '../lib/usePagination.js';
import API from '../api/client.js';
import Modal from '../components/Modal.jsx';
import Pagination from '../components/Pagination.jsx';
import { circleForDistrict } from '../lib/helpers.js';
import { Icon } from '../components/Icons.jsx';

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
);

export default function Users() {
  const { users, loadUsers, districtCircle } = useApp();
  const toast = useToast();
  const { loading, error } = usePageData(() => loadUsers(), []);

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState('');
  const [metaLoading, setMetaLoading] = useState(false);
  const [roles, setRoles] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', roleId: '', isActive: true });
  const [selected, setSelected] = useState(new Set()); // node ids as strings
  const [q, setQ] = useState('');
  const [distQ, setDistQ] = useState('');
  const [circles, setCircles] = useState([]);          // all PW circles
  const [selCircles, setSelCircles] = useState(new Set()); // selected circle ids (strings)
  const [circleQ, setCircleQ] = useState('');

  // Admin district picker: show only the real PWD district rows — Marathi names
  // whose parent circle is an "अ.अ...मंडळ..." circle. (Display filter only.)
  const pickNodes = nodes.filter((n) => {
    const c = (circleForDistrict(n.name) || districtCircle[n.name] || '').trim();
    return c.indexOf('अ.अ') === 0;
  });

  const dq = distQ.trim().toLowerCase();
  const visibleNodes = dq
    ? pickNodes.filter((n) =>
        (n.name + ' ' + (circleForDistrict(n.name) || districtCircle[n.name] || '')).toLowerCase().includes(dq)
      )
    : pickNodes;

  const openModal = async (id) => {
    setEditId(id || '');
    setModalOpen(true);
    setMetaLoading(true);
    setDistQ('');
    setCircleQ('');
    try {
      const meta = id ? await API.getUser(id) : await API.userMetadata();
      const r = meta.roles || [];
      const n = meta.hierarchyNodes || [];
      setRoles(r);
      setNodes(n);
      const u = id ? meta : { name: '', email: '', phone: '', roleId: (r[0] && r[0].id) || '', hierarchyNodeId: (n[0] && n[0].id) || '', isActive: true };
      setForm({
        name: u.name || '',
        email: u.email || '',
        phone: u.phone || '',
        password: '',
        roleId: u.roleId != null && u.roleId !== 0 ? u.roleId : (r[0] && r[0].id) || '',
        isActive: u.isActive !== false,
      });
      const pre = new Set(
        ((u.hierarchyNodeIds && u.hierarchyNodeIds.length)
          ? u.hierarchyNodeIds
          : (u.hierarchyNodeId ? [u.hierarchyNodeId] : [])
        ).map(String)
      );
      setSelected(pre);

      // --- PW Circle(s) (Batch 2) ---
      const allCircles = await API.getPwCircles();
      setCircles(allCircles || []);
      if (id) {
        const assignedCircles = await API.getAssignedPwCircles(id);
        setSelCircles(new Set((assignedCircles || []).map(String)));
      } else {
        setSelCircles(new Set());
      }
    } catch (err) {
      toast(err.message || 'Could not load the user form', 'err');
      setModalOpen(false);
    } finally {
      setMetaLoading(false);
    }
  };

  const toggleNode = (id, on) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(String(id)); else next.delete(String(id));
      return next;
    });
  };
  const toggleAll = (on) => {
    setSelected(on ? new Set(pickNodes.map((n) => String(n.id))) : new Set());
  };

  const toggleCircle = (cid, on) => {
    setSelCircles((prev) => {
      const next = new Set(prev);
      if (on) next.add(String(cid)); else next.delete(String(cid));
      return next;
    });
  };
  const toggleAllCircles = (on) => {
    setSelCircles(on ? new Set(circles.map((c) => String(c.id))) : new Set());
  };

  const save = async () => {
    const password = form.password;
    const pwCircleIds = Array.from(selCircles).map(Number).filter(Boolean);
    if (!pwCircleIds.length) { toast('Select at least one PW Circle', 'err'); return; }
    if (!password || password.length < 6) { toast('Password must be at least 6 characters', 'err'); return; }
    try {
      const results = await Promise.all(pwCircleIds.map((id) => API.upsertCircleLogin(id, password)));
      const failed = results.filter((r) => !(r && r.success));
      if (failed.length) { toast(failed[0].message || 'Some circles could not be saved', 'err'); }
      else { toast(`Saved ${pwCircleIds.length} circle login(s).`, 'ok'); setModalOpen(false); }
      await loadUsers();
    } catch (err) { toast(err.message || 'Save failed', 'err'); }
  };

  const del = async (id) => {
    if (!window.confirm('Toggle this user active/inactive? (The API supports a soft toggle, not hard delete.)')) return;
    try { await API.toggleUser(id); await loadUsers(); toast('User status updated'); }
    catch (err) { toast(err.message || 'Failed', 'err'); }
  };

  const selCount = pickNodes.length;
  const selNum = Array.from(selected).filter((id) => pickNodes.some((n) => String(n.id) === id)).length;

  const lq = q.trim().toLowerCase();
  const filtered = lq
    ? users.filter((u) => [u.name, u.email, u.phone, u.roleName, u.hierarchyNodeName].join(' ').toLowerCase().includes(lq))
    : users;
  const { page, setPage, pageCount, total, pageSize, pageRows } = usePagination(filtered, 10, lq);

  if (loading) return <div className="empty">Loading…</div>;
  if (error) return <div className="notice err">{error}</div>;

  const roleOptions = roles.length
    ? roles.map((r) => <option key={r.id} value={r.id}>{r.roleName}</option>)
    : <option value="">No assignable roles</option>;

  const cq = circleQ.trim().toLowerCase();
  const visibleCircles = cq ? circles.filter((c) => c.name.toLowerCase().includes(cq)) : circles;
  const selCirclesNum = circles.filter((c) => selCircles.has(String(c.id))).length;

  return (
    <>
      {/* Scoped styles for the district picker so nothing else in the app is affected */}
      <style>{`
        /* Cleaner, better-aligned user form */
        .modal .form-grid { gap: 18px 22px; }
        .modal .form-field > label { font-size: 12.5px; font-weight: 600; color: #3a4a4f; margin-bottom: 8px; }
        .modal .form-field select,
        .modal .form-field input[type="password"] { height: 42px; }

        .dist-block { border: 1px solid var(--border); border-radius: 12px; overflow: hidden; background: #fff; box-shadow: var(--shadow-xs); }
        .dist-head {
          display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
          padding: 10px 12px; background: #f6fafa; border-bottom: 1px solid var(--border);
        }
        .dist-head .spacer { flex: 1; }
        .dist-count { font-size: 11.5px; color: var(--muted); white-space: nowrap; }
        .dist-search {
          flex: 0 1 220px; min-width: 150px; height: 32px; padding: 0 12px;
          border: 1px solid var(--border-strong); border-radius: 8px; font-size: 12.5px; background: #fff;
        }
        .dist-search:focus { outline: none; border-color: var(--blue); box-shadow: var(--ring); }
        .dist-list { max-height: 300px; overflow-y: auto; }
        .dist-block label.dist-row {
          display: flex !important;
          flex-direction: row !important;
          flex-wrap: nowrap;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border-bottom: 1px solid var(--border);
          cursor: pointer;
          text-align: left;
          transition: background .12s ease;
        }

        .active-row.active-row {
          display: flex !important;
          flex-direction: row !important;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: #f6fafa;
        }
        .active-row.active-row input[type="checkbox"] {
          flex: 0 0 16px !important;
         
          min-width: 0;
          margin: 0;
          padding: 0;
          accent-color: var(--blue);
          cursor: pointer;
        }
        .active-row .t { font-size: 13px; font-weight: 600; }
        .active-row .s { font-size: 11.5px; color: var(--muted); }
        .dist-block label.dist-row:last-child { border-bottom: 0; }
        .dist-block label.dist-row:hover { background: #f2faf9; }
        .dist-block label.dist-row.is-on { background: #e8f6f4; }
        .dist-block label.dist-row input[type="checkbox"] {
          flex: 0 0 16px; margin: 0; padding: 0;
          accent-color: var(--blue); cursor: pointer; display: block;
        }
        .dist-block label.dist-row .dist-name {
          flex: 1 1 auto; min-width: 0; font-size: 13.5px; font-weight: 500;
          text-align: left; line-height: 1.3;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .dist-block label.dist-row .chip { flex: 0 0 auto; max-width: 190px; text-align: center; white-space: nowrap; }
        .active-row {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px; border: 1px solid var(--border); border-radius: 10px; background: #f8fafc;
        }
        .active-row input[type="checkbox"] { width: 16px; height: 16px; margin: 0; accent-color: var(--blue); }
        .active-row .t { font-size: 13px; font-weight: 600; }
        .active-row .s { font-size: 11.5px; color: var(--muted); }
      `}</style>

      <div className="toolbar">
        <div>
          <div className="page-sub"></div>
        </div>
        <button className="btn btn-blue" onClick={() => openModal()}><Icon name="add" size={15} /> Add User</button>
      </div>

      <div className="card">
        <div className="table-toolbar">
          <div className="search-box">
            <SearchIcon />
            <input placeholder="Search name, role or PW circle…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Role</th><th>PW Circle(s)</th><th>Status</th><th style={{ width: 100 }}>Actions</th></tr></thead>
            <tbody>
              {pageRows.length ? pageRows.map((u) => (
                <tr key={u.id}>
                  <td><span className={'badge ' + (u.role === 'admin' ? 'badge-success' : 'badge-muted')}>{u.roleName}</span></td>
                  <td><span className="chip">{u.pwCircleNames || u.hierarchyNodeName || '—'}</span></td>
                  <td><span className={'badge ' + (u.isActive ? 'badge-success' : 'badge-muted')}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td>
                    <button className="icon-btn" title="Edit" onClick={() => openModal(u.id)}><Icon name="edit" /></button>
                    <button className="icon-btn danger" title="Toggle active" onClick={() => del(u.id)}><Icon name="trash" /></button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="empty">No matching users.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} onChange={setPage} />
      </div>

      <Modal
        open={modalOpen}
        wide
        title={editId ? 'Edit User' : 'Add User'}
        onClose={() => setModalOpen(false)}
        footer={<><button className="btn" onClick={() => setModalOpen(false)}>Cancel</button><button className="btn btn-blue" onClick={save}>Save</button></>}
      >
        {metaLoading ? (
          <div className="empty">Loading…</div>
        ) : (
          <div className="form-grid">
            <div className="form-field full">
              <label>Role <span className="req">*</span></label>
              <select value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })}>
                {roleOptions}
              </select>
            </div>

            <div className="form-field full">
              <label>Assign PW Circle(s) <span className="req">*</span></label>

              <div className="dist-block">
                <div className="dist-head">
                  <button type="button" className="btn" onClick={() => toggleAllCircles(true)}>Select all</button>
                  <button type="button" className="btn" onClick={() => toggleAllCircles(false)}>Clear</button>
                  <span className="dist-count">
                    {selCirclesNum ? `${selCirclesNum} of ${circles.length} selected` : 'No PW Circle selected yet'}
                  </span>
                  <span className="spacer" />
                  <input
                    className="dist-search"
                    placeholder="Filter PW circles…"
                    value={circleQ}
                    onChange={(e) => setCircleQ(e.target.value)}
                  />
                </div>

                <div className="dist-list">
                  {visibleCircles.length ? visibleCircles.map((c) => {
                    const on = selCircles.has(String(c.id));
                    return (
                      <label key={c.id} className={'dist-row' + (on ? ' is-on' : '')}>
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={(e) => toggleCircle(c.id, e.target.checked)}
                        />
                        <span className="dist-name">{c.name}</span>
                        <span />
                      </label>
                    );
                  }) : <div className="empty">No PW circles found</div>}
                </div>
              </div>
            </div>

            <div className="form-field full"><label>Password <span className="req">*</span></label>
              <input type="password" placeholder="Enter Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" />
            </div>

            <div className="form-field full">
              <label className="active-row" style={{ fontWeight: 400 }}>
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                <span>
                  <span className="t">Active</span>{' '}
                  <span className="s">— user can log in immediately with the selected PW Circle &amp; password</span>
                </span>
              </label>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}