import { NavLink } from 'react-router-dom';
import { useSheet } from '../context/SheetContext';

const TEAL = '#00D4AA';

function HomeIcon() {
  return (
    <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0h6" />
    </svg>
  );
}

function CollectionIcon() {
  return (
    <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function SocialIcon() {
  return (
    <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m10-4a4 4 0 11-8 0 4 4 0 018 0zM3 8a4 4 0 118 0 4 4 0 01-8 0z" />
    </svg>
  );
}

function DiscoverIcon() {
  return (
    <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
      <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function Tab({ to, end, label, Icon }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex flex-col items-center gap-1 flex-1 py-2 min-w-0 transition-colors duration-150 cursor-pointer ${
          isActive ? '' : 'text-gray-600 active:text-gray-500'
        }`
      }
      style={({ isActive }) => (isActive ? { color: TEAL } : {})}
    >
      <Icon />
      <span className="font-condensed text-[9px] font-semibold uppercase tracking-wide leading-none">
        {label}
      </span>
    </NavLink>
  );
}

export default function BottomNav() {
  const { openAddShirt } = useSheet();

  return (
    <nav
      className="sm:hidden fixed z-50 flex items-center"
      style={{
        left: 12,
        right: 12,
        bottom: 'calc(12px + env(safe-area-inset-bottom))',
        backgroundColor: '#1A1A1A',
        borderRadius: 40,
        padding: '6px 4px',
      }}
    >
      <Tab to="/dashboard"  end  label="Home"    Icon={HomeIcon} />
      <Tab to="/collection"      label="Vault"   Icon={CollectionIcon} />
      <Tab to="/search"          label="Search"  Icon={SearchIcon} />

      {/* Center add button */}
      <div className="flex flex-col items-center gap-1 flex-1 py-1">
        <button
          onClick={openAddShirt}
          className="flex items-center justify-center cursor-pointer transition-opacity duration-150 active:opacity-80"
          style={{
            backgroundColor: TEAL,
            borderRadius: 12,
            width: 38,
            height: 38,
            color: '#0A0A0A',
          }}
          aria-label="Add shirt"
        >
          <PlusIcon />
        </button>
        <span className="font-condensed text-[9px] font-semibold uppercase tracking-wide leading-none text-gray-600">
          Add
        </span>
      </div>

      <Tab to="/social"          label="Social"  Icon={SocialIcon} />
      <Tab to="/discover"        label="Explore" Icon={DiscoverIcon} />
      <Tab to="/profile"         label="Profile" Icon={ProfileIcon} />
    </nav>
  );
}
