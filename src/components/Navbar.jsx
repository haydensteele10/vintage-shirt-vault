import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TagIcon } from './Logo';

const links = [
  { to: '/',              label: 'Dashboard' },
  { to: '/collection',    label: 'Collection' },
  { to: '/shirts/new',    label: '+ Add Shirt' },
  { to: '/price-history', label: 'Price History' },
];

export default function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  return (
    <header className="sticky top-0 z-50 bg-gray-950/90 backdrop-blur-md border-b border-gray-800/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-15 py-3">
        <NavLink to="/" className="flex items-center gap-2.5 font-bold text-base tracking-tight group">
          <TagIcon size={26} />
          <span className="text-gray-100 group-hover:text-amber-400 transition-colors">Tag Charting</span>
        </NavLink>

        <div className="flex items-center gap-1.5">
          <nav className="hidden sm:flex items-center gap-0.5">
            {links.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
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

          <div className="flex items-center gap-2 ml-3 pl-3 border-l border-gray-800">
            <span className="text-xs text-gray-600 hidden md:block max-w-[140px] truncate">
              {user?.email}
            </span>
            <button
              onClick={handleSignOut}
              className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-all duration-150"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
