import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { usePageData } from '../lib/usePageData.js';
import { useToast } from '../context/ToastContext.jsx';
import API from '../api/client.js';
import { districtsForUser, schemeForComputerId } from '../lib/helpers.js';

function buildInitial(flds, district, opts) {
  const initDistrict = district && opts.includes(district) ? district : (opts[0] || '');
  const v = {};
  flds.forEach((f) => { v[f.id] = f.type === 'district' ? initDistrict : ''; });
  return v;
}

export default function DataForm() {
  const {
    currentUser, fields, computerIds, fillDistrict,
    loadContext, loadFieldsForDistrict, setFillDistrict,
  } = useApp();
  const toast = useToast();
  const isAdmin = currentUser.role === 'admin';

  const { loading, error } = usePageData(async () => {
    const ctx = await loadContext();
    if (!isAdmin) {
      const ds = (ctx.districts || []).map((d) => d.name);
      let d = fillDistrict;
      if (!d || !ds.includes(d)) d = ds[0] || '';
      setFillDistrict(d);
      await loadFieldsForDistrict(d);
    }
  }, []);

  const opts = districtsForUser(currentUser);
  const [values, setValues] = useState({});

  // Reinitialize the form whenever the field set or selected district changes
  // (mirrors the prototype rebuilding the grid on district switch / reset).
  useEffect(() => {
    if (loading || error) return;
    setValues(buildInitial(fields, fillDistrict, opts));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, error, fields, fillDistrict, currentUser]);

  const distField = fields.find((f) => f.type === 'district');
  const schemeField = fields.find((f) => f.type === 'scheme');
  const remField = fields.find((f) => f.type === 'autoRemaining');
  const estField = fields.find((f) => f.key === 'estimatedCost');
  const expField = fields.find((f) => f.key === 'expByMarch2026');

  const districtValue = distField ? (values[distField.id] ?? '') : '';

  const setVal = (id, v) => setValues((prev) => ({ ...prev, [id]: v }));

  const onDistrictChange = async (d) => {
    setFillDistrict(d);
    if (!isAdmin) await loadFieldsForDistrict(d);
    // values are reset by the effect above (fields and/or fillDistrict changed)
  };

  const onComputerIdChange = (fid, cid) => {
    setValues((prev) => {
      const next = { ...prev, [fid]: cid };
      if (schemeField) next[schemeField.id] = schemeForComputerId(computerIds, cid);
      return next;
    });
  };

  const onNumberChange = (fid, v) => {
    setValues((prev) => {
      const next = { ...prev, [fid]: v };
      if (estField && expField && remField) {
        const a = parseFloat((next[estField.id] ?? '') || 0);
        const b = parseFloat((next[expField.id] ?? '') || 0);
        next[remField.id] = (a - b).toFixed(2);
      }
      return next;
    });
  };

  const resetForm = () => setValues(buildInitial(fields, districtValue, opts));

  const submitForm = async () => {
    const data = {};
    const missing = [];
    for (const f of fields) {
      const v = values[f.id] ?? '';
      if (f.mandatory && !v) missing.push(f.marathi);
      data[f.key] = v;
    }
    if (missing.length) { toast('Required fields missing: ' + missing.slice(0, 3).join(', '), 'err'); return; }
    const district = distField ? data[distField.key] : '';
    if (!district) { toast('District missing', 'err'); return; }
    if (!isAdmin && !currentUser.districts.includes(district)) { toast('Unauthorized district', 'err'); return; }
    try {
      await API.addSubmission(district, data);
      toast('Submission saved successfully');
      resetForm();
    } catch (err) { toast(err.message || 'Save failed', 'err'); }
  };

  if (loading) return <div className="empty">Loading…</div>;
  if (error) return <div className="notice err">{error}</div>;

  return (
    <>
      <div className="toolbar">
        <div>
          {/* <h2 className="page-title">{isAdmin ? 'Data Form' : 'Fill Daily Form'}</h2> */}
          <div className="page-sub">आर्थिक वर्ष 2026-27 · कामनिहाय योजनांतर्गत प्रलंबित देयकांची माहिती</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={resetForm}>Reset</button>
          <button className="btn btn-blue" onClick={submitForm}>💾 Save Submission</button>
        </div>
      </div>

      <div className="card">
        <div style={{ marginBottom: 14, padding: '10px 14px', background: 'var(--blue-lighter)', borderRadius: 8, fontSize: 13, color: 'var(--navy)' }}>
          <b>मंडळ कार्यालयाचे नाव:</b> {currentUser.name} &nbsp;·&nbsp; <b>आर्थिक वर्ष:</b> 2026-27
        </div>
        <div className="form-grid">
          {fields.map((f) => {
            const req = f.mandatory ? <> <span className="req">*</span></> : null;
            let input;
            if (f.type === 'district') {
              input = (
                <select value={districtValue} onChange={(e) => onDistrictChange(e.target.value)}>
                  {opts.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              );
            } else if (f.type === 'computerId') {
              input = (
                <select value={values[f.id] ?? ''} onChange={(e) => onComputerIdChange(f.id, e.target.value)}>
                  <option value="">-- Select --</option>
                  {computerIds.map((x) => <option key={x.id} value={x.computerId}>{x.computerId}</option>)}
                </select>
              );
            } else if (f.type === 'scheme') {
              input = <input disabled placeholder="Auto-filled from Computer ID" value={values[f.id] ?? ''} readOnly />;
            } else if (f.type === 'autoRemaining') {
              input = <input disabled placeholder="Auto = अंदाजित − माचे 2026" value={values[f.id] ?? ''} readOnly />;
            } else if (f.type === 'number') {
              input = <input type="number" step="0.01" value={values[f.id] ?? ''} onChange={(e) => onNumberChange(f.id, e.target.value)} />;
            } else if (f.type === 'date') {
              input = <input type="date" value={values[f.id] ?? ''} onChange={(e) => setVal(f.id, e.target.value)} />;
            } else {
              input = <input type="text" value={values[f.id] ?? ''} onChange={(e) => setVal(f.id, e.target.value)} />;
            }
            return (
              <div className="form-field" key={f.id}>
                <label>{f.marathi} <span style={{ color: '#8aa', fontWeight: 400 }}>({f.english})</span>{req}</label>
                {input}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
