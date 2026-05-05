const colors = {
  Mint:      'bg-emerald-100 text-emerald-800',
  Excellent: 'bg-blue-100 text-blue-800',
  Good:      'bg-amber-100 text-amber-800',
  Fair:      'bg-orange-100 text-orange-800',
  Poor:      'bg-red-100 text-red-800',
};

export default function ConditionBadge({ condition }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${colors[condition] ?? 'bg-gray-100 text-gray-700'}`}>
      {condition}
    </span>
  );
}
