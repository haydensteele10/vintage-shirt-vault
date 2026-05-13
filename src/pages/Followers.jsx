import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 rounded-full border-2 border-gray-800 border-t-amber-400 animate-spin" />
    </div>
  );
}

export default function Followers({ initialTab = 'followers' }) {
  const { user } = useAuth();
  const navigate  = useNavigate();

  const [tab,          setTab]          = useState(initialTab);
  const [followers,    setFollowers]    = useState([]);
  const [following,    setFollowing]    = useState([]);
  const [followingIds, setFollowingIds] = useState(new Set());
  const [loading,      setLoading]      = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    const [friendRes, followerRes] = await Promise.all([
      supabase.from('friendships').select('friend_id').eq('user_id', user.id),
      supabase.from('friendships').select('user_id').eq('friend_id', user.id),
    ]);

    const friendIds   = (friendRes.data   ?? []).map((f) => f.friend_id);
    const followerIds = (followerRes.data ?? []).map((f) => f.user_id);
    const allIds      = [...new Set([...friendIds, ...followerIds])];

    let profileMap = {};
    if (allIds.length > 0) {
      const { data: pts } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', allIds);
      profileMap = Object.fromEntries((pts ?? []).map((p) => [p.id, p]));
    }

    const stub = (id) => profileMap[id] ?? { id, username: null, avatar_url: null };
    setFollowing(friendIds.map(stub));
    setFollowers(followerIds.map(stub));
    setFollowingIds(new Set(friendIds));
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  async function follow(person) {
    const { error } = await supabase
      .from('friendships')
      .insert({ user_id: user.id, friend_id: person.id });
    if (!error) setFollowingIds((prev) => new Set([...prev, person.id]));
  }

  async function unfollow(personId) {
    await supabase.from('friendships').delete()
      .eq('user_id', user.id).eq('friend_id', personId);
    setFollowingIds((prev) => { const next = new Set(prev); next.delete(personId); return next; });
  }

  const list = tab === 'followers' ? followers : following;

  return (
    <div className="max-w-lg pb-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-800/60 hover:bg-gray-800 text-gray-400 hover:text-gray-100 transition-all"
          aria-label="Back"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <h1 className="text-lg font-bold text-gray-50">
          {tab === 'followers' ? 'Followers' : 'Following'}
        </h1>

        <div className="w-9" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-800/50 rounded-xl mb-4">
        {[
          { key: 'followers', label: `${followers.length} Followers` },
          { key: 'following', label: `${following.length} Following` },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              tab === key ? 'bg-gray-700 text-amber-400' : 'text-gray-600 hover:text-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? <Spinner /> : list.length === 0 ? (
        <p className="text-center text-gray-600 text-sm py-16">
          {tab === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
        </p>
      ) : (
        <ul className="divide-y divide-gray-800/30">
          {list.map((person) => {
            const initials    = (person.username ?? 'u').slice(0, 2).toUpperCase();
            const isFollowing = followingIds.has(person.id);
            return (
              <li key={person.id} className="flex items-center gap-3 py-3.5">

                {/* Avatar */}
                <button
                  onClick={() => person.username && navigate(`/user/${person.username}`)}
                  className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex-shrink-0 overflow-hidden flex items-center justify-center"
                >
                  {person.avatar_url
                    ? <img src={person.avatar_url} alt="" className="w-full h-full object-cover" />
                    : <span className="text-xs font-bold text-amber-400">{initials}</span>
                  }
                </button>

                {/* Username */}
                <button
                  onClick={() => person.username && navigate(`/user/${person.username}`)}
                  className="flex-1 min-w-0 text-left"
                >
                  <span className="text-sm font-medium text-gray-300 hover:text-amber-400 transition-colors truncate block">
                    {person.username ? `@${person.username}` : 'Unknown collector'}
                  </span>
                </button>

                {/* Follow / Unfollow */}
                {isFollowing ? (
                  <button
                    onClick={() => unfollow(person.id)}
                    className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold text-gray-400 border border-gray-700 rounded-lg hover:text-red-400 hover:border-red-500/30 transition-all"
                  >
                    Unfollow
                  </button>
                ) : (
                  <button
                    onClick={() => follow(person)}
                    className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold text-amber-400 border border-amber-500/30 rounded-lg hover:bg-amber-500/10 transition-all"
                  >
                    Follow
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
