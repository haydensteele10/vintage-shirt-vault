import { NavLink } from 'react-router-dom';
import { TagIcon } from './Logo';
import { useTheme } from '../context/ThemeContext';

const links = [
  { to: '/',            label: 'Dashboard',  end: true  },
  { to: '/collection',  label: 'Collection', end: false },
  { to: '/shirts/new',  label: '+ Add Shirt',end: false },
  { to: '/discover',    label: 'Discover',   end: false },
  { to: '/activity',    label: 'Activity',   end: false },
  { to: '/profile',     label: 'Profile',    end: false },
];

function SunIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
      <circle cx="12" cy="12" r="4" strokeLinecap="round" />
      <path strokeLinecap="round" d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  );
}

export default function Navbar() {
  const { isDark, toggle } = useTheme();

  return (
    <header
      className="sticky top-0 z-50 bg-gray-950/90 backdrop-blur-md border-b border-gray-800/60"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-15 py-3">
        <NavLink to="/" className="flex items-center gap-2.5 font-bold text-base tracking-tight group">
          <TagIcon size={26} />
          <span className="text-gray-100 group-hover:text-amber-400 transition-colors">Tag Charting</span>
        </NavLink>

        <nav className="hidden sm:flex items-center gap-0.5">
          {links.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/25'
                    : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800/70'
                }`
              }
            >
              {label}
            </NavLink>
          ))}

          {/* Theme toggle */}
          <button
            onClick={toggle}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="ml-1 p-2 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-gray-800/70 transition-all duration-150"
          >
            {isDark ? <SunIcon /> : <MoonIcon />}
          </button>
        </nav>
      </div>
    </header>
  );
}
