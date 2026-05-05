import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';
import { supabase } from '../lib/supabase';
import ConditionBadge from '../components/ConditionBadge';

// ─── Constants ────────────────────────────────────────────────────────────────

const RANGES = [
  { key: '1D',  label: '1D',  ms: 86_400_000 },
  { key: '7D',  label: '7D',  ms: 604_800_000 },
  { key: '1M',  label: '1M',  ms: 2_592_000_000 },
  { key: '3M',  label: '3M',  ms: 7_776_000_000 },
  { key: '6M',  label: '6M',  ms: 15_552_000_000 },
  { key: 'MAX', label: 'MAX', ms: null },
];

// ─── Pure helpers ─────────────────────────────────────────────────────────────

const fmtUsd = (n) =>
  n != null
    ? `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '—';

const fmtCompact = (v) => {
  if (v >= 10_000) return `$${(v / 1_000).toFixed(0)}k`;
  if (v >= 1_000)  return `$${(v / 1_000).toFixed(1)}k`;
  return `$${v.toFixed(0)}`;
};

function formatXTick(ts, rangeKey) {
  const d = new Date(ts);
  switch (rangeKey) {
    case '1D':  return d.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
    case '7D':  return d.toLocaleDateString('en-US', { weekday: 'short' });
    case 'MAX': return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    default:    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

function formatTooltipDate(ts, rangeKey) {
  const d = new Date(ts);
  if (rangeKey === '1D') {
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
}

/**
 * Build a portfolio value timeline from raw price_history rows.
 * Returns [{date: ms, value: $}] sorted ascending.
 */
function buildTimeline(history) {
  if (history.length === 0) return [];

  const sorted = [...history].sort(
    (a, b) => new Date(a.recorded_at) - new Date(b.recorded_at),
  );

  const current = {};   // shirt_id → latest price
  const points  = [];

  for (const entry of sorted) {
    current[entry.shirt_id] = entry.price;
    const total = Object.values(current).reduce((a, b) => a + b, 0);
    points.push({ date: new Date(entry.recorded_at).getTime(), value: total });
  }

  // Extend to right now so the chart reaches the current moment
  const last = points[points.length - 1];
  if (last.date < Date.now() - 60_000) {
    points.push({ date: Date.now(), value: last.value });
  }

  return points;
}

/**
 * Slice the timeline to the selected range, prepending the range-start boundary
 * with its interpolated value so the chart always starts at the left edge.
 */
function getVisibleData(points, rangeMs) {
  if (points.length === 0) return [];

  const now       = Date.now();
  const rangeStart = rangeMs ? now - rangeMs : points[0].date;

  const before = points.filter(p => p.date <= rangeStart);
  const startValue = before.length ? before[before.length - 1].value : points[0].value;

  const inRange = points.filter(p => p.date > rangeStart);
  return [{ date: rangeStart, value: startValue }, ...inRange];
}

function generateTicks(data, rangeKey) {
  if (data.length < 2) return [];
  const start = data[0].date;
  const end   = data[data.length - 1].date;
  const n = 5;
  return Array.from({ length: n }, (_, i) =>
    Math.round(start + ((end - start) * i) / (n - 1)),
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 rounded-full border-2 border-gray-800 border-t-amber-400 animate-spin" />
    </div>
  );
}

function ChartTooltip({ active, payload, label, rangeKey }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-800 border border-gray-700/80 rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-xs text-gray-500 mb-1">{formatTooltipDate(label, rangeKey)}</p>
      <p className="text-sm font-bold text-amber-400 tabular-nums">{fmtUsd(payload[0].value)}</p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const [allShirts,   setAllShirts]   = useState([]);
  const [history,     setHistory]     = useState([]);
  const [recent,      setRecent]      = useState([]);
  const [topValue,    setTopValue]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [selectedRange, setSelectedRange] = useState(RANGES.find(r => r.key === 'MAX'));

  useEffect(() => {
    async function load() {
      const [
        { data: shirts },
        { data: ph },
        { data: recentData },
        { data: topData },
      ] = await Promise.all([
        supabase.from('shirts').select('id, purchase_price, current_value'),
        supabase.from('price_history').select('shirt_id, price, recorded_at').order('recorded_at', { ascending: true }),
        supabase.from('shirts').select('id, brand, style, condition, current_value, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('shirts').select('id, brand, style, condition, current_value, purchase_price').order('current_value', { ascending: false }).limit(5),
      ]);

      setAllShirts(shirts ?? []);
      setHistory(ph ?? []);
      setRecent(recentData ?? []);
      setTopValue(topData ?? []);
      setLoading(false);
    }
    load();
  }, []);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const totalValue  = allShirts.reduce((s, r) => s + (r.current_value   ?? 0), 0);
  const totalCost   = allShirts.reduce((s, r) => s + (r.purchase_price  ?? 0), 0);
  const shirtCount  = allShirts.length;

  // ── Chart data ─────────────────────────────────────────────────────────────
  const allPoints  = useMemo(() => buildTimeline(history), [history]);
  const chartData  = useMemo(() => getVisibleData(allPoints, selectedRange.ms), [allPoints, selectedRange]);
  const chartTicks = useMemo(() => generateTicks(chartData, selectedRange.key), [chartData, selectedRange.key]);

  // Range-relative gain: compare current portfolio value vs. value at range start
  const rangeStartValue = chartData.length > 0 ? chartData[0].value : 0;
  const rangeGain       = totalValue - rangeStartValue;
  const rangeGainPct    = rangeStartValue > 0 ? (rangeGain / rangeStartValue) * 100 : 0;
  const gainUp          = rangeGain >= 0;

  const allTimeGain    = totalValue - totalCost;
  const allTimeGainPct = totalCost > 0 ? (allTimeGain / totalCost) * 100 : 0;

  if (loading) return <Spinner />;

  const hasChart = chartData.length >= 2;

  return (
    <div className="space-y-5">

      {/* ── Hero + Chart card ─────────────────────────────────────────────── */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800/60 overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-3">
            Total Portfolio Value
          </p>

          {/* Big value */}
          <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
            <span className="text-5xl sm:text-6xl font-bold text-gray-50 tracking-tight tabular-nums leading-none">
              {fmtUsd(totalValue)}
            </span>

            {/* Range gain pill */}
            <div className={`flex items-center gap-1.5 mb-1 text-sm font-semibold tabular-nums ${gainUp ? 'text-emerald-400' : 'text-red-400'}`}>
              <span className="text-base leading-none">{gainUp ? '▲' : '▼'}</span>
              <span>{fmtUsd(Math.abs(rangeGain))}</span>
              <span className="font-medium">
                ({gainUp ? '+' : ''}{rangeGainPct.toFixed(2)}%)
              </span>
              <span className="text-gray-600 font-normal ml-0.5 text-xs">
                {selectedRange.key === 'MAX' ? 'all time' : `past ${selectedRange.label}`}
              </span>
            </div>
          </div>

          {/* Mini stats strip */}
          <div className="flex flex-wrap gap-5 mt-4 text-xs text-gray-600">
            <span>
              <span className="text-gray-400 font-semibold">{shirtCount}</span>{' '}
              shirt{shirtCount !== 1 ? 's' : ''}
            </span>
            <span>
              <span className="text-gray-400 font-semibold">{fmtUsd(totalCost)}</span>{' '}
              cost basis
            </span>
            <span className={`font-semibold ${allTimeGainPct >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {allTimeGainPct >= 0 ? '+' : ''}{allTimeGainPct.toFixed(1)}% all-time return
            </span>
          </div>
        </div>

        {/* Range buttons */}
        <div className="flex items-center gap-1 px-6 pb-4">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setSelectedRange(r)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-150 ${
                selectedRange.key === r.key
                  ? 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30'
                  : 'text-gray-600 hover:text-gray-300 hover:bg-gray-800'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Chart */}
        <div className="h-56 sm:h-72 px-2 pb-2">
          {hasChart ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="amberGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#fbbf24" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#fbbf24" stopOpacity={0}    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#1f2937"
                  vertical={false}
                />

                <XAxis
                  dataKey="date"
                  type="number"
                  scale="time"
                  domain={['dataMin', 'dataMax']}
                  ticks={chartTicks}
                  tickFormatter={(ts) => formatXTick(ts, selectedRange.key)}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#4b5563', fontSize: 11 }}
                  dy={8}
                />

                <YAxis
                  tickFormatter={fmtCompact}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#4b5563', fontSize: 11 }}
                  width={52}
                  tickCount={5}
                  domain={[
                    (d) => Math.floor(d * 0.985),
                    (d) => Math.ceil(d  * 1.015),
                  ]}
                />

                <Tooltip
                  content={<ChartTooltip rangeKey={selectedRange.key} />}
                  cursor={{ stroke: '#374151', strokeWidth: 1 }}
                />

                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#fbbf24"
                  strokeWidth={2}
                  fill="url(#amberGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#fbbf24', stroke: '#0a0a0f', strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-2">
              <p className="text-sm text-gray-600">No price history for this period</p>
              <Link to="/shirts/new" className="text-xs text-amber-400 hover:text-amber-300 transition-colors">
                Add shirts and log prices to build your chart →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom grid ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Most Valuable */}
        <section className="bg-gray-900 rounded-2xl border border-gray-800/60 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800/60">
            <h2 className="font-semibold text-gray-100 text-sm">Most Valuable</h2>
            <Link to="/collection" className="text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors">
              View all →
            </Link>
          </div>

          {topValue.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-600 text-sm">No valued shirts yet.</p>
            </div>
          ) : (
            <>
              {/* Table header */}
              <div className="grid grid-cols-[2rem_1fr_auto_auto] items-center gap-3 px-6 py-2 border-b border-gray-800/40">
                {['#', 'Shirt', 'Value', 'Gain'].map((h) => (
                  <span key={h} className="text-[10px] font-semibold text-gray-700 uppercase tracking-widest last:text-right">
                    {h}
                  </span>
                ))}
              </div>

              <ul>
                {topValue.map((s, i) => {
                  const pct = s.purchase_price && s.current_value
                    ? ((s.current_value - s.purchase_price) / s.purchase_price) * 100
                    : null;
                  const up = pct == null || pct >= 0;

                  return (
                    <li key={s.id} className="border-b border-gray-800/30 last:border-0">
                      <Link
                        to={`/shirts/${s.id}`}
                        className="grid grid-cols-[2rem_1fr_auto_auto] items-center gap-3 px-6 py-3.5 hover:bg-gray-800/40 transition-colors group"
                      >
                        <span className="text-xs font-bold text-gray-700 text-center">{i + 1}</span>

                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-200 group-hover:text-amber-400 transition-colors truncate leading-snug">
                            {s.brand}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <ConditionBadge condition={s.condition} />
                            <span className="text-[10px] text-gray-600 capitalize">{s.style?.replace('_', ' ')}</span>
                          </div>
                        </div>

                        <span className="text-sm font-bold text-gray-100 tabular-nums text-right">
                          {fmtUsd(s.current_value)}
                        </span>

                        <span className={`text-xs font-bold tabular-nums text-right ${up ? 'text-emerald-400' : 'text-red-400'}`}>
                          {pct != null ? `${up ? '+' : ''}${pct.toFixed(1)}%` : '—'}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>

        {/* Recent Additions */}
        <section className="bg-gray-900 rounded-2xl border border-gray-800/60 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800/60">
            <h2 className="font-semibold text-gray-100 text-sm">Recent Additions</h2>
            <Link to="/collection" className="text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors">
              View all →
            </Link>
          </div>

          {recent.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-600 text-sm">No shirts yet.</p>
              <Link to="/shirts/new" className="text-amber-400 hover:text-amber-300 text-xs mt-1 inline-block transition-colors">
                Add your first shirt →
              </Link>
            </div>
          ) : (
            <ul>
              {recent.map((s) => (
                <li key={s.id} className="border-b border-gray-800/30 last:border-0">
                  <Link
                    to={`/shirts/${s.id}`}
                    className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-800/40 transition-colors group"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-200 group-hover:text-amber-400 transition-colors truncate leading-snug">
                        {s.brand}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <ConditionBadge condition={s.condition} />
                        <span className="text-[10px] text-gray-600 capitalize">{s.style?.replace('_', ' ')}</span>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-amber-400 tabular-nums flex-shrink-0 ml-4">
                      {s.current_value ? fmtUsd(s.current_value) : '—'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

      </div>
    </div>
  );
}
