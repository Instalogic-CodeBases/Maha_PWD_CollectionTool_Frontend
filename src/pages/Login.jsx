import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';

export default function Login() {
  const { login } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(email.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-emblem">म</div>
        <div className="login-title-mr">महाराष्ट्र राज्य रस्ते विकास</div>
        <div className="login-title-en">PWD Data Collection &amp; Reporting</div>
        <form onSubmit={onSubmit}>
          <div className="field">
            <label>Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary">Login</button>
          {error && <div className="login-err">{error}</div>}
        </form>
        <div className="login-hint">
          Enter the email &amp; password provided by your administrator to sign in.
        </div>
      </div>
    </div>
  );
}
