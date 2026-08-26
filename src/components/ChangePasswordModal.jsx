import { useState } from 'react';
import Modal from './Modal.jsx';
import { useToast } from '../context/ToastContext.jsx';
import API from '../api/client.js';

// Basic strength: length + variety. Returns { score 0-4, label, ok }.
function strength(pw) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  const label = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'][s];
  return { score: s, label, ok: pw.length >= 6 };
}

export default function ChangePasswordModal({ open, onClose }) {
  const toast = useToast();
  const [cur, setCur] = useState('');
  const [nw, setNw] = useState('');
  const [cf, setCf] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const st = strength(nw);
  const reset = () => { setCur(''); setNw(''); setCf(''); setErr(''); setBusy(false); };
  const close = () => { reset(); onClose(); };

  const submit = async () => {
    setErr('');
    if (!cur) return setErr('Please enter your current password.');
    if (nw.length < 6) return setErr('New password must be at least 6 characters long.');
    if (nw === cur) return setErr('New password must be different from the current password.');
    if (nw !== cf) return setErr('New password and confirmation do not match.');
    setBusy(true);
    try {
      const res = await API.changePassword({ currentPassword: cur, newPassword: nw, confirmPassword: cf });
      if (res && res.success) { toast(res.message || 'Password changed successfully.', 'ok'); close(); }
      else { setErr((res && res.message) || 'Could not change password.'); }
    } catch (e) {
      setErr(e.message || 'Could not change password.');
    } finally { setBusy(false); }
  };

  const bar = ['#e11d48', '#f59e0b', '#f59e0b', '#16a34a', '#16a34a'][st.score] || '#e5e7eb';

  return (
    <Modal
      open={open}
      title="Change Password"
      onClose={close}
      footer={<>
        <button className="btn" onClick={close} disabled={busy}>Cancel</button>
        <button className="btn btn-blue" onClick={submit} disabled={busy}>{busy ? 'Saving…' : 'Update Password'}</button>
      </>}
    >
      <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
        <div className="form-field">
          <label>Current Password <span className="req">*</span></label>
          <input type="password" placeholder="Enter Current Password" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" />
        </div>
        <div className="form-field">
          <label>New Password <span className="req">*</span></label>
          <input type="password" placeholder="Enter New Password" value={nw} onChange={(e) => setNw(e.target.value)} autoComplete="new-password" />
          {nw && (
            <div style={{ marginTop: 6 }}>
              <div style={{ height: 6, borderRadius: 4, background: '#eef2f7', overflow: 'hidden' }}>
                <div style={{ width: `${(st.score / 4) * 100}%`, height: '100%', background: bar, transition: 'width .2s' }} />
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4 }}>Strength: {st.label} · use 8+ chars with upper/lowercase, a number, and a symbol.</div>
            </div>
          )}
        </div>
        <div className="form-field">
          <label>Confirm New Password <span className="req">*</span></label>
          <input type="password" placeholder="Re-enter New Password" value={cf} onChange={(e) => setCf(e.target.value)} autoComplete="new-password" />
          {cf && nw !== cf && <div style={{ fontSize: 11.5, color: '#e11d48', marginTop: 4 }}>Passwords do not match.</div>}
        </div>
        {err && <div className="notice err" style={{ marginTop: 2 }}>{err}</div>}
      </div>
    </Modal>
  );
}