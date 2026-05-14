import { NavLink } from 'react-router-dom';
import { useSheet } from '../context/SheetContext';

function HomeIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0h6" />
    </svg>
  );
}

function CollectionIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function SocialIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m10-4a4 4 0 11-8 0 4 4 0 018 0zM3 8a4 4 0 118 0 4 4 0 01-8 0z" />
    </svg>
  );
}

function DiscoverIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
      <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function Tab({ to, end, label, Icon }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex flex-col items-center gap-1 px-1.5 py-3 min-w-0 flex-1 transition-colors duration-150 cursor-pointer ${
          isActive ? 'text-amber-500' : 'text-gray-600 active:text-gray-400'
        }`
      }
    >
      <Icon />
      <span className="font-condensed text-[8px] font-semibold uppercase tracking-wider">{label}</span>
    </NavLink>
  );
}

export default function BottomNav() {
  const { openAddShirt } = useSheet();

  return (
    <nav
      className="sm:hidden fixed bottom-0 inset-x-0 z-50 bg-gray-950 border-t-2 border-gray-800"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-end">
        <Tab to="/dashboard"  end  label="Home"       Icon={HomeIcon} />
        <Tab to="/collection"      label="Collection" Icon={CollectionIcon} />
        <Tab to="/search"          label="Search"     Icon={SearchIcon} />

        {/* Center FAB */}
        <div className="flex flex-col items-center gap-1 px-1.5 py-2 flex-1">
          <button
            onClick={openAddShirt}
            className="w-12 h-12 -mt-5 flex items-center justify-center rounded-full bg-orange-500 active:bg-orange-600 ring-2 ring-gray-950 transition-colors duration-150 cursor-pointer"
            aria-label="Add shirt"
          >
            <svg className="w-6 h-6 text-gray-950" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <span className="font-condensed text-[8px] font-semibold uppercase tracking-wider text-gray-600 mt-0.5">Add</span>
        </div>

        <Tab to="/social"          label="Social"     Icon={SocialIcon} />
        <Tab to="/discover"        label="Discover"   Icon={DiscoverIcon} />
        <Tab to="/profile"         label="Profile"    Icon={ProfileIcon} />
      </div>
    </nav>
  );
}
