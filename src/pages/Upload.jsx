import { useRef, useState } from 'react';
import { useToast } from '../context/ToastContext.jsx';
import API from '../api/client.js';

// Template Flow — Download + Upload only. The submissions grid (View / Download /
// Edit) lives in the "View Submitted Data" screen.
export default function Upload() {
  const toast = useToast();
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const saveBlob = (blob, name) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = name;
    document.body.appendChild(link); link.click(); link.remove();
    URL.revokeObjectURL(url);
  };

  const onDownloadTemplate = async () => {
    setBusy(true);
    try { saveBlob(await API.downloadTemplate(), 'MDR_Template.xlsx'); toast('Template downloaded (4 sheets)'); }
    catch (err) { toast(err.message || 'Download failed', 'err'); }
    finally { setBusy(false); }
  };

  const onUpload = async (file) => {
    setBusy(true); setResult(null);
    try {
      const res = await API.uploadTemplate(file);
      setResult(res);
      toast(res.success ? (res.message || 'Saved') : (res.message || 'Validation failed'), res.success ? 'ok' : 'err');
    } catch (err) {
      toast(err.message || 'Upload failed', 'err');
    } finally { setBusy(false); }
  };

  return (
    <>
      <div className="toolbar">
        <div>
          <h2 className="page-title">Template</h2>
          <div className="page-sub">Download the master template for your PW Circle(s), fill columns AD onwards, then upload. View saved data under “View Submitted Data”.</div>
        </div>
      </div>

      <div className="card">
        <button className="btn btn-blue" onClick={onDownloadTemplate} disabled={busy}>⬇️ Download Master Template</button>

        <div
          className="upload-zone"
          style={{ marginTop: 14 }}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files[0]) onUpload(e.dataTransfer.files[0]); }}
        >
          <div style={{ fontSize: 30 }}>⬆️</div>
          <div>{busy ? 'Working…' : 'Click or drop your filled Excel to upload'}</div>
          <div style={{ fontSize: 11.5, marginTop: 4 }}>All 4 sheets are validated. Nothing is saved unless every row is valid.</div>
          <input ref={fileRef} type="file" accept=".xlsx" style={{ display: 'none' }}
            onChange={(e) => { if (e.target.files[0]) onUpload(e.target.files[0]); e.target.value = ''; }} />
        </div>

        {result && !result.success && result.errors?.length > 0 && (
          <div className="notice err" style={{ marginTop: 14 }}>
            <div style={{ marginBottom: 8, fontWeight: 600 }}>❌ {result.message}</div>
            <div className="table-wrap" style={{ maxHeight: 260, overflow: 'auto' }}>
              <table>
                <thead><tr><th>Sheet</th><th>Row</th><th>Column</th><th>Error</th></tr></thead>
                <tbody>
                  {result.errors.map((e, i) => (
                    <tr key={i}><td>{e.sheet}</td><td>{e.row}</td><td>{e.column}</td><td>{e.error}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {result && result.success && (
          <div className="notice ok" style={{ marginTop: 14 }}>✅ {result.message} ({result.totalRecords} record(s)). See it under “View Submitted Data”.</div>
        )}
      </div>
    </>
  );
}