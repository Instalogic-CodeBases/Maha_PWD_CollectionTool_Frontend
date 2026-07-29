import { useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { useApp } from '../context/AppContext.jsx';
import { usePageData } from '../lib/usePageData.js';
import { useToast } from '../context/ToastContext.jsx';
import API from '../api/client.js';
import { districtsForUser, resolveDistrict } from '../lib/helpers.js';
import { downloadExcelTemplate } from '../lib/excel.js';

export default function Upload() {
  const {
    currentUser, fields, computerIds, submissions, fillDistrict,
    loadContext, loadFieldsForDistrict, setFillDistrict,
  } = useApp();
  const toast = useToast();
  const isAdmin = currentUser.role === 'admin';
  const uDist = districtsForUser(currentUser);

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

  const [upDistrict, setUpDistrict] = useState('');
  const [result, setResult] = useState(null); // { kind, errors?, text? }
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef(null);

  // Initialize the district select from fillDistrict once loaded.
  useEffect(() => {
    if (loading || error) return;
    setUpDistrict((cur) => (cur === '' ? (fillDistrict || uDist[0] || '') : cur));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, error, fillDistrict]);

  const onUploadDistrictChange = async (d) => {
    setUpDistrict(d);
    if (!isAdmin) await loadFieldsForDistrict(d);
  };

  const showUpErrors = (errs) => {
    setResult({ kind: 'err', errors: errs.slice(0, 50), count: errs.length });
    toast('Validation failed', 'err');
  };

  const handleUpload = (file) => {
    const district = upDistrict;
    if (!isAdmin && !currentUser.districts.includes(district)) {
      return showUpErrors(['You can only upload data for your assigned district(s): ' + currentUser.districts.join(', ') + '.']);
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        const errors = [];
        const parsed = [];
        let hIdx = rows.findIndex((r) => r.some((c) => String(c).includes('अ.क्र')));
        if (hIdx < 0) { errors.push('Invalid template — could not find header row (अ.क्र.).'); return showUpErrors(errors); }
        const header = rows[hIdx].map((x) => String(x).trim());
        const colMap = {};
        fields.forEach((f) => { colMap[f.id] = header.indexOf(f.marathi); });
        const dataStart = hIdx + 2; // skip numbering row
        for (let ri = dataStart; ri < rows.length; ri++) {
          const r = rows[ri];
          if (!r || r.every((c) => String(c).trim() === '')) continue;
          const rowNo = ri + 1;
          const rec = {};
          let hasAny = false;
          for (const f of fields) {
            const ci = colMap[f.id];
            let v = ci >= 0 ? r[ci] : '';
            if (v == null) v = '';
            rec[f.key] = String(v).trim();
            if (rec[f.key]) hasAny = true;
          }
          if (!hasAny) continue;
          for (const f of fields) {
            if (f.mandatory && !rec[f.key] && f.type !== 'autoRemaining' && f.type !== 'scheme') {
              errors.push(`Row ${rowNo}: Required field "${f.marathi}" is missing.`);
            }
            if (f.type === 'number' && rec[f.key] && isNaN(parseFloat(rec[f.key]))) {
              errors.push(`Row ${rowNo}: "${f.marathi}" must be a numeric value in Lakhs.`);
            }
            if (f.type === 'district' && rec[f.key]) {
              const canonical = resolveDistrict(rec[f.key]);
              if (!canonical) {
                errors.push(`Row ${rowNo}: Unrecognized district "${rec[f.key]}".`);
              } else if (!isAdmin && !currentUser.districts.includes(canonical)) {
                errors.push(`Row ${rowNo}: You can only upload data for your assigned district(s): ${currentUser.districts.join(', ')}.`);
              } else {
                rec[f.key] = canonical;
              }
            }
            if (f.type === 'computerId' && rec[f.key]) {
              const c = computerIds.find((x) => x.computerId === rec[f.key]);
              if (!c) errors.push(`Row ${rowNo}: Invalid Computer ID "${rec[f.key]}".`);
              else {
                const schemeF = fields.find((x) => x.type === 'scheme');
                if (schemeF) {
                  if (!rec[schemeF.key]) rec[schemeF.key] = c.schemeName;
                  else if (rec[schemeF.key] !== c.schemeName) errors.push(`Row ${rowNo}: Invalid scheme mapping — Computer ID ${c.computerId} must map to "${c.schemeName}".`);
                }
              }
            }
          }
          const estF = fields.find((f) => f.key === 'estimatedCost');
          const expF = fields.find((f) => f.key === 'expByMarch2026');
          const remF = fields.find((f) => f.type === 'autoRemaining');
          if (estF && expF && remF) { const a = parseFloat(rec[estF.key] || 0); const b = parseFloat(rec[expF.key] || 0); rec[remF.key] = (a - b).toFixed(2); }
          const distF0 = fields.find((f) => f.type === 'district');
          const rowDistrict = distF0 ? (rec[distF0.key] || district) : district;
          const workIdF = fields.find((f) => f.key === 'workId');
          const cidF = fields.find((f) => f.type === 'computerId');
          const wkey = workIdF ? rec[workIdF.key] : '';
          const cidVal = cidF ? rec[cidF.key] : '';
          if (submissions.some((s) => s.district === rowDistrict && s.data[cidF?.key] === cidVal && s.data[workIdF?.key] === wkey && wkey)) {
            errors.push(`Row ${rowNo}: Duplicate entry (Computer ID ${cidVal}, Work ID ${wkey}) already exists.`);
          }
          parsed.push(rec);
        }
        if (errors.length) return showUpErrors(errors);
        // commit — POST each unique parsed row to the API
        const distF = fields.find((f) => f.type === 'district');
        const seen = new Set();
        const toSend = [];
        parsed.forEach((rec) => {
          const rowDistrict = distF ? (rec[distF.key] || district) : district;
          if (distF) rec[distF.key] = rowDistrict;
          const cidF2 = fields.find((f) => f.type === 'computerId');
          const workIdF2 = fields.find((f) => f.key === 'workId');
          const fp = rowDistrict + '|' + (cidF2 ? rec[cidF2.key] : '') + '|' + (workIdF2 ? rec[workIdF2.key] : '');
          if (seen.has(fp)) return;
          seen.add(fp);
          toSend.push({ district: rowDistrict, data: rec });
        });
        (async () => {
          let ok = 0;
          const fails = [];
          for (const item of toSend) {
            try { await API.addSubmission(item.district, item.data); ok++; }
            catch (err) { fails.push(err.message || 'row failed'); }
          }
          if (fails.length) {
            setResult({ kind: 'warn', text: `Uploaded ${ok}/${toSend.length}. ${fails.length} row(s) failed: ${fails.slice(0, 5).join('; ')}` });
          } else {
            setResult({ kind: 'ok', text: `✅ ${ok} row(s) uploaded successfully for ${district}.` });
          }
          toast(ok + ' rows uploaded');
        })();
      } catch (err) {
        showUpErrors(['Failed to read file: ' + err.message]);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const onDownloadTemplate = async () => {
    try {
      await downloadExcelTemplate(fields, computerIds, uDist);
      toast('Excel template downloaded');
    } catch (err) { toast(err.message || 'Download failed', 'err'); }
  };

  if (loading) return <div className="empty">Loading…</div>;
  if (error) return <div className="notice err">{error}</div>;

  return (
    <>
      <div className="toolbar">
        <div>
          {/* <h2 className="page-title">Upload Excel</h2> */}
          <div className="page-sub">Select district, download template, fill it, save, and upload.</div>
        </div>
      </div>
      <div className="card">
        <div className="form-grid" style={{ marginBottom: 14 }}>
          <div className="form-field">
            <label>District <span className="req">*</span></label>
            <select value={upDistrict} onChange={(e) => onUploadDistrictChange(e.target.value)}>
              {uDist.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="form-field" style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <button className="btn btn-blue" onClick={onDownloadTemplate}>⬇️ Download Template</button>
          </div>
        </div>

        <div
          className="upload-zone"
          style={dragging ? { borderColor: 'var(--blue)' } : undefined}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files[0]) handleUpload(e.dataTransfer.files[0]); }}
        >
          <div style={{ fontSize: 32 }}>⬆️</div>
          <div>Click or drop your filled Excel here</div>
          <div style={{ fontSize: 11.5, marginTop: 4 }}>Backend validation runs after upload.</div>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            onChange={(e) => { if (e.target.files[0]) handleUpload(e.target.files[0]); e.target.value = ''; }}
          />
        </div>

        {result && (
          <div style={{ marginTop: 14 }}>
            {result.kind === 'err' && (
              <div className="notice err">
                <div style={{ marginBottom: 6 }}>❌ Upload validation failed ({result.count}):</div>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}
            {result.kind === 'ok' && <div className="notice ok">{result.text}</div>}
            {result.kind === 'warn' && <div className="notice warn">{result.text}</div>}
          </div>
        )}
      </div>
    </>
  );
}
