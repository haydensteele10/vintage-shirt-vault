export function TagIcon({ size = 28, className = '' }) {
  const w = Math.round(size * 28 / 34);
  return (
    <svg
      width={w}
      height={size}
      viewBox="0 0 28 34"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d="M9 7.5 Q14 1 19 7.5" stroke="#C4541A" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="1.5" y="6" width="25" height="26.5" rx="3.5" stroke="#C4541A" strokeWidth="1.5" fill="#C4541A" fillOpacity="0.1" />
      <circle cx="14" cy="9.5" r="2.5" stroke="#C4541A" strokeWidth="1.5" />
      <polyline points="5,30 10,24.5 15,26 20,18.5 24,21" stroke="#C4541A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
