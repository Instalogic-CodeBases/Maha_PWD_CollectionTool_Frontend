import { useRef, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { usePageData } from '../lib/usePageData.js';
import { useToast } from '../context/ToastContext.jsx';
import API from '../api/client.js';
import Modal from '../components/Modal.jsx';
import { translateEnglishToMarathi } from '../lib/translit.js';

const FIELD_TYPES = ['text', 'number', 'date', 'district', 'scheme', 'computerId', 'autoRemaining'];

export default function Template() {
  const {
    fields, templates, currentTemplateId, allDistrictsList,
    setFields, setCurrentTemplateId,
    loadContext, loadTemplates, loadTemplateFields, loadAllDistricts,
  } = useApp();
  const toast = useToast();

  const { loading, error } = usePageData(async () => {
    await loadContext();
    await loadTemplates();
    await loadAllDistricts();
    await loadTemplateFields();
  }, []);

  // field modal state
  const [fieldModalOpen, setFieldModalOpen] = useState(false);
  const [fieldEditId, setFieldEditId] = useState('');
  const [fmEn, setFmEn] = useState('');
  const [fmMar, setFmMar] = useState('');
  const [fmType, setFmType] = useState('text');
  const [fmMand, setFmMand] = useState(false);
  const fmTranslateSeq = useRef(0); // guards against out-of-order async translation responses

  // assign-districts modal state
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignSel, setAssignSel] = useState(new Set());

  const currentTemplate = () => templates.find((t) => String(t.id) === String(currentTemplateId));

  const tmplDistrictSummary = () => {
    const t = currentTemplate();
    if (!t) return '';
    const ids = (t.districtIds || []).map(String);
    // Default Template disabled — no longer referencing the default-template fallback message.
    // if (!ids.length) return 'No districts assigned — officers in unassigned districts use the default template.';
    if (!ids.length) return 'No districts assigned.';
    if (allDistrictsList.length) {
      const names = allDistrictsList.filter((d) => ids.includes(String(d.id))).map((d) => d.name);
      if (names.length) return 'Assigned districts: ' + names.join(', ');
    }
    return ids.length + ' district(s) assigned.';
  };

  const selectTemplate = async (id) => {
    setCurrentTemplateId(id === '' || id == null ? null : Number(id));
    await loadTemplateFields();
  };

  const createTemplateUI = async () => {
    const name = window.prompt('New template name:');
    if (!name || !name.trim()) return;
    try {
      const r = await API.createTemplate({ name: name.trim(), districtIds: [] });
      await loadTemplates();
      setCurrentTemplateId(r.id);
      await loadTemplateFields();
      toast('Template created');
    } catch (err) { toast(err.message || 'Create failed', 'err'); }
  };

  const renameTemplateUI = async () => {
    const t = currentTemplate();
    if (!t) return;
    const name = window.prompt('Rename template:', t.name);
    if (!name || !name.trim()) return;
    try {
      await API.updateTemplate(t.id, { name: name.trim(), districtIds: t.districtIds || [] });
      await loadTemplates();
      toast('Renamed');
    } catch (err) { toast(err.message || 'Rename failed', 'err'); }
  };

  const deleteTemplateUI = async () => {
    const t = currentTemplate();
    if (!t) return;
    // Default Template disabled — no template is treated as an undeletable "default" anymore.
    // if (t.isDefault) { toast('The default template cannot be deleted.', 'warn'); return; }
    // if (!window.confirm('Delete template "' + t.name + '"? Districts assigned to it will fall back to the default template.')) return;
    if (!window.confirm('Delete template "' + t.name + '"?')) return;
    try {
      await API.deleteTemplate(t.id);
      setCurrentTemplateId(null);
      await loadTemplates();
      await loadTemplateFields();
      toast('Deleted');
    } catch (err) { toast(err.message || 'Delete failed', 'err'); }
  };

  const assignDistrictsUI = async () => {
    const t = currentTemplate();
    if (!t) return;
    if (!allDistrictsList.length) await loadAllDistricts();
    setAssignSel(new Set((t.districtIds || []).map(String)));
    setAssignOpen(true);
  };

  const saveAssignDistricts = async () => {
    const t = currentTemplate();
    if (!t) return;
    const ids = Array.from(assignSel).map(Number).filter((n) => !Number.isNaN(n));
    try {
      await API.updateTemplate(t.id, { name: t.name, districtIds: ids });
      setAssignOpen(false);
      await loadTemplates();
      toast('Districts assigned');
    } catch (err) { toast(err.message || 'Save failed', 'err'); }
  };

  const moveField = async (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= fields.length) return;
    const arr = [...fields];
    const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    setFields(arr);
    try { await API.reorderFields(arr.map((f) => f.id), currentTemplateId); }
    catch (err) { toast(err.message || 'Reorder failed', 'err'); }
  };

  const openFieldModal = (id) => {
    setFieldEditId(id || '');
    const f = id ? fields.find((x) => String(x.id) === String(id)) : null;
    setFmEn(f ? f.english : '');
    setFmMar(f ? f.marathi : '');
    setFmType(f ? f.type : 'text');
    setFmMand(f ? f.mandatory : false);
    setFieldModalOpen(true);
  };

  const saveField = async () => {
    const mar = fmMar.trim();
    const en = fmEn.trim();
    if (!mar || !en) { toast('Both names required', 'err'); return; }
    const existing = fieldEditId ? fields.find((x) => String(x.id) === String(fieldEditId)) : null;
    const payload = { marathi: mar, english: en, type: fmType, mandatory: fmMand, key: existing ? existing.key : '', templateId: currentTemplateId };
    try {
      if (fieldEditId) { await API.editField(fieldEditId, payload); }
      else { await API.addField(payload); }
      setFieldModalOpen(false);
      await loadTemplateFields();
      await loadTemplates();
      toast('Field saved — synced everywhere');
    } catch (err) { toast(err.message || 'Save failed', 'err'); }
  };

  const deleteField = async (id) => {
    if (!window.confirm('Delete this field?')) return;
    try {
      await API.deleteField(id);
      await loadTemplateFields();
      await loadTemplates();
      toast('Field deleted');
    } catch (err) { toast(err.message || 'Delete failed', 'err'); }
  };

  const toggleAssign = (id, on) => {
    setAssignSel((prev) => {
      const next = new Set(prev);
      if (on) next.add(String(id)); else next.delete(String(id));
      return next;
    });
  };

  if (loading) return <div className="empty">Loading…</div>;
  if (error) return <div className="notice err">{error}</div>;

  return (
    <>
      <div className="toolbar">
        <div>
          {/* <h2 className="page-title">Dynamic Template</h2>
          <div className="page-sub">Add / edit / delete / reorder fields. Changes apply immediately to the Online Form, Marathi Excel Template, View Submitted Data, and Reports.</div> */}
        </div>
        {/* <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={() => toast('Reset is disabled — template fields are managed in the backend now.', 'warn')}>Reset</button>
          <button className="btn btn-blue" onClick={() => openFieldModal()}>+ Add Field</button>
        </div> */}
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontWeight: 700 }}>Template:</label>
          <select value={currentTemplateId ?? ''} onChange={(e) => selectTemplate(e.target.value)} style={{ minWidth: 240 }}
            >
            {templates.map((t) => (
              // Default Template disabled — no longer showing "(default)" label in the dropdown.
              // <option key={t.id} value={t.id}>{t.name}{t.isDefault ? ' (default)' : ''} · {t.fieldCount || 0} fields</option>
              <option key={t.id} value={t.id}>{t.name} · {t.fieldCount || 0} fields</option>
            ))}
          </select>
         <button className="btn" onClick={createTemplateUI}>+ New Template</button>

<button className="btn" onClick={renameTemplateUI}>Rename</button>

<button className="btn btn-blue" onClick={assignDistrictsUI}>
  Assign Districts
</button>

<button className="btn danger" onClick={deleteTemplateUI}>
  Delete
</button>

<button
  className="btn"
  onClick={() =>
    toast('Reset is disabled — template fields are managed in the backend now.', 'warn')
  }
>
  Reset
</button>

<button
  className="btn btn-blue"
  onClick={() => openFieldModal()}
>
  + Add Field
</button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>{tmplDistrictSummary()}</div>
      </div>

      {/* <div className="notice warn">
        Special types: <b>computerId</b> = dropdown auto-populates <b>scheme</b> field. <b>autoRemaining</b> = auto = estimatedCost − expByMarch2026. These 4 special types (district / scheme / computerId / autoRemaining) should exist only once.
      </div> */}

      <div className="card">
        <div className="tmpl-row" style={{ background: 'var(--blue-lighter)', fontWeight: 700 }}>
          <div>#</div><div>Marathi Name</div><div>English Name</div><div>Type</div><div>Mandatory</div><div style={{ textAlign: 'right' }}>Actions</div>
        </div>
        {fields.map((f, i) => (
          <div className="tmpl-row" key={f.id}>
            <div>{i + 1}</div>
            <div>{f.marathi}</div>
            <div>{f.english}</div>
            <div><span className="badge badge-muted">{f.type}</span></div>
            <div>{f.mandatory ? <span className="badge badge-success">Yes</span> : <span className="badge badge-muted">No</span>}</div>
            <div className="rowbtns">
              <button className="icon-btn" title="Up" onClick={() => moveField(i, -1)}>▲</button>
              <button className="icon-btn" title="Down" onClick={() => moveField(i, 1)}>▼</button>
              <button className="icon-btn" onClick={() => openFieldModal(f.id)}>✏️</button>
              <button className="icon-btn danger" onClick={() => deleteField(f.id)}>🗑️</button>
            </div>
          </div>
        ))}
      </div>

      {/* Field add/edit modal */}
      <Modal
        open={fieldModalOpen}
        title={fieldEditId ? 'Edit Field' : 'Add Field'}
        onClose={() => setFieldModalOpen(false)}
        footer={<><button className="btn" onClick={() => setFieldModalOpen(false)}>Cancel</button><button className="btn btn-blue" onClick={saveField}>Save</button></>}
      >
        <div className="form-grid">
          <div className="form-field">
            <label>English Name <span className="req">*</span></label>
            <input value={fmEn} onChange={(e) => {
              const v = e.target.value;
              setFmEn(v);
              const seq = ++fmTranslateSeq.current;
              translateEnglishToMarathi(v).then((mar) => {
                if (fmTranslateSeq.current === seq) setFmMar(mar);
              });
            }} />
          </div>
          <div className="form-field">
            <label>Marathi Name <span className="req">*</span></label>
            <input value={fmMar} onChange={(e) => setFmMar(e.target.value)} />
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Auto-generated from the English Name — edit it manually if you want different wording.</div>
          </div>
          <div className="form-field">
            <label>Type</label>
            <select value={fmType} onChange={(e) => setFmType(e.target.value)}>
              {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>Mandatory</label>
            <select value={fmMand ? '1' : '0'} onChange={(e) => setFmMand(e.target.value === '1')}>
              <option value="1">Yes</option>
              <option value="0">No</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* Assign districts modal */}
      <Modal
        open={assignOpen}
        title={'Assign Districts — ' + (currentTemplate()?.name || '')}
        onClose={() => setAssignOpen(false)}
        footer={<><button className="btn" onClick={() => setAssignOpen(false)}>Cancel</button><button className="btn btn-blue" onClick={saveAssignDistricts}>Save</button></>}
      >
        <div style={{ maxHeight: 340, overflow: 'auto' }}>
          {allDistrictsList.map((d) => (
            <label key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px', borderBottom: '1px solid var(--border)' }}>
              <input type="checkbox" checked={assignSel.has(String(d.id))} onChange={(e) => toggleAssign(d.id, e.target.checked)} />
              <span>{d.name}</span>
              <span className="chip" style={{ marginLeft: 'auto' }}>{d.circle || ''}</span>
            </label>
          ))}
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
          A district can belong to only one template. Assigning it here moves it off any other template.
        </div>
      </Modal>
    </>
  );
}