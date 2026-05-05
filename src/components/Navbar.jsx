import { NavLink } from 'react-router-dom';
import { TagIcon } from './Logo';

const links = [
  { to: '/',              label: 'Dashboard',     end: true  },
  { to: '/collection',   label: 'Collection',    end: false },
  { to: '/shirts/new',   label: '+ Add Shirt',   end: false },
  { to: '/price-history', label: 'Price History', end: false },
  { to: '/profile',      label: 'Profile',       end: false },
];

export default function Navbar() {
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
        </nav>
      </div>
    </header>
  );
}
