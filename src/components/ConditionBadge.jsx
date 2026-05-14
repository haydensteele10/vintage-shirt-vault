const colors = {
  Mint:      'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20',
  Excellent: 'bg-gray-500/15 text-gray-200 ring-1 ring-gray-500/20',
  Good:      'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/20',
  Fair:      'bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/20',
  Poor:      'bg-red-500/15 text-red-400 ring-1 ring-red-500/20',
};

export default function ConditionBadge({ condition }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 font-condensed text-[10px] font-semibold uppercase tracking-wider ${colors[condition] ?? 'bg-gray-700 text-gray-400'}`}>
      {condition}
    </span>
  );
}
