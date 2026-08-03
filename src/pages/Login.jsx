import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import API from '../api/client.js';
import { PwdLogo } from '../components/Icons.jsx';

export default function Login() {
  const { login, circleLogin } = useApp();
  const navigate = useNavigate();

  // 'circle' = officer/user login (default). 'admin' = existing email login.
  const [mode, setMode] = useState('circle');

  // circle login
  const [circles, setCircles] = useState([]);
  const [circleId, setCircleId] = useState('');

  // admin (email) login
  const [email, setEmail] = useState('');

  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try { setCircles(await API.loginCircles() || []); }
      catch { setCircles([]); }
    })();
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      if (mode === 'admin') {
        // -------- Super Admin login (existing email/username flow — unchanged) --------
        await login(email.trim(), password);
      } else {
        // -------- User/Officer login: Circle + Password --------
        if (!circleId) { setError('Please select a Circle.'); setBusy(false); return; }
        await circleLogin(Number(circleId), password);
      }
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || (mode === 'admin' ? 'Invalid email or password.' : 'Invalid circle or password.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        {/* Official PWD Maharashtra logo: drop the file at public/pwd-logo.png and it
            appears automatically (falls back to the crest until then). See Icons.jsx. */}
        <div className="login-emblem" style={{ background: '#fff', padding: 4 }}><PwdLogo size={54} /></div>
        <div className="login-title-mr">Public Works Department</div>
        <div className="login-title-en">Government of Maharashtra · Data Collection &amp; Reporting Portal</div>

        <form onSubmit={onSubmit}>
          {mode === 'circle' ? (
            <div className="field">
              <label>Circle</label>
              <select required value={circleId} onChange={(e) => setCircleId(e.target.value)}>
                <option value="">Select Circle</option>
                {circles.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          ) : (
            /* -------- Email/Username login (retained for Super Admin) --------
               Kept intentionally so it can remain the admin path / be re-enabled. */
            <div className="field">
              <label>Email</label>
              <input type="email" required placeholder="Enter Email" value={email}
                onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
            </div>
          )}

          <div className="field">
            <label>Password</label>
            <input type="password" required placeholder="Enter Password" value={password}
              onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </div>

          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'Signing in…' : 'Login'}
          </button>
          {error && <div className="login-err">{error}</div>}
        </form>

        <div className="login-hint">
          {mode === 'circle'
            ? 'Select your Circle and enter the password provided by your administrator.'
            : 'Administrator sign-in with your email and password.'}
        </div>

        <div style={{ marginTop: 14, textAlign: 'center' }}>
          <a style={{ cursor: 'pointer', fontSize: 12.5, color: 'var(--blue)', fontWeight: 600, textDecoration: 'underline' }} onClick={() => { setError(''); setPassword(''); setMode(mode === 'circle' ? 'admin' : 'circle'); }}>
            {mode === 'circle' ? 'Sign in as Administrator' : '← Back to Circle login'}
          </a>
        </div>
      </div>
    </div>
  );
}