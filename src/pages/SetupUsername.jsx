import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { TagIcon } from '../components/Logo';

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export default function SetupUsername() {
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const [username, setUsername] = useState('');
  const [error,    setError]    = useState('');
  const [saving,   setSaving]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const val = username.trim().toLowerCase();

    if (!USERNAME_RE.test(val)) {
      setError('3–20 characters · lowercase letters, numbers, underscores only');
      return;
    }

    setSaving(true);
    setError('');

    // Check uniqueness before upsert to give a clearer error message
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', val)
      .maybeSingle();

    if (existing) {
      setError('That username is taken — try another.');
      setSaving(false);
      return;
    }

    const { error: upsertErr } = await supabase
      .from('profiles')
      .upsert({ id: user.id, username: val }, { onConflict: 'id' });

    if (upsertErr) {
      setError(upsertErr.code === '23505' ? 'That username is taken.' : upsertErr.message);
      setSaving(false);
      return;
    }

    // Signal RequireAuth to skip the DB check on the next navigation
    sessionStorage.setItem(`username_set_${user.id}`, '1');
    navigate('/dashboard', { replace: true });
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-sm">

        <div className="flex justify-center mb-6">
          <TagIcon size={40} />
        </div>

        <h1 className="text-2xl font-bold text-gray-50 text-center mb-1.5">Choose your username</h1>
        <p className="text-sm text-gray-500 text-center mb-8">
          This is how other collectors will find you.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center bg-gray-800 border border-gray-700/80 rounded-2xl overflow-hidden focus-within:border-amber-500/50 focus-within:ring-2 focus-within:ring-amber-500/20 transition-all">
              <span className="pl-4 text-gray-500 text-sm font-medium select-none">@</span>
              <input
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(''); }}
                placeholder="yourname"
                maxLength={20}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoFocus
                className="flex-1 px-2 py-3.5 text-sm text-gray-100 bg-transparent focus:outline-none placeholder-gray-600"
              />
            </div>
            <p className="text-[11px] text-gray-700 mt-1.5 ml-1">
              3–20 chars · letters, numbers, underscores
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving || !username.trim()}
            className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-gray-950 font-bold text-sm rounded-2xl transition-all disabled:opacity-40 shadow-glow-sm"
          >
            {saving ? 'Saving…' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
