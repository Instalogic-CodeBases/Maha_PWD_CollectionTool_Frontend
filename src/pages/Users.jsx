import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { usePageData } from '../lib/usePageData.js';
import { useToast } from '../context/ToastContext.jsx';
import { usePagination } from '../lib/usePagination.js';
import API from '../api/client.js';
import Modal from '../components/Modal.jsx';
import Pagination from '../components/Pagination.jsx';
import { circleForDistrict } from '../lib/helpers.js';

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

  const save = async () => {
    const name = form.name.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();
    const password = editId ? '' : form.password;
    const roleId = Number(form.roleId);
    const hierarchyNodeIds = Array.from(selected).map(Number).filter(Boolean);
    const hierarchyNodeId = hierarchyNodeIds[0] || 0; // primary (legacy-compatible)
    const isActive = form.isActive;

    if (!name || !email || !phone) { toast('Name, Email & Phone are required', 'err'); return; }
    if (!editId && !password) { toast('Password is required for a new user', 'err'); return; }
    if (!roleId || !hierarchyNodeIds.length) { toast('Role and at least one District are required', 'err'); return; }

    const payload = { name, email, phone, password, roleId, hierarchyNodeId, hierarchyNodeIds, isActive };
    try {
      if (editId) { await API.updateUser(editId, payload); }
      else { await API.createUser(payload); }
      setModalOpen(false);
      await loadUsers();
      toast(editId ? 'User updated' : 'User created — they can log in with this email & password now');
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

  return (
    <>
      {/* Scoped styles for the district picker so nothing else in the app is affected */}
      <style>{`
        .dist-block { border: 1px solid var(--border); border-radius: 10px; overflow: hidden; background: #fff; }
        .dist-head {
          display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
          padding: 8px 10px; background: #f8fafc; border-bottom: 1px solid var(--border);
        }
        .dist-head .spacer { flex: 1; }
        .dist-count { font-size: 11.5px; color: var(--muted); white-space: nowrap; }
        .dist-search {
          flex: 0 1 220px; min-width: 150px; height: 30px; padding: 0 10px;
          border: 1px solid var(--border); border-radius: 8px; font-size: 12.5px; background: #fff;
        }
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
          padding: 10px 12px;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: #f8fafc;
        }
        .active-row.active-row input[type="checkbox"] {
          flex: 0 0 16px !important;
         
          min-width: 0;
          margin: 0;
          padding: 0;
          accent-color: #2563eb;
          cursor: pointer;
        }
        .active-row .t { font-size: 13px; font-weight: 600; }
        .active-row .s { font-size: 11.5px; color: var(--muted); }
        .dist-block label.dist-row:last-child { border-bottom: 0; }
        .dist-block label.dist-row:hover { background: #f6f9ff; }
        .dist-block label.dist-row.is-on { background: #eef6ff; }
        .dist-block label.dist-row input[type="checkbox"] {
          flex: 0 0 16px; margin: 0; padding: 0;
          accent-color: #2563eb; cursor: pointer; display: block;
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
        .active-row input[type="checkbox"] { width: 16px; height: 16px; margin: 0; accent-color: #2563eb; }
        .active-row .t { font-size: 13px; font-weight: 600; }
        .active-row .s { font-size: 11.5px; color: var(--muted); }
      `}</style>

      <div className="toolbar">
        <div>
          <div className="page-sub">Create users with an email, phone, role and one or more assigned districts. Active users can log in immediately with the email &amp; password set here.</div>
        </div>
        <button className="btn btn-blue" onClick={() => openModal()}>+ Add User</button>
      </div>

      <div className="card">
        <div className="table-toolbar">
          <div className="search-box">
            <SearchIcon />
            <input placeholder="Search name, email, role or district…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>District(s)</th><th>Status</th><th style={{ width: 100 }}>Actions</th></tr></thead>
            <tbody>
              {pageRows.length ? pageRows.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.phone || '—'}</td>
                  <td><span className={'badge ' + (u.role === 'admin' ? 'badge-success' : 'badge-muted')}>{u.roleName}</span></td>
                  <td><span className="chip">{u.hierarchyNodeName}</span></td>
                  <td><span className={'badge ' + (u.isActive ? 'badge-success' : 'badge-muted')}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td>
                    <button className="icon-btn" onClick={() => openModal(u.id)}>✏️</button>
                    <button className="icon-btn danger" onClick={() => del(u.id)}>🗑️</button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={7} className="empty">No matching users.</td></tr>
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
            <div className="form-field"><label>Full Name <span className="req">*</span></label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="form-field"><label>Email <span className="req">*</span></label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="form-field"><label>Phone <span className="req">*</span></label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            {editId ? (
              <div className="form-field"><label>Password</label><input type="password" placeholder="Not editable here — unchanged" disabled /></div>
            ) : (
              <div className="form-field"><label>Password <span className="req">*</span></label><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
            )}
            <div className="form-field"><label>Role <span className="req">*</span></label>
              <select value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })}>{roleOptions}</select>
            </div>

            <div className="form-field full">
              <label>Assign District(s) <span className="req">*</span></label>

              <div className="dist-block">
                <div className="dist-head">
                  <button type="button" className="btn" onClick={() => toggleAll(true)}>Select all</button>
                  <button type="button" className="btn" onClick={() => toggleAll(false)}>Clear</button>
                  <span className="dist-count">
                    {selNum ? `${selNum} of ${selCount} selected` : 'No district selected yet'}
                  </span>
                  <span className="spacer" />
                  <input
                    className="dist-search"
                    placeholder="Filter districts…"
                    value={distQ}
                    onChange={(e) => setDistQ(e.target.value)}
                  />
                </div>

                <div className="dist-list">
                  {visibleNodes.length ? visibleNodes.map((n) => {
                    const circle = circleForDistrict(n.name) || districtCircle[n.name] || '';
                    const on = selected.has(String(n.id));
                    return (
                      <label key={n.id} className={'dist-row' + (on ? ' is-on' : '')}>
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={(e) => toggleNode(n.id, e.target.checked)}
                        />
                        <span className="dist-name">{n.name}</span>
                        {circle ? <span className="chip">{circle}</span> : <span />}
                      </label>
                    );
                  }) : <div className="empty">No assignable districts</div>}
                </div>
              </div>
            </div>

            <div className="form-field full">
              <label className="active-row" style={{ fontWeight: 400 }}>
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                <span>
                  <span className="t">Active</span>{' '}
                  <span className="s">— user can log in immediately with this email &amp; password</span>
                </span>
              </label>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}