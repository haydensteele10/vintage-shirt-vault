import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts';
import { supabase } from '../lib/supabase';
import { useRegisterPullRefresh } from '../context/PullToRefreshContext';

// ─── Constants ────────────────────────────────────────────────────────────────

const TEAL = '#00D4AA';
const RED  = '#FF6B6B';

const RANGES = [
  { key: '1D',  ms: 86_400_000 },
  { key: '7D',  ms: 604_800_000 },
  { key: '1M',  ms: 2_592_000_000 },
  { key: '3M',  ms: 7_776_000_000 },
  { key: '6M',  ms: 15_552_000_000 },
  { key: 'MAX', ms: null },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtUsd = (n) =>
  n != null
    ? `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '—';

const MIN_VALID_TS = new Date('2020-01-01').getTime();

function validTs(raw) {
  if (!raw) return null;
  const ms = new Date(raw).getTime();
  return (!isNaN(ms) && ms >= MIN_VALID_TS) ? ms : null;
}

function buildTimeline(history) {
  if (!history.length) return [];
  const valid = history.filter((e) => validTs(e.recorded_at) !== null);
  if (!valid.length) return [];
  const sorted = [...valid].sort((a, b) => validTs(a.recorded_at) - validTs(b.recorded_at));
  const current = {};
  const points  = [];
  for (const entry of sorted) {
    current[entry.shirt_id] = entry.price;
    const total = Object.values(current).reduce((a, b) => a + b, 0);
    points.push({ date: validTs(entry.recorded_at), value: total });
  }
  const last = points[points.length - 1];
  if (last.date < Date.now() - 60_000) {
    points.push({ date: Date.now(), value: last.value });
  }
  return points;
}

function getVisibleData(points, rangeMs) {
  if (points.length === 0) return [];
  const now        = Date.now();
  const rangeStart = rangeMs ? now - rangeMs : points[0].date;
  const before     = points.filter((p) => p.date <= rangeStart);
  const startValue = before.length ? before[before.length - 1].value : points[0].value;
  const inRange    = points.filter((p) => p.date > rangeStart);
  return [{ date: rangeStart, value: startValue }, ...inRange];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center" style={{ minHeight: '50vh' }}>
      <div className="w-6 h-6 rounded-full border-2 border-gray-800 border-t-amber-500 animate-spin" />
    </div>
  );
}

function EyeIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function EyeSlashIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );
}

function ChartTooltip({ active, payload, privacyMode }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        backgroundColor: '#1A1A1A',
        border: '1px solid #2A2A2A',
        borderRadius: 8,
        padding: '6px 12px',
      }}
    >
      <p style={{ color: TEAL, fontSize: 13, fontWeight: 700, margin: 0 }}>
        {privacyMode ? '••••' : fmtUsd(payload[0].value)}
      </p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const [shirts,  setShirts]  = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState(RANGES.find((r) => r.key === 'MAX'));
  const [privacyMode, setPrivacyMode] = useState(
    () => localStorage.getItem('privacyMode') === 'true',
  );

  function togglePrivacy() {
    setPrivacyMode((prev) => {
      localStorage.setItem('privacyMode', String(!prev));
      return !prev;
    });
  }

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setLoading(true);

    const { data: shirtsData } = await supabase
      .from('shirts')
      .select('id, brand, style, condition, current_value, purchase_price, photos')
      .eq('user_id', user.id)
      .order('current_value', { ascending: false });

    const userShirts = shirtsData ?? [];
    setShirts(userShirts);

    const shirtIds = userShirts.map((s) => s.id);
    if (shirtIds.length > 0) {
      const { data: ph } = await supabase
        .from('price_history')
        .select('shirt_id, price, recorded_at')
        .in('shirt_id', shirtIds)
        .order('recorded_at', { ascending: true });
      setHistory(ph ?? []);
    } else {
      setHistory([]);
    }

    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useRegisterPullRefresh(load);

  // ── Derived values ─────────────────────────────────────────────────────────

  const totalValue = shirts.reduce((s, r) => s + (r.current_value  ?? 0), 0);

  const allPoints = useMemo(() => buildTimeline(history), [history]);
  const chartData = useMemo(
    () => getVisibleData(allPoints, selectedRange.ms),
    [allPoints, selectedRange],
  );

  // 30-day gain vs portfolio value 30 days ago
  const thirtyDayMs    = 30 * 24 * 60 * 60 * 1000;
  const thirtyDayStart = Date.now() - thirtyDayMs;
  const before30d      = allPoints.filter((p) => p.date <= thirtyDayStart);
  const value30dAgo    = before30d.length
    ? before30d[before30d.length - 1].value
    : (allPoints.length > 0 ? allPoints[0].value : null);
  const thirtyDayGain  = value30dAgo != null ? totalValue - value30dAgo : null;
  const gainUp         = thirtyDayGain == null || thirtyDayGain >= 0;

  const mostValuable = shirts.slice(0, 5);
  const hasChart     = chartData.length >= 2;

  if (loading) return <Spinner />;

  const MASK = '•••••';

  return (
    <div className="pb-4">

      {/* ── 1) HEADER ─────────────────────────────────────────────────────── */}
      <div className="pt-2 pb-5">
        <p className="font-condensed text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500">
          Portfolio Main
        </p>

        <div className="flex items-center gap-3 mt-2">
          <span
            className="text-gray-50 font-bold leading-none tabular-nums"
            style={{ fontSize: 'clamp(38px, 10vw, 54px)' }}
          >
            {privacyMode ? MASK : fmtUsd(totalValue)}
          </span>
          <button
            onClick={togglePrivacy}
            className="text-gray-600 hover:text-gray-400 transition-colors duration-150 cursor-pointer flex-shrink-0"
            aria-label={privacyMode ? 'Show values' : 'Hide values'}
          >
            {privacyMode ? <EyeSlashIcon /> : <EyeIcon />}
          </button>
        </div>

        {thirtyDayGain != null && (
          <p
            className="font-sans text-sm mt-2"
            style={{ color: gainUp ? TEAL : RED }}
          >
            {privacyMode
              ? MASK
              : `${gainUp ? '+' : ''}${fmtUsd(thirtyDayGain)} in the last 30 days`}
          </p>
        )}
      </div>

      {/* ── 2) CHART ──────────────────────────────────────────────────────── */}
      {hasChart ? (
        <div>
          <div style={{ height: 160, marginLeft: -16, marginRight: -16 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={TEAL} stopOpacity={0.28} />
                    <stop offset="75%"  stopColor={TEAL} stopOpacity={0.05} />
                    <stop offset="100%" stopColor={TEAL} stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <Tooltip
                  content={<ChartTooltip privacyMode={privacyMode} />}
                  cursor={{ stroke: 'rgba(255,255,255,0.06)', strokeWidth: 1 }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={TEAL}
                  strokeWidth={2}
                  fill="url(#tealGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: TEAL, stroke: '#0A0A0A', strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Time filter pills */}
          <div className="flex items-center justify-between mt-4 px-1">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setSelectedRange(r)}
                className={`px-3 py-1.5 font-condensed text-xs font-semibold tracking-wide transition-all duration-150 cursor-pointer ${
                  selectedRange.key === r.key
                    ? 'bg-gray-50 text-gray-900 rounded-full'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {r.key}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div
          className="flex items-center justify-center text-gray-600 font-condensed text-xs uppercase tracking-wider"
          style={{ height: 120 }}
        >
          No price history yet
        </div>
      )}

      {/* ── 3) MOST VALUABLE CARD ─────────────────────────────────────────── */}
      <div
        className="mt-6 overflow-hidden"
        style={{ backgroundColor: '#1A1A1A', borderRadius: 16 }}
      >
        {/* Card header */}
        <div className="px-4 pt-4 pb-3">
          <h2 className="text-gray-50 font-bold text-base">Most Valuable</h2>
        </div>

        {mostValuable.length === 0 ? (
          <div className="px-4 pb-5">
            <p className="text-gray-500 text-sm">No shirts yet.</p>
            <Link
              to="/shirts/new"
              className="text-sm font-semibold mt-1.5 inline-block cursor-pointer transition-opacity duration-150 hover:opacity-80"
              style={{ color: TEAL }}
            >
              Add your first shirt →
            </Link>
          </div>
        ) : (
          <ul>
            {mostValuable.map((s, i) => {
              const photo = s.photos?.find((p) => p.slot === 'front') ?? s.photos?.[0];
              const pct   = s.purchase_price && s.current_value
                ? ((s.current_value - s.purchase_price) / s.purchase_price) * 100
                : null;
              const up    = pct == null || pct >= 0;

              return (
                <li
                  key={s.id}
                  style={i > 0 ? { borderTop: '1px solid #2A2A2A' } : undefined}
                >
                  <Link
                    to={`/shirts/${s.id}`}
                    className="flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors duration-150 hover:bg-white/5"
                  >
                    {/* Thumbnail */}
                    <div
                      className="flex-shrink-0 overflow-hidden bg-gray-700"
                      style={{ width: 44, height: 44, borderRadius: 8 }}
                    >
                      {photo && (
                        <img
                          src={photo.url}
                          alt={s.brand}
                          className="w-full h-full object-cover block"
                        />
                      )}
                    </div>

                    {/* Name + details */}
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-50 font-bold text-sm truncate leading-snug">
                        {s.brand}
                      </p>
                      <p className="text-gray-500 text-xs mt-0.5 truncate leading-snug">
                        {[s.condition, s.style?.replace('_', ' ')].filter(Boolean).join(' · ')}
                      </p>
                    </div>

                    {/* Price + % */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-gray-50 font-bold text-sm tabular-nums leading-snug">
                        {privacyMode ? MASK : fmtUsd(s.current_value)}
                      </p>
                      {pct != null && (
                        <p
                          className="text-xs tabular-nums mt-0.5 leading-snug"
                          style={{ color: up ? TEAL : RED }}
                        >
                          {up ? '+' : ''}{pct.toFixed(2)}%
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {/* View All link */}
        <div style={{ borderTop: '1px solid #2A2A2A' }}>
          <Link
            to="/collection"
            className="flex items-center justify-center py-3.5 text-sm font-semibold cursor-pointer transition-opacity duration-150 hover:opacity-80"
            style={{ color: TEAL }}
          >
            View All
          </Link>
        </div>
      </div>

    </div>
  );
}
