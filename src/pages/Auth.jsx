import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { TagIcon } from '../components/Logo';

export default function Auth() {
  const { session } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const from = location.state?.from?.pathname ?? '/dashboard';

  const [mode, setMode] = useState(location.state?.mode ?? 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  if (session) return <Navigate to={from} replace />;

  function switchMode(m) {
    setMode(m);
    setError(null);
    setInfo(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
      } else if (data.session) {
        navigate(from, { replace: true });
      } else {
        setInfo('Account created! Check your email to confirm, then sign in.');
        setMode('signin');
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      } else {
        navigate(from, { replace: true });
      }
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 relative overflow-hidden">
      <div className="w-full max-w-sm relative">
        {/* Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-900 border-2 border-gray-800 mb-5">
            <TagIcon size={32} />
          </div>
          <h1 className="font-display text-3xl text-gray-50 mb-1">Tag Charting</h1>
          <p className="font-sans text-sm text-gray-500">Your personal collection tracker</p>
        </div>

        <div className="border-2 border-gray-800 bg-gray-900 p-8">
          {/* Mode toggle */}
          <div className="flex bg-gray-800 border-2 border-gray-700 p-1 mb-7 gap-1">
            {[
              { key: 'signin', label: 'Sign in' },
              { key: 'signup', label: 'Create account' },
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => switchMode(key)}
                className={`flex-1 py-2 font-condensed text-xs font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  mode === key
                    ? 'bg-gray-700 text-gray-100'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="block font-condensed text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-gray-800 border-2 border-gray-700 px-4 py-2.5 font-sans text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-all duration-150"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block font-condensed text-xs font-semibold text-gray-400 uppercase tracking-wider">Password</label>
              <input
                id="password"
                type="password"
                required
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'Min. 6 characters' : '••••••••'}
                className="w-full bg-gray-800 border-2 border-gray-700 px-4 py-2.5 font-sans text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-all duration-150"
              />
            </div>

            {error && (
              <div className="font-sans text-sm text-red-400 bg-red-500/10 border-2 border-red-500/20 px-4 py-3">
                {error}
              </div>
            )}
            {info && (
              <div className="font-sans text-sm text-emerald-400 bg-emerald-500/10 border-2 border-emerald-500/20 px-4 py-3">
                {info}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-1 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-condensed font-bold text-sm uppercase tracking-[0.15em] transition-all duration-150 disabled:opacity-40 cursor-pointer"
            >
              {loading ? '…' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
