import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

// ─── Constants ────────────────────────────────────────────────────────────────

const STYLE_LABELS = {
  band_tee: 'Band Tees', sports: 'Sports',
  workwear: 'Workwear', souvenir: 'Souvenir', other: 'Other',
};

const fmt = (n) =>
  `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

// ─── Image compression (mirrors AddEditShirt) ─────────────────────────────────

async function compressImage(file, maxPx = 400) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const ratio = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => blob
          ? resolve(new File([blob], 'avatar.webp', { type: 'image/webp' }))
          : resolve(file),
        'image/webp', 0.85,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 rounded-full border-2 border-gray-800 border-t-amber-400 animate-spin" />
    </div>
  );
}

function SectionHead({ children, action }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800/60">
      <h2 className="text-sm font-semibold text-gray-100">{children}</h2>
      {action}
    </div>
  );
}

// ─── Showcase Picker (bottom sheet) ──────────────────────────────────────────

function ShowcasePicker({ shirts, current, onSave, onClose }) {
  const [selected, setSelected] = useState(new Set(current));

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); return next; }
      if (next.size >= 5) return prev;
      next.add(id);
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div
        className="absolute inset-0 bg-gray-950/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-gray-900 rounded-t-3xl border-t border-gray-800/60 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800/60 flex-shrink-0">
          <div>
            <p className="font-semibold text-gray-100 text-sm">Pin to Showcase</p>
            <p className="text-xs text-gray-500 mt-0.5">{selected.size}/5 selected</p>
          </div>
          <button
            onClick={() => onSave([...selected])}
            className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold text-xs rounded-xl transition-all"
          >
            Done
          </button>
        </div>

        {shirts.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <p className="text-gray-600 text-sm">No shirts in your collection yet.</p>
          </div>
        ) : (
          <div className="overflow-y-auto p-4 grid grid-cols-3 gap-3">
            {shirts.map((shirt) => {
              const photo = shirt.photos?.find((p) => p.slot === 'front')?.url;
              const sel = selected.has(shirt.id);
              const disabled = !sel && selected.size >= 5;
              return (
                <button
                  key={shirt.id}
                  type="button"
                  onClick={() => toggle(shirt.id)}
                  disabled={disabled}
                  className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                    sel
                      ? 'border-amber-500 ring-1 ring-amber-500/30'
                      : disabled
                        ? 'border-transparent opacity-35'
                        : 'border-transparent opacity-70 hover:opacity-90'
                  }`}
                >
                  {photo ? (
                    <img src={photo} alt={shirt.brand} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                      <span className="text-[10px] text-gray-500 px-1 text-center leading-tight">{shirt.brand}</span>
                    </div>
                  )}
                  {sel && (
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center shadow-sm">
                      <svg className="w-3 h-3 text-gray-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  // ── Data state ──────────────────────────────────────────────────────────────
  const [profile, setProfile]             = useState(null);
  const [shirts, setShirts]               = useState([]);
  const [showcaseShirts, setShowcaseShirts] = useState([]);
  const [friends, setFriends]             = useState([]);
  const [stats, setStats]                 = useState(null);
  const [loading, setLoading]             = useState(true);

  // ── Edit mode ───────────────────────────────────────────────────────────────
  const [editing, setEditing]     = useState(false);
  const [draft, setDraft]         = useState({ username: '', bio: '' });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState(null);
  const avatarInputRef            = useRef(null);

  // ── Friends ─────────────────────────────────────────────────────────────────
  const [addFriendInput, setAddFriendInput] = useState('');
  const [addFriendMsg, setAddFriendMsg]     = useState(null); // {type:'ok'|'err', text}

  // ── Showcase picker ─────────────────────────────────────────────────────────
  const [showPicker, setShowPicker] = useState(false);

  // ── Privacy ─────────────────────────────────────────────────────────────────
  const privacyMode = localStorage.getItem('privacyMode') === 'true';

  // ── Load ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    loadAll();
    // loadAll only needs to re-run when the authenticated user changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Clean up avatar preview blob
  useEffect(() => {
    if (!avatarFile) { setAvatarPreview(null); return; }
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  async function loadAll() {
    setLoading(true);

    const [profileRes, shirtsRes, friendRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('shirts').select('id, brand, style, condition, current_value, purchase_price, photos, created_at').order('created_at', { ascending: false }),
      supabase.from('friendships').select('friend_id').eq('user_id', user.id),
    ]);

    const prof = profileRes.data ?? null;
    setProfile(prof);
    setDraft({ username: prof?.username ?? '', bio: prof?.bio ?? '' });

    const allShirts = shirtsRes.data ?? [];
    setShirts(allShirts);

    // Compute stats
    const totalValue = allShirts.reduce((s, r) => s + (r.current_value ?? 0), 0);
    const totalCost  = allShirts.reduce((s, r) => s + (r.purchase_price ?? 0), 0);
    const gain       = totalValue - totalCost;
    const gainPct    = totalCost > 0 ? (gain / totalCost) * 100 : null;
    const byStyle    = {};
    for (const r of allShirts) byStyle[r.style] = (byStyle[r.style] ?? 0) + 1;
    const topValue   = [...allShirts].sort((a, b) => (b.current_value ?? 0) - (a.current_value ?? 0))[0] ?? null;
    setStats({ count: allShirts.length, totalValue, totalCost, gain, gainPct, byStyle, topValue });

    // Showcase shirts
    const ids = prof?.showcase_shirt_ids ?? [];
    if (ids.length > 0) {
      const { data: sc } = await supabase.from('shirts').select('id, brand, photos, current_value').in('id', ids);
      // Preserve pinned order
      const map = Object.fromEntries((sc ?? []).map((s) => [s.id, s]));
      setShowcaseShirts(ids.map((id) => map[id]).filter(Boolean));
    }

    // Friends — fetch their profiles
    const friendIds = (friendRes.data ?? []).map((f) => f.friend_id);
    if (friendIds.length > 0) {
      const { data: friendProfiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', friendIds);
      setFriends(friendProfiles ?? []);
    } else {
      setFriends([]);
    }

    setLoading(false);
  }

  // ── Save profile ────────────────────────────────────────────────────────────
  async function saveProfile() {
    setSaving(true);
    setSaveError(null);

    if (draft.username && !USERNAME_RE.test(draft.username)) {
      setSaveError('Username: 3-20 chars, lowercase letters, numbers, underscores only.');
      setSaving(false);
      return;
    }

    let avatarUrl = profile?.avatar_url ?? null;

    if (avatarFile) {
      const compressed = await compressImage(avatarFile);
      const path = `avatars/${user.id}`;
      const { error: uploadErr } = await supabase.storage
        .from('shirt-photos')
        .upload(path, compressed, { upsert: true, contentType: 'image/webp' });
      if (!uploadErr) {
        const { data: { publicUrl } } = supabase.storage.from('shirt-photos').getPublicUrl(path);
        avatarUrl = `${publicUrl}?v=${Date.now()}`;
      }
    }

    const payload = {
      id: user.id,
      username: draft.username.trim().toLowerCase() || null,
      bio: draft.bio.trim() || null,
      avatar_url: avatarUrl,
      showcase_shirt_ids: profile?.showcase_shirt_ids ?? [],
    };

    const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });

    if (error) {
      setSaveError(error.code === '23505' ? 'That username is already taken.' : error.message);
    } else {
      setProfile((p) => ({ ...p, ...payload }));
      setAvatarFile(null);
      setEditing(false);
    }
    setSaving(false);
  }

  // ── Showcase ────────────────────────────────────────────────────────────────
  async function saveShowcase(ids) {
    setShowPicker(false);
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, showcase_shirt_ids: ids }, { onConflict: 'id' });
    if (error) return;
    setProfile((p) => ({ ...p, showcase_shirt_ids: ids }));
    const map = Object.fromEntries(shirts.map((s) => [s.id, s]));
    setShowcaseShirts(ids.map((id) => map[id]).filter(Boolean));
  }

  // ── Friends ─────────────────────────────────────────────────────────────────
  async function addFriend(e) {
    e.preventDefault();
    const username = addFriendInput.trim().toLowerCase();
    if (!username) return;
    setAddFriendMsg(null);

    const { data: target } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (!target) {
      setAddFriendMsg({ type: 'err', text: `No user found with username @${username}.` });
      return;
    }
    if (target.id === user.id) {
      setAddFriendMsg({ type: 'err', text: "You can't follow yourself." });
      return;
    }

    const { error } = await supabase
      .from('friendships')
      .insert({ user_id: user.id, friend_id: target.id });

    if (error) {
      const msg = error.code === '23505' ? `Already following @${username}.` : error.message;
      setAddFriendMsg({ type: 'err', text: msg });
      return;
    }

    setAddFriendMsg({ type: 'ok', text: `Now following @${username}!` });
    setAddFriendInput('');

    // Refresh friends
    const { data: fp } = await supabase
      .from('profiles').select('id, username, avatar_url').eq('id', target.id).maybeSingle();
    if (fp) setFriends((prev) => [...prev, fp]);
  }

  async function removeFriend(friendId) {
    await supabase.from('friendships').delete().eq('user_id', user.id).eq('friend_id', friendId);
    setFriends((prev) => prev.filter((f) => f.id !== friendId));
  }

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) return <Spinner />;

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

  const displayAvatar = avatarPreview ?? profile?.avatar_url ?? null;
  const displayName   = profile?.username ? `@${profile.username}` : user?.email?.split('@')[0] ?? '?';
  const initials      = displayName.replace('@', '').slice(0, 2).toUpperCase();

  return (
    <div className="max-w-lg space-y-5 pb-8">

      {/* ── Profile header ─────────────────────────────────────────────────── */}
      <section className="bg-gray-900 rounded-2xl border border-gray-800/60 overflow-hidden">

        {/* Amber gradient bar */}
        <div className="h-24 bg-gradient-to-br from-amber-900/40 via-gray-900 to-gray-900 relative">
          {!editing && (
            <button
              onClick={() => { setDraft({ username: profile?.username ?? '', bio: profile?.bio ?? '' }); setEditing(true); }}
              className="absolute top-3 right-3 px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-gray-200 bg-gray-800/70 hover:bg-gray-700/80 border border-gray-700/50 rounded-lg transition-all backdrop-blur-sm"
            >
              Edit Profile
            </button>
          )}
        </div>

        <div className="px-5 pb-5 -mt-12">
          {/* Avatar */}
          <div className="relative w-20 h-20 mb-3">
            <div className="w-20 h-20 rounded-2xl ring-4 ring-gray-900 overflow-hidden bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
              {displayAvatar ? (
                <img src={displayAvatar} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-amber-400">{initials}</span>
              )}
            </div>
            {editing && (
              <>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-amber-500 hover:bg-amber-400 border-2 border-gray-900 flex items-center justify-center transition-all"
                  aria-label="Upload photo"
                >
                  <svg className="w-3.5 h-3.5 text-gray-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) setAvatarFile(f); e.target.value = ''; }}
                />
              </>
            )}
          </div>

          {/* Name + bio (view or edit) */}
          {editing ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
                  Username
                </label>
                <div className="flex items-center bg-gray-800 border border-gray-700/80 rounded-xl overflow-hidden">
                  <span className="pl-3 text-gray-600 text-sm">@</span>
                  <input
                    value={draft.username}
                    onChange={(e) => setDraft((d) => ({ ...d, username: e.target.value }))}
                    placeholder="yourname"
                    maxLength={20}
                    className="flex-1 px-2 py-2.5 text-sm text-gray-100 bg-transparent focus:outline-none placeholder-gray-600"
                  />
                </div>
                <p className="text-[10px] text-gray-700">Lowercase letters, numbers, underscores · 3-20 chars</p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Bio</label>
                <textarea
                  value={draft.bio}
                  onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))}
                  rows={2}
                  maxLength={160}
                  placeholder="Tell people about your collection…"
                  className="w-full bg-gray-800 border border-gray-700/80 rounded-xl px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40 resize-none"
                />
                <p className="text-[10px] text-gray-700 text-right">{draft.bio.length}/160</p>
              </div>

              {saveError && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                  {saveError}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold text-sm rounded-xl transition-all disabled:opacity-40 shadow-glow-sm"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => { setEditing(false); setAvatarFile(null); setSaveError(null); }}
                  disabled={saving}
                  className="px-5 py-2 border border-gray-700 text-gray-500 hover:text-gray-200 hover:border-gray-600 font-semibold text-sm rounded-xl transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-lg font-bold text-gray-50">{displayName}</p>
              {profile?.bio ? (
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">{profile.bio}</p>
              ) : (
                <p className="text-sm text-gray-700 mt-1 italic">No bio yet.</p>
              )}
              {memberSince && (
                <p className="text-xs text-gray-700 mt-2">Member since {memberSince}</p>
              )}
            </>
          )}
        </div>
      </section>

      {/* ── Public stats ───────────────────────────────────────────────────── */}
      {stats && (
        <section className="bg-gray-900 rounded-2xl border border-gray-800/60 overflow-hidden">
          <SectionHead>Collection Stats</SectionHead>

          <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-gray-800/60">
            {[
              { label: 'Shirts',      val: stats.count,      color: 'text-gray-100',  fmt: (v) => v },
              { label: 'Value',       val: stats.totalValue, color: 'text-amber-400', fmt: (v) => privacyMode ? '••••' : fmt(v) },
              { label: 'Cost Basis',  val: stats.totalCost,  color: 'text-gray-100',  fmt: (v) => privacyMode ? '••••' : fmt(v) },
              {
                label: 'Return',
                val: stats.gainPct,
                color: stats.gainPct == null ? 'text-gray-100' : stats.gainPct >= 0 ? 'text-emerald-400' : 'text-red-400',
                fmt: (v) => privacyMode ? '••%' : v != null ? `${v >= 0 ? '+' : ''}${v.toFixed(1)}%` : '—',
              },
            ].map(({ label, val, color, fmt: f }, i, arr) => (
              <div
                key={label}
                className={`flex flex-col items-center gap-1 p-4 ${
                  i < arr.length - 1 ? 'border-r border-gray-800/60' : ''
                } ${i < 2 ? 'border-b sm:border-b-0' : ''}`}
              >
                <span className={`text-xl font-bold tabular-nums ${color}`}>{f(val)}</span>
                <span className="text-[11px] text-gray-500">{label}</span>
              </div>
            ))}
          </div>

          {/* Style breakdown */}
          {Object.keys(stats.byStyle).length > 0 && (
            <div className="px-5 py-4 space-y-2.5">
              {Object.entries(stats.byStyle)
                .sort((a, b) => b[1] - a[1])
                .map(([style, count]) => {
                  const pct = Math.round((count / stats.count) * 100);
                  return (
                    <div key={style} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">{STYLE_LABELS[style] ?? style}</span>
                        <span className="text-gray-500 tabular-nums">{count} · {pct}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500/70 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* Collection highlights */}
          {stats.topValue && (
            <div className="border-t border-gray-800/60 px-5 py-4 space-y-1.5">
              <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">Top Piece</p>
              <Link
                to={`/shirts/${stats.topValue.id}`}
                className="flex items-center justify-between group"
              >
                <span className="text-sm font-semibold text-gray-300 group-hover:text-amber-400 transition-colors">
                  {stats.topValue.brand}
                </span>
                <span className="text-sm font-bold text-amber-400 tabular-nums">
                  {privacyMode ? '••••' : fmt(stats.topValue.current_value)}
                </span>
              </Link>
            </div>
          )}
        </section>
      )}

      {/* ── Showcase ───────────────────────────────────────────────────────── */}
      <section className="bg-gray-900 rounded-2xl border border-gray-800/60 overflow-hidden">
        <SectionHead
          action={
            <button
              onClick={() => setShowPicker(true)}
              className="text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors"
            >
              {showcaseShirts.length > 0 ? 'Edit' : '+ Pin shirts'}
            </button>
          }
        >
          Showcase
        </SectionHead>

        {showcaseShirts.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 p-3">
            {showcaseShirts.map((shirt) => {
              const photo = shirt.photos?.find((p) => p.slot === 'front')?.url;
              return (
                <Link
                  key={shirt.id}
                  to={`/shirts/${shirt.id}`}
                  className="relative aspect-square rounded-xl overflow-hidden group"
                >
                  {photo ? (
                    <img src={photo} alt={shirt.brand} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                      <span className="text-[10px] text-gray-600 text-center px-1">{shirt.brand}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-950/75 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                    <p className="text-[11px] font-semibold text-white truncate">{shirt.brand}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="px-5 py-8 text-center">
            <p className="text-gray-600 text-sm">Pin your favorite shirts to showcase them here.</p>
          </div>
        )}
      </section>

      {/* ── Friends ────────────────────────────────────────────────────────── */}
      <section className="bg-gray-900 rounded-2xl border border-gray-800/60 overflow-hidden">
        <SectionHead>{`Following · ${friends.length}`}</SectionHead>

        {/* Add friend form */}
        <form onSubmit={addFriend} className="flex items-center gap-2 px-4 py-3 border-b border-gray-800/60">
          <div className="flex-1 flex items-center bg-gray-800 border border-gray-700/80 rounded-xl overflow-hidden">
            <span className="pl-3 text-gray-600 text-sm">@</span>
            <input
              value={addFriendInput}
              onChange={(e) => { setAddFriendInput(e.target.value); setAddFriendMsg(null); }}
              placeholder="username"
              className="flex-1 px-2 py-2 text-sm text-gray-100 bg-transparent focus:outline-none placeholder-gray-600"
            />
          </div>
          <button
            type="submit"
            disabled={!addFriendInput.trim()}
            className="px-3.5 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm font-medium rounded-xl transition-all disabled:opacity-40"
          >
            Follow
          </button>
        </form>

        {addFriendMsg && (
          <p className={`px-4 py-2 text-xs ${addFriendMsg.type === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>
            {addFriendMsg.text}
          </p>
        )}

        {friends.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-gray-600 text-sm">Not following anyone yet.</p>
            <p className="text-gray-700 text-xs mt-1">Search by @username to find collectors.</p>
          </div>
        ) : (
          <ul>
            {friends.map((friend) => {
              const fi = friend.username ? `@${friend.username}` : 'Unknown collector';
              const fi2 = (friend.username ?? 'u').slice(0, 2).toUpperCase();
              return (
                <li key={friend.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-800/30 last:border-0">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex-shrink-0 overflow-hidden flex items-center justify-center">
                    {friend.avatar_url
                      ? <img src={friend.avatar_url} alt="" className="w-full h-full object-cover" />
                      : <span className="text-xs font-bold text-amber-400">{fi2}</span>
                    }
                  </div>
                  <span className="flex-1 text-sm font-medium text-gray-300">{fi}</span>
                  <button
                    onClick={() => removeFriend(friend.id)}
                    className="text-xs text-gray-600 hover:text-red-400 transition-colors font-medium"
                  >
                    Unfollow
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ── Resources ──────────────────────────────────────────────────────── */}
      <section className="bg-gray-900 rounded-2xl border border-gray-800/60 overflow-hidden">
        <SectionHead>Resources</SectionHead>
        <div className="p-3">
          <Link
            to="/tag-guide"
            className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-800/60 transition-colors group"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-200 group-hover:text-amber-400 transition-colors">Tag Guide</p>
              <p className="text-xs text-gray-600">Date &amp; value shirts by their tag brand</p>
            </div>
            <svg className="w-4 h-4 text-gray-700 group-hover:text-gray-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </section>

      {/* ── Account ────────────────────────────────────────────────────────── */}
      <section className="bg-gray-900 rounded-2xl border border-gray-800/60 overflow-hidden">
        <SectionHead>Account</SectionHead>
        <div className="p-5 space-y-3">
          <p className="text-xs text-gray-600">
            Signed in as <span className="text-gray-400">{user?.email}</span>
          </p>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 hover:border-red-500/40 text-red-400 hover:text-red-300 text-sm font-medium rounded-xl transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </section>

      {/* ── Showcase picker modal ───────────────────────────────────────────── */}
      {showPicker && (
        <ShowcasePicker
          shirts={shirts}
          current={profile?.showcase_shirt_ids ?? []}
          onSave={saveShowcase}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}
