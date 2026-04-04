'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import './login.css';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function login() {
    if (loading) return;

    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password.');
      return;
    }

    setLoading(true);

    try {
      const body = new URLSearchParams();
      body.append('username', email.trim());
      body.append('password', password);

      const res = await fetch('http://127.0.0.1:8000/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!res.ok) {
        throw new Error('Invalid email or password');
      }

      const data = await res.json();

      if (!data.access_token) {
        throw new Error('Authentication failed');
      }

      // ✅ FIX START
      localStorage.setItem('token', data.access_token); // 🔥 REQUIRED
      localStorage.setItem('access_token', data.access_token); // optional (keep both)

      // OPTIONAL (for email sending)
      localStorage.setItem('user', JSON.stringify({ email }));
      // ✅ FIX END

      router.push('/dashboard');
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError('Login failed');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">🛡 AttackSurface SOC</h1>

        <p className="login-subtitle">Enterprise Threat Intelligence Console</p>

        {error && <div className="login-error">{error}</div>}

        <form
          autoComplete="off"
          onSubmit={(e) => {
            e.preventDefault();
            login();
          }}
        >
          <input
            type="email"
            placeholder="admin@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="login-footer">
          <span>New user?</span>
          <a href="/register">Create Account</a>
        </div>
      </div>
    </div>
  );
}
