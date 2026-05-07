import { useRef, useState } from 'react';
import { searchEbayActiveListings } from '../lib/ebay';
import { parseListingTitle } from '../lib/claude';
import { useSheet } from '../context/SheetContext';
import RefreshButton from '../components/RefreshButton';
import { useRegisterPullRefresh } from '../context/PullToRefreshContext';

// ─── Title parser ─────────────────────────────────────────────────────────────

function parseTitleToFormFields(title, price) {
  const fields = {
    brand: '',
    era: '',
    year: '',
    style: 'band_tee',
    purchase_price: price != null ? String(price.toFixed(2)) : '',
    notes: `eBay listing: ${title}`,
  };

  const yearMatch = title.match(/\b(19[6-9]\d|200[0-9])\b/);
  if (yearMatch) {
    fields.year = yearMatch[1];
    const y = parseInt(yearMatch[1], 10);
    fields.era = `${Math.floor(y / 10) * 10}s`;
  }

  const eraMatch = title.match(/\b(60s|70s|80s|90s|2000s|00s)\b/i);
  if (eraMatch) fields.era = eraMatch[1].toLowerCase().replace('2000s', '00s');

  if (/nfl|nba|mlb|nascar|racing|football|basketball|baseball|hockey|sport/i.test(title)) {
    fields.style = 'sports';
  } else if (/harley|work|carhartt|union|trucker/i.test(title)) {
    fields.style = 'workwear';
  } else if (/souvenir|destination|vacation|tourist/i.test(title)) {
    fields.style = 'souvenir';
  }

  const brandMatch = title.match(
    /^([A-Za-z][A-Za-z\s'&./-]{1,40}?)(?:\s+(?:vintage|vtg|tee|t-shirt|shirt|tour|concert|\d{4}|'?[89]\d|single|deadstock))/i,
  );
  if (brandMatch) {
    fields.brand = brandMatch[1].trim().replace(/\s+/g, ' ');
  } else {
    fields.brand = title.split(/\s+/).slice(0, 3).join(' ');
  }

  return fields;
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function SearchResultCard({ listing }) {
  const [imgError, setImgError] = useState(false);
  const [parsing, setParsing] = useState(false);
  const { openAddShirt } = useSheet();

  async function handleAdd() {
    setParsing(true);
    let form;
    try {
      form = await parseListingTitle(listing.title, listing.price);
    } catch {
      form = parseTitleToFormFields(listing.title, listing.price);
    } finally {
      setParsing(false);
    }
    openAddShirt({ form, imageUrl: listing.image || null });
  }

  return (
    <div className="rounded-xl border border-gray-800/20 overflow-hidden hover:border-amber-500/30 transition-colors group flex flex-col">
      <a href={listing.url} target="_blank" rel="noopener noreferrer" className="flex-1">
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
          <p className="text-[11px] text-gray-400 leading-snug line-clamp-2 mb-1 group-hover:text-gray-300 transition-colors">
            {listing.title}
          </p>
          <p className="text-sm font-bold text-amber-400 tabular-nums">
            ${listing.price.toFixed(2)}
          </p>
        </div>
      </a>
      <div className="px-3 pb-3">
        <button
          onClick={handleAdd}
          disabled={parsing}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 hover:border-amber-500/50 active:bg-amber-500/30 transition-colors disabled:opacity-60"
        >
          {parsing ? (
            <>
              <svg className="w-3 h-3 text-amber-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-[10px] font-semibold text-amber-400 tracking-wide">Analyzing…</span>
            </>
          ) : (
            <>
              <svg className="w-3 h-3 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-[10px] font-semibold text-amber-400 tracking-wide">Add to Collection</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Skeleton grid ────────────────────────────────────────────────────────────

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-gray-800/20 overflow-hidden">
          <div className="aspect-square bg-gray-800 animate-pulse" />
          <div className="p-3 space-y-2">
            <div className="h-3 bg-gray-800 rounded animate-pulse" />
            <div className="h-3 w-2/3 bg-gray-800 rounded animate-pulse" />
            <div className="h-3 w-1/3 bg-gray-800 rounded animate-pulse" />
            <div className="h-8 bg-gray-800/60 rounded-lg animate-pulse mt-1" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  'Grateful Dead 1994',
  'vintage NASCAR tee',
  'Nirvana concert 90s',
  'Chicago Bulls 1996',
  'Led Zeppelin tour',
  'single stitch band tee',
];

function EmptyState({ onSuggest }) {
  return (
    <div className="pt-8 pb-24">
      <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-4">Try searching for</p>
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onSuggest(s)}
            className="px-3 py-1.5 rounded-full border border-gray-800/20 text-xs text-gray-500 hover:text-amber-400 hover:border-amber-500/30 transition-colors"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Search() {
  const [query,    setQuery]    = useState('');
  const [results,  setResults]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef(null);

  useRegisterPullRefresh(searched ? () => runSearch(query) : null);

  async function runSearch(q) {
    const trimmed = q.trim();
    if (!trimmed) return;
    setQuery(trimmed);
    setSearched(true);
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const { listings } = await searchEbayActiveListings(trimmed);
      setResults(listings ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    runSearch(query);
  }

  function handleSuggest(s) {
    setQuery(s);
    runSearch(s);
  }

  function handleClear() {
    setQuery('');
    setResults([]);
    setSearched(false);
    setError(null);
    inputRef.current?.focus();
  }

  return (
    <div className="pb-32">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-50 mb-1">Search eBay</h1>
          <p className="text-xs text-gray-500">Find vintage shirts and add them straight to your collection</p>
        </div>
        {searched && <RefreshButton onRefresh={() => runSearch(query)} loading={loading} />}
      </div>

      {/* Search bar */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex items-center gap-3 border border-gray-700/40 hover:border-gray-600/60 focus-within:border-amber-500/50 rounded-2xl px-4 py-3.5 transition-all bg-gray-800/40 focus-within:bg-gray-800/60">
          {loading ? (
            <svg className="w-5 h-5 text-gray-500 flex-shrink-0 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Grateful Dead 1995, vintage NASCAR tee…"
            className="flex-1 bg-transparent text-sm text-gray-100 placeholder-gray-600 focus:outline-none"
            autoFocus
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="text-gray-600 hover:text-gray-400 transition-colors flex-shrink-0 p-0.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </form>

      {/* States */}
      {!searched && <EmptyState onSuggest={handleSuggest} />}

      {searched && loading && <SkeletonGrid />}

      {searched && !loading && error && (
        <div className="text-center py-16">
          <p className="text-gray-500 text-sm mb-2">Search failed</p>
          <p className="text-gray-700 text-xs">{error}</p>
        </div>
      )}

      {searched && !loading && !error && results.length === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-500 text-sm">No listings found for "{query}"</p>
          <p className="text-gray-700 text-xs mt-1">Try broader terms or a different query</p>
        </div>
      )}

      {searched && !loading && !error && results.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-gray-600 font-medium">{results.length} listings</p>
            <a
              href={`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-amber-500/60 hover:text-amber-400 transition-colors"
            >
              See all on eBay →
            </a>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {results.map((listing, i) => (
              <SearchResultCard key={i} listing={listing} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
