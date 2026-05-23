import { useState } from 'react';
import { useSearchParams, Link, Navigate } from 'react-router-dom';
import api from '../../lib/api';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!email || !token) return <Navigate to="/forgot-password" replace />;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      await api.post('/api/auth/reset-password-with-token', { email, token, password });
      setMessage('Password reset successfully!');
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Reset Password</h1>
      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded">{error}</div>}
      {message && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded">{message}</div>}
      {!message && (
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">New Password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded px-3 py-2"
              type="password"
              minLength={8}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Confirm Password</label>
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full border rounded px-3 py-2"
              type="password"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded font-medium disabled:opacity-50"
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      )}
      {message && (
        <p className="mt-4 text-sm text-center">
          <Link to="/login" className="text-blue-600">Sign In</Link>
        </p>
      )}
    </div>
  );
}
