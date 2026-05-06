import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { discoverListings } from '../lib/ebay';

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="flex-none w-40 sm:w-48 bg-gray-900 rounded-xl border border-gray-800/60 overflow-hidden">
      <div className="aspect-square bg-gray-800 animate-pulse" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-gray-800 rounded animate-pulse" />
        <div className="h-3 w-3/4 bg-gray-800 rounded animate-pulse" />
        <div className="h-4 w-1/2 bg-gray-800 rounded animate-pulse mt-1" />
      </div>
    </div>
  );
}

function DiscoverSkeleton() {
  return (
    <div className="space-y-8 pb-24">
      <div className="px-4 sm:px-6 pt-2 space-y-2">
        <div className="h-6 w-28 bg-gray-800 rounded animate-pulse" />
        <div className="h-3 w-52 bg-gray-800 rounded animate-pulse" />
      </div>

      {[0, 1, 2].map((i) => (
        <section key={i}>
          <div className="h-4 w-44 bg-gray-800 rounded animate-pulse mx-4 sm:mx-6 mb-3" />
          <div className="flex gap-3 overflow-hidden px-4 sm:px-6">
            {[0, 1, 2, 3].map((j) => (
              <SkeletonCard key={j} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// ─── Listing card ─────────────────────────────────────────────────────────────

function ListingCard({ listing }) {
  const [imgError, setImgError] = useState(false);

  return (
    <a
      href={listing.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex-none w-40 sm:w-48 bg-gray-900 rounded-xl border border-gray-800/60 overflow-hidden hover:border-amber-500/40 active:border-amber-500/60 transition-colors group"
    >
      <div className="aspect-square bg-gray-800 overflow-hidden">
        {listing.image && !imgError ? (
          <img
            src={listing.image}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-10 h-10 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>

      <div className="p-3">
        <p className="text-[11px] text-gray-400 leading-snug line-clamp-2 mb-2 group-hover:text-gray-300 transition-colors">
          {listing.title}
        </p>
        <p className="text-sm font-bold text-amber-400 tabular-nums">
          ${listing.price.toFixed(2)}
        </p>
      </div>
    </a>
  );
}

// ─── Group section ────────────────────────────────────────────────────────────

function GroupSection({ group }) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-gray-300 px-4 sm:px-6 mb-3">
        {group.title}
      </h2>
      <div
        className="flex gap-3 overflow-x-auto px-4 sm:px-6 pb-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {group.listings.map((listing, i) => (
          <ListingCard key={i} listing={listing} />
        ))}
      </div>
    </section>
  );
}

// ─── Empty / error states ─────────────────────────────────────────────────────

function EmptyCollection() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
      <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center mb-4">
        <svg className="w-7 h-7 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <circle cx="12" cy="12" r="9" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
        </svg>
      </div>
      <p className="text-gray-400 font-medium text-sm mb-1">Nothing to discover yet</p>
      <p className="text-gray-600 text-xs leading-relaxed">
        Add some shirts to your collection and we'll find similar pieces on eBay.
      </p>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
      <p className="text-gray-500 text-sm mb-3">Couldn't load recommendations</p>
      <p className="text-gray-700 text-xs mb-5 font-mono">{message}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 text-xs font-semibold text-amber-400 border border-amber-500/30 rounded-lg hover:bg-amber-500/10 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Discover() {
  const [groups, setGroups]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const { data: shirts, error: dbError } = await supabase
        .from('shirts')
        .select('brand, style, era, year');

      if (dbError) throw new Error(dbError.message);
      if (!shirts?.length) {
        setGroups([]);
        return;
      }

      const result = await discoverListings(shirts);
      setGroups(result?.groups ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <DiscoverSkeleton />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!groups.length) return <EmptyCollection />;

  return (
    <div className="space-y-8 pb-24">
      <div className="px-4 sm:px-6 pt-2">
        <h1 className="text-xl font-bold text-gray-50">Discover</h1>
        <p className="text-xs text-gray-500 mt-1">Curated picks based on your collection</p>
      </div>

      {groups.map((group) => (
        <GroupSection key={group.id} group={group} />
      ))}
    </div>
  );
}
