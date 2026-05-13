import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 rounded-full border-2 border-gray-800 border-t-amber-400 animate-spin" />
    </div>
  );
}

function BackButton() {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(-1)}
      className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-800/60 hover:bg-gray-800 text-gray-400 hover:text-gray-100 transition-all"
      aria-label="Back"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
    </button>
  );
}

export default function UserProfile() {
  const { username } = useParams();
  const { user }     = useAuth();

  const [profile,        setProfile]        = useState(null);
  const [showcaseShirts, setShowcaseShirts] = useState([]);
  const [followerCount,  setFollowerCount]  = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing,    setIsFollowing]    = useState(false);
  const [followLoading,  setFollowLoading]  = useState(false);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, bio, showcase_shirt_ids')
        .eq('username', username)
        .maybeSingle();

      if (cancelled) return;
      if (profErr || !prof) { setError('User not found'); setLoading(false); return; }
      setProfile(prof);

      const [followerRes, followingRes, myFollowRes, showcaseRes] = await Promise.all([
        supabase.from('friendships')
          .select('*', { count: 'exact', head: true })
          .eq('friend_id', prof.id),
        supabase.from('friendships')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', prof.id),
        user?.id && user.id !== prof.id
          ? supabase.from('friendships')
              .select('friend_id')
              .eq('user_id', user.id)
              .eq('friend_id', prof.id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        prof.showcase_shirt_ids?.length > 0
          ? supabase.from('shirts')
              .select('id, brand, photos')
              .in('id', prof.showcase_shirt_ids)
          : Promise.resolve({ data: [] }),
      ]);

      if (cancelled) return;
      setFollowerCount(followerRes.count ?? 0);
      setFollowingCount(followingRes.count ?? 0);
      setIsFollowing(!!myFollowRes?.data);

      const map = Object.fromEntries((showcaseRes.data ?? []).map((s) => [s.id, s]));
      setShowcaseShirts((prof.showcase_shirt_ids ?? []).map((id) => map[id]).filter(Boolean));
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [username, user?.id]);

  async function toggleFollow() {
    if (!user || !profile || user.id === profile.id) return;
    setFollowLoading(true);

    if (isFollowing) {
      await supabase.from('friendships').delete()
        .eq('user_id', user.id).eq('friend_id', profile.id);
      setIsFollowing(false);
      setFollowerCount((c) => Math.max(0, c - 1));
    } else {
      const { error: insertErr } = await supabase.from('friendships')
        .insert({ user_id: user.id, friend_id: profile.id });
      if (!insertErr) {
        setIsFollowing(true);
        setFollowerCount((c) => c + 1);
        // Fire-and-forget follow notification
        const { data: myProf } = await supabase.from('profiles')
          .select('username').eq('id', user.id).maybeSingle();
        const myUsername = myProf?.username ?? user.email?.split('@')[0];
        supabase.from('notifications').insert({
          user_id: profile.id,
          type: 'new_follower',
          from_user_id: user.id,
          message: `@${myUsername} started following you`,
          read: false,
        });
      }
    }
    setFollowLoading(false);
  }

  const isOwnProfile = !!(user?.id && profile?.id && user.id === profile.id);
  const initials     = (profile?.username ?? 'u').slice(0, 2).toUpperCase();

  if (loading) return (
    <div className="max-w-lg space-y-5 pb-8">
      <BackButton />
      <Spinner />
    </div>
  );

  if (error) return (
    <div className="max-w-lg space-y-5 pb-8">
      <BackButton />
      <p className="text-center text-gray-500 text-sm py-16">{error}</p>
    </div>
  );

  return (
    <div className="max-w-lg space-y-5 pb-8">

      <BackButton />

      {/* Profile card */}
      <section className="rounded-2xl border border-gray-800/20 overflow-hidden">
        <div className="h-20 bg-gradient-to-br from-amber-500/20 via-amber-500/5 to-transparent" />

        <div className="px-5 pb-5 -mt-10">
          {/* Avatar */}
          <div className="w-20 h-20 mb-3 rounded-2xl ring-4 ring-gray-900 overflow-hidden bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
              : <span className="text-2xl font-bold text-amber-400">{initials}</span>
            }
          </div>

          {/* Name + follow */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <p className="text-lg font-bold text-gray-50 min-w-0 truncate">@{profile.username}</p>

            {isOwnProfile ? (
              <Link
                to="/profile"
                className="flex-shrink-0 px-4 py-1.5 text-xs font-semibold text-gray-400 border border-gray-700 rounded-xl hover:text-gray-200 hover:border-gray-600 transition-all"
              >
                Edit Profile
              </Link>
            ) : (
              <button
                onClick={toggleFollow}
                disabled={followLoading}
                className={`flex-shrink-0 px-4 py-1.5 text-xs font-semibold rounded-xl border transition-all disabled:opacity-50 ${
                  isFollowing
                    ? 'text-gray-400 border-gray-700 hover:text-red-400 hover:border-red-500/30'
                    : 'text-amber-400 border-amber-500/30 hover:bg-amber-500/10'
                }`}
              >
                {followLoading ? '…' : isFollowing ? 'Unfollow' : 'Follow'}
              </button>
            )}
          </div>

          {/* Counts */}
          <div className="flex items-center gap-4 mb-2">
            <span className="text-sm">
              <span className="font-bold text-gray-100">{followerCount}</span>{' '}
              <span className="text-gray-500">Followers</span>
            </span>
            <span className="text-gray-700">·</span>
            <span className="text-sm">
              <span className="font-bold text-gray-100">{followingCount}</span>{' '}
              <span className="text-gray-500">Following</span>
            </span>
          </div>

          {/* Bio */}
          {profile.bio ? (
            <p className="text-sm text-gray-400 leading-relaxed">{profile.bio}</p>
          ) : (
            <p className="text-sm text-gray-700 italic">No bio yet.</p>
          )}
        </div>
      </section>

      {/* Showcase */}
      {showcaseShirts.length > 0 && (
        <section className="rounded-2xl border border-gray-800/20 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800/60">
            <h2 className="text-sm font-semibold text-gray-100">Showcase</h2>
          </div>
          <div className="grid grid-cols-3 gap-2 p-3">
            {showcaseShirts.map((shirt) => {
              const photo = shirt.photos?.find((p) => p.slot === 'front')?.url;
              return (
                <div key={shirt.id} className="relative aspect-square rounded-xl overflow-hidden bg-gray-800">
                  {photo ? (
                    <img src={photo} alt={shirt.brand} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-[10px] text-gray-600 text-center px-1">{shirt.brand}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-950/70 via-transparent to-transparent flex items-end p-2">
                    <p className="text-[10px] font-semibold text-white/90 truncate">{shirt.brand}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
