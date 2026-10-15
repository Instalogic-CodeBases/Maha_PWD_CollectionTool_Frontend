import { useRef, useState } from 'react';
import { useToast } from '../context/ToastContext.jsx';
import API from '../api/client.js';

// Soft Loan 5 Year PWD Legacy Data Flow — Download + Upload
export default function SoftLoanUpload() {
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
    try {
      saveBlob(await API.downloadSoftLoanTemplate(), 'Soft_Loan_5_Year_PWD_Template.xlsx');
      toast('Soft Loan Master Template downloaded (8 sheets)');
    } catch (err) {
      toast(err.message || 'Download failed', 'err');
    } finally {
      setBusy(false);
    }
  };

  const onUpload = async (file) => {
    setBusy(true); setResult(null);
    try {
      const res = await API.uploadSoftLoanTemplate(file);
      setResult(res);
      toast(res.success ? (res.message || 'Saved') : (res.message || 'Validation failed'), res.success ? 'ok' : 'err');
    } catch (err) {
      toast(err.message || 'Upload failed', 'err');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="card">
        <button className="btn btn-blue" onClick={onDownloadTemplate} disabled={busy}>
          ⬇️ Download Soft Loan Master Template
        </button>

        <div
          className="upload-zone"
          style={{ marginTop: 14 }}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files[0]) onUpload(e.dataTransfer.files[0]); }}
        >
          <div style={{ fontSize: 30 }}>⬆️</div>
          <div>{busy ? 'Working…' : 'Click or drop your filled Soft Loan Excel to upload'}</div>
          <div style={{ fontSize: 11.5, marginTop: 4 }}>All 8 sheets are validated. Nothing is saved unless every row is valid.</div>
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
          <div className="notice ok" style={{ marginTop: 14 }}>
            ✅ {result.message} ({result.totalRecords} record(s)).
          </div>
        )}
      </div>
    </>
  );
}
