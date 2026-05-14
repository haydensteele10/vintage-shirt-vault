import { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { TagIcon } from './Logo';
import { useTheme } from '../context/ThemeContext';
import { useSheet } from '../context/SheetContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const NAV_LINKS = [
  { to: '/dashboard',  label: 'Dashboard',  end: true  },
  { to: '/collection', label: 'Collection', end: false },
  { to: '/search',     label: 'Search',     end: false },
  { to: '/discover',   label: 'Discover',   end: false },
  { to: '/social',     label: 'Social',     end: false },
  { to: '/profile',    label: 'Profile',    end: false },
];

const activeCls   = 'text-amber-500 border-b-2 border-amber-500';
const inactiveCls = 'text-gray-500 hover:text-gray-50 border-b-2 border-transparent';
const linkCls     = 'px-3 py-2 font-condensed text-xs font-semibold uppercase tracking-wider transition-all duration-150 cursor-pointer';

// ─── Icons ────────────────────────────────────────────────────────────────────

function SunIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
      <circle cx="12" cy="12" r="4" strokeLinecap="round" />
      <path strokeLinecap="round" d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}

// ─── Notification helpers ─────────────────────────────────────────────────────

function timeAgo(dateStr) {
  const secs = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (secs < 60)    return 'just now';
  if (secs < 3600)  return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

function NotifAvatar({ profile, type }) {
  if (profile) {
    const initials = (profile.username ?? 'u').slice(0, 2).toUpperCase();
    return (
      <div className="w-9 h-9 bg-amber-500/10 border border-amber-500/20 flex-shrink-0 overflow-hidden flex items-center justify-center">
        {profile.avatar_url
          ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
          : <span className="text-xs font-bold text-amber-500">{initials}</span>
        }
      </div>
    );
  }
  if (type === 'price_change') {
    return (
      <div className="w-9 h-9 bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center flex-shrink-0">
        <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
        </svg>
      </div>
    );
  }
  return (
    <div className="w-9 h-9 bg-gray-800 border border-gray-700/60 flex items-center justify-center flex-shrink-0">
      <BellIcon />
    </div>
  );
}

// ─── Notification bell ────────────────────────────────────────────────────────

function NotificationBell({ user }) {
  const [notifs, setNotifs]         = useState([]);
  const [profileMap, setProfileMap] = useState({});
  const [open, setOpen]             = useState(false);
  const ref          = useRef(null);
  const fetchedIds   = useRef(new Set());

  function fetchProfiles(ids) {
    const toFetch = ids.filter((id) => id && !fetchedIds.current.has(id));
    if (!toFetch.length) return;
    toFetch.forEach((id) => fetchedIds.current.add(id));
    supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', toFetch)
      .then(({ data }) => {
        if (data?.length) {
          setProfileMap((prev) => ({
            ...prev,
            ...Object.fromEntries(data.map((p) => [p.id, p])),
          }));
        }
      });
  }

  useEffect(() => {
    if (!user?.id) return;

    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        const rows = data ?? [];
        setNotifs(rows);
        fetchProfiles([...new Set(rows.map((n) => n.from_user_id).filter(Boolean))]);
      });

    const channel = supabase
      .channel(`notifs_${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          setNotifs((prev) => [payload.new, ...prev].slice(0, 20));
          if (payload.new.from_user_id) fetchProfiles([payload.new.from_user_id]);
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  const unread = notifs.filter((n) => !n.read).length;

  function handleToggle() {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen && unread > 0) {
      const ids = notifs.filter((n) => !n.read).map((n) => n.id);
      setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
      supabase.from('notifications').update({ read: true }).in('id', ids);
    }
  }

  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleToggle}
        aria-label="Notifications"
        className={`relative p-2 transition-all duration-150 ${inactiveCls}`}
      >
        <BellIcon />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[14px] h-3.5 bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5 leading-none pointer-events-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-0 w-80 bg-gray-900 border-2 border-gray-800 z-[100] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b-2 border-gray-800">
            <p className="font-condensed text-xs font-bold uppercase tracking-[0.15em] text-gray-100">Notifications</p>
            {notifs.length > 0 && unread === 0 && (
              <span className="font-condensed text-[10px] uppercase tracking-wider text-gray-600">All caught up</span>
            )}
          </div>

          {notifs.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm text-gray-600">No notifications yet</p>
            </div>
          ) : (
            <ul className="max-h-[360px] overflow-y-auto divide-y divide-gray-800/30">
              {notifs.map((notif) => (
                <li
                  key={notif.id}
                  className={`flex items-start gap-3 px-4 py-3 transition-colors ${
                    notif.read ? '' : 'bg-amber-500/5'
                  }`}
                >
                  <NotifAvatar
                    profile={notif.from_user_id ? profileMap[notif.from_user_id] : null}
                    type={notif.type}
                  />
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className={`text-xs leading-snug ${notif.read ? 'text-gray-400' : 'text-gray-200 font-medium'}`}>
                      {notif.message}
                    </p>
                    <p className="font-condensed text-[10px] uppercase tracking-wider text-gray-600 mt-1">{timeAgo(notif.created_at)}</p>
                  </div>
                  {!notif.read && (
                    <span className="w-2 h-2 bg-amber-500 flex-shrink-0 mt-1.5" />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main navbar ──────────────────────────────────────────────────────────────

export default function Navbar() {
  const { isDark, toggle } = useTheme();
  const { openAddShirt }   = useSheet();
  const { user }           = useAuth();

  return (
    <header
      className="sticky top-0 z-50 bg-gray-950 border-b-2 border-gray-800"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-15 py-3">
        <NavLink to="/dashboard" className="flex items-center gap-2.5 group">
          <TagIcon size={24} />
          <span className="font-condensed font-semibold text-sm uppercase tracking-[0.2em] text-gray-50 group-hover:text-amber-500 transition-colors">
            Tag Charting
          </span>
        </NavLink>

        <div className="flex items-center gap-1">
          <NotificationBell user={user} />

          <nav className="hidden sm:flex items-center gap-0">
            {NAV_LINKS.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => `${linkCls} ${isActive ? activeCls : inactiveCls}`}
              >
                {label}
              </NavLink>
            ))}

            {/* Add Shirt */}
            <button
              onClick={openAddShirt}
              className={`${linkCls} ml-2 border-2 border-gray-700 hover:border-orange-500 hover:text-orange-500 text-gray-500 transition-all duration-150`}
            >
              + Add Shirt
            </button>

            {/* Theme toggle */}
            <button
              onClick={toggle}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className={`ml-1 p-2 transition-all duration-150 ${inactiveCls}`}
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
