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

function ActivityIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
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
        `flex flex-col items-center gap-1 px-2 py-3 text-[10px] font-medium transition-colors min-w-0 flex-1 ${
          isActive ? 'text-amber-400' : 'text-gray-500 active:text-gray-300'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon />
          <span>{label}</span>
        </>
      )}
    </NavLink>
  );
}

export default function BottomNav() {
  const { openAddShirt } = useSheet();

  return (
    <nav
      className="sm:hidden fixed bottom-0 inset-x-0 z-50 bg-gray-950/95 backdrop-blur-md border-t border-gray-800/60"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-end">
        <Tab to="/"           end  label="Home"       Icon={HomeIcon} />
        <Tab to="/collection"      label="Collection" Icon={CollectionIcon} />

        {/* Center FAB — opens the add-shirt sheet */}
        <div className="flex flex-col items-center gap-1 px-2 py-2 text-[10px] font-medium text-gray-500 flex-1">
          <button
            onClick={openAddShirt}
            className="w-12 h-12 -mt-5 flex items-center justify-center rounded-full bg-amber-500 active:bg-amber-600 shadow-lg shadow-amber-500/30 ring-4 ring-gray-950 transition-colors"
            aria-label="Add shirt"
          >
            <svg className="w-6 h-6 text-gray-950" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <span className="mt-0.5">Add</span>
        </div>

        <Tab to="/activity"        label="Feed"       Icon={ActivityIcon} />
        <Tab to="/discover"        label="Discover"   Icon={DiscoverIcon} />
        <Tab to="/profile"         label="Profile"    Icon={ProfileIcon} />
      </div>
    </nav>
  );
}
