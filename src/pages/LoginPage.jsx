import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/layout/Toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const showToast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      showToast('success', 'Welcome back!', 'Login successful.');
      // After login, the ProtectedRoute will handle redirection based on role/permissions.
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Login failed';
      showToast('error', 'Login failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-6">
          <i className="fas fa-qrcode text-orange-500 text-4xl mb-2"></i>
          <h2 className="text-2xl font-bold text-gray-800">Welcome back</h2>
          <p className="text-xs text-gray-400 mt-1">Log in to your QRCODE.NG account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full mt-1 border border-gray-200 rounded-lg p-2.5 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full mt-1 border border-gray-200 rounded-lg p-2.5 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 text-white py-2.5 rounded-lg font-semibold hover:bg-orange-600 transition disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i> Logging in…
              </>
            ) : (
              'Log in'
            )}
          </button>
        </form>

        {/* Optional: Forgot password link (commented out) */}
        {/* <p className="text-xs text-gray-400 text-center mt-4">
          <Link to="/forgot-password" className="text-orange-500 hover:underline">Forgot password?</Link>
        </p> */}
      </div>
    </div>
  );
}