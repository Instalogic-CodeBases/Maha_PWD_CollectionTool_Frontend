import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { usePageData } from '../lib/usePageData.js';
import { useToast } from '../context/ToastContext.jsx';
import { usePagination } from '../lib/usePagination.js';
import API from '../api/client.js';
import Modal from '../components/Modal.jsx';
import Pagination from '../components/Pagination.jsx';

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
);

export default function ComputerIds() {
  const { computerIds, loadComputerIds } = useApp();
  const toast = useToast();
  const { loading, error } = usePageData(() => loadComputerIds(), []);

  const [modal, setModal] = useState(null); // { id } | null
  const [cid, setCid] = useState('');
  const [scheme, setScheme] = useState('');
  const [q, setQ] = useState('');

  const openAdd = () => { setModal({ id: '' }); setCid(''); setScheme(''); };
  const openEdit = (id) => {
    const x = computerIds.find((z) => z.id === id);
    setModal({ id }); setCid(x?.computerId || ''); setScheme(x?.schemeName || '');
  };

  const save = async () => {
    const c = cid.trim();
    const sn = scheme.trim();
    if (!c || !sn) { toast('Both fields required', 'err'); return; }
    try {
      if (modal.id) { await API.editComputerId(modal.id, c, sn); }
      else { await API.addComputerId(c, sn); }
      setModal(null);
      await loadComputerIds();
      toast('Saved');
    } catch (err) { toast(err.message || 'Save failed', 'err'); }
  };

  const del = async (id) => {
    if (!window.confirm('Delete this Computer ID?')) return;
    try { await API.deleteComputerId(id); await loadComputerIds(); toast('Deleted'); }
    catch (err) { toast(err.message || 'Delete failed', 'err'); }
  };

  const lq = q.trim().toLowerCase();
  const filtered = lq
    ? computerIds.filter((x) => (x.computerId + ' ' + x.schemeName).toLowerCase().includes(lq))
    : computerIds;
  const { page, setPage, pageCount, total, pageSize, start, pageRows } = usePagination(filtered, 10, lq);

  if (loading) return <div className="empty">Loading…</div>;
  if (error) return <div className="notice err">{error}</div>;

  return (
    <>
      <div className="toolbar">
        <div>
          {/* <h2 className="page-title">Computer ID Management</h2> */}
          <div className="page-sub">संगणक संकेतांक master data — changes update Online Form dropdown, Excel Template dropdown, and scheme mapping automatically.</div>
        </div>
        <button className="btn btn-blue" onClick={openAdd}>+ Add Computer ID</button>
      </div>

      <div className="card">
        <div className="table-toolbar">
          <div className="search-box">
            <SearchIcon />
            <input placeholder="Search Computer ID or scheme…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>#</th><th>संगणक संकेतांक (Computer ID)</th><th>योजनेचे नाव (Scheme Name)</th><th style={{ width: 110 }}>Actions</th></tr></thead>
            <tbody>
              {pageRows.length ? pageRows.map((x, i) => (
                <tr key={x.id}>
                  <td>{start + i + 1}</td>
                  <td>{x.computerId}</td>
                  <td>{x.schemeName}</td>
                  <td>
                    <button className="icon-btn" onClick={() => openEdit(x.id)}>✏️</button>
                    <button className="icon-btn danger" onClick={() => del(x.id)}>🗑️</button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="empty">No matching Computer IDs.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} onChange={setPage} />
      </div>

      <Modal
        open={!!modal}
        title={modal?.id ? 'Edit Computer ID' : 'Add Computer ID'}
        onClose={() => setModal(null)}
        footer={<><button className="btn" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-blue" onClick={save}>Save</button></>}
      >
        <div className="form-grid">
          <div className="form-field"><label>संगणक संकेतांक (Computer ID) <span className="req">*</span></label><input value={cid} onChange={(e) => setCid(e.target.value)} /></div>
          <div className="form-field"><label>योजनेचे नाव (Scheme Name) <span className="req">*</span></label><input value={scheme} onChange={(e) => setScheme(e.target.value)} /></div>
        </div>
      </Modal>
    </>
  );
}