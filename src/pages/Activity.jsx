import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { TagIcon } from '../components/Logo';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function dateGroup(dateStr) {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  const days = Math.floor((today - date) / 86400000);
  if (days < 7) return 'This Week';
  if (days < 30) return 'This Month';
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

const GROUP_ORDER = ['Today', 'Yesterday', 'This Week', 'This Month'];

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ profile }) {
  const initials = (profile?.username ?? 'u').slice(0, 2).toUpperCase();
  return (
    <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex-shrink-0 overflow-hidden flex items-center justify-center">
      {profile?.avatar_url
        ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
        : <span className="text-xs font-bold text-amber-400">{initials}</span>
      }
    </div>
  );
}

// ─── Shirt thumbnail ──────────────────────────────────────────────────────────

function ShirtThumb({ shirtId, shirt, brand }) {
  const photo = shirt?.photos?.find((p) => p.slot === 'front')?.url;
  return (
    <Link to={`/shirts/${shirtId}`} className="flex-shrink-0 group">
      <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-800 border border-gray-700/60 group-hover:border-amber-500/40 transition-colors">
        {photo
          ? <img src={photo} alt={brand} className="w-full h-full object-cover" />
          : (
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )
        }
      </div>
    </Link>
  );
}

// ─── Individual activity item ─────────────────────────────────────────────────

function ActivityItem({ item, currentUserId }) {
  const isOwn = item.user_id === currentUserId;
  const actor = isOwn ? 'You' : (item.profile?.username ? `@${item.profile.username}` : 'Someone');
  const brand = item.metadata?.brand;

  let body = null;

  if (item.type === 'shirt_added') {
    const val = item.metadata?.current_value;
    body = (
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-200 leading-snug">
            <span className="font-semibold text-gray-100">{actor}</span>
            {' added '}
            {brand
              ? <span className="font-semibold text-amber-400">{brand}</span>
              : 'a shirt'
            }
            {' to their collection'}
          </p>
          {val != null && (
            <p className="text-xs text-gray-500 mt-0.5">
              Est. value{' '}
              <span className="text-amber-400 font-semibold tabular-nums">
                ${Number(val).toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </span>
            </p>
          )}
          <p className="text-[11px] text-gray-700 mt-1">{timeAgo(item.created_at)}</p>
        </div>
        {item.shirt_id && (
          <ShirtThumb shirtId={item.shirt_id} shirt={item.shirt} brand={brand} />
        )}
      </div>
    );
  } else if (item.type === 'price_updated') {
    const oldVal = item.metadata?.old_value;
    const newVal = item.metadata?.new_value;
    const up = newVal > oldVal;
    const pct = oldVal > 0 ? Math.abs(((newVal - oldVal) / oldVal) * 100).toFixed(0) : null;
    body = (
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-200 leading-snug">
            <span className="font-semibold text-gray-100">{actor}</span>
            {' updated '}
            {brand
              ? <span className="font-semibold text-amber-400">{brand}</span>
              : 'a shirt'
            }
            {' value'}
          </p>
          {oldVal != null && newVal != null && (
            <p className={`text-xs font-semibold mt-0.5 tabular-nums flex items-center gap-1 ${up ? 'text-emerald-400' : 'text-red-400'}`}>
              <span>${Number(oldVal).toFixed(0)}</span>
              <span className="text-gray-600">→</span>
              <span>${Number(newVal).toFixed(0)}</span>
              <span className="font-bold">{up ? '↑' : '↓'}{pct != null ? `${pct}%` : ''}</span>
            </p>
          )}
          <p className="text-[11px] text-gray-700 mt-1">{timeAgo(item.created_at)}</p>
        </div>
        {item.shirt_id && (
          <ShirtThumb shirtId={item.shirt_id} shirt={item.shirt} brand={brand} />
        )}
      </div>
    );
  } else if (item.type === 'friend_added') {
    body = (
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-200 leading-snug">
          <span className="font-semibold text-gray-100">{actor}</span>
          {' started following '}
          <span className="font-semibold text-amber-400">
            @{item.metadata?.friend_username ?? 'someone'}
          </span>
        </p>
        <p className="text-[11px] text-gray-700 mt-1">{timeAgo(item.created_at)}</p>
      </div>
    );
  } else if (item.type === 'showcase_updated') {
    body = (
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-200 leading-snug">
          <span className="font-semibold text-gray-100">{actor}</span>
          {' updated their showcase'}
        </p>
        <p className="text-[11px] text-gray-700 mt-1">{timeAgo(item.created_at)}</p>
      </div>
    );
  }

  if (!body) return null;

  return (
    <div className="flex items-start gap-3 px-4 py-3.5 border-b border-gray-800/40 last:border-0">
      <Avatar profile={item.profile} />
      {body}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Activity() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFeed = useCallback(async (isRefresh = false) => {
    if (!user?.id) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    // Fetch friend IDs
    const { data: friendships } = await supabase
      .from('friendships')
      .select('friend_id')
      .eq('user_id', user.id);

    const friendIds = (friendships ?? []).map((f) => f.friend_id);
    const allUserIds = [...new Set([user.id, ...friendIds])];

    // Fetch activity feed
    const { data: events } = await supabase
      .from('activity_feed')
      .select('*')
      .in('user_id', allUserIds)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!events?.length) {
      setItems([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    // Batch-fetch profiles
    const uniqueUserIds = [...new Set(events.map((e) => e.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', uniqueUserIds);
    const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));

    // Batch-fetch referenced shirts
    const shirtIds = [...new Set(events.filter((e) => e.shirt_id).map((e) => e.shirt_id))];
    let shirtMap = {};
    if (shirtIds.length > 0) {
      const { data: shirts } = await supabase
        .from('shirts')
        .select('id, brand, photos, current_value')
        .in('id', shirtIds);
      shirtMap = Object.fromEntries((shirts ?? []).map((s) => [s.id, s]));
    }

    setItems(
      events.map((event) => ({
        ...event,
        profile: profileMap[event.user_id] ?? null,
        shirt: event.shirt_id ? (shirtMap[event.shirt_id] ?? null) : null,
      })),
    );
    setLoading(false);
    setRefreshing(false);
  }, [user?.id]);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  // Group events by date label
  const grouped = items.reduce((acc, item) => {
    const g = dateGroup(item.created_at);
    if (!acc[g]) acc[g] = [];
    acc[g].push(item);
    return acc;
  }, {});

  const sortedGroups = [
    ...GROUP_ORDER.filter((g) => grouped[g]),
    ...Object.keys(grouped).filter((g) => !GROUP_ORDER.includes(g)).sort((a, b) => b.localeCompare(a)),
  ];

  return (
    <div className="max-w-xl pb-32">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-50 tracking-tight">Activity</h1>
        <p className="text-gray-500 text-sm mt-1">Recent activity from you and people you follow.</p>
      </div>

      {/* ── Feed ───────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 rounded-full border-2 border-gray-800 border-t-amber-400 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-gray-800/20 px-6 py-14 text-center flex flex-col items-center gap-4">
          <div className="opacity-50">
            <TagIcon size={48} />
          </div>
          <div className="space-y-1.5">
            <p className="text-gray-300 font-semibold text-sm">Nothing in the feed yet</p>
            <p className="text-gray-600 text-xs leading-relaxed max-w-xs mx-auto">
              Add shirts and follow other collectors to see their finds here.
            </p>
          </div>
          <Link
            to="/profile"
            className="px-5 py-2 border border-amber-500/30 text-amber-400 text-xs font-semibold rounded-xl hover:bg-amber-500/10 transition-colors"
          >
            Find collectors →
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {sortedGroups.map((group) => (
            <div key={group}>
              <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest px-1 mb-2">
                {group}
              </p>
              <div className="rounded-2xl border border-gray-800/20 overflow-hidden">
                {grouped[group].map((item) => (
                  <ActivityItem key={item.id} item={item} currentUserId={user.id} />
                ))}
              </div>
            </div>
          ))}

          <button
            onClick={() => loadFeed(true)}
            disabled={refreshing}
            className="w-full py-3 text-xs font-semibold text-gray-600 hover:text-gray-400 border border-gray-800/60 rounded-2xl transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {refreshing ? (
              <>
                <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-700 border-t-gray-400 animate-spin" />
                Refreshing…
              </>
            ) : (
              'Refresh feed'
            )}
          </button>
        </div>
      )}
    </div>
  );
}
