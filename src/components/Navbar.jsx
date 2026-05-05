import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/',               label: 'Dashboard' },
  { to: '/collection',     label: 'My Collection' },
  { to: '/shirts/new',     label: '+ Add Shirt' },
  { to: '/price-history',  label: 'Price History' },
];

export default function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  return (
    <header className="bg-gray-900 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <NavLink to="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
          <span className="text-amber-400">&#128085;</span>
          <span>Vintage Shirt Vault</span>
        </NavLink>

        <div className="flex items-center gap-2">
          <nav className="flex items-center gap-1">
            {links.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-amber-500 text-gray-900'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2 ml-3 pl-3 border-l border-gray-700">
            <span className="text-xs text-gray-400 hidden sm:block max-w-[160px] truncate">
              {user?.email}
            </span>
            <button
              onClick={handleSignOut}
              className="px-3 py-1.5 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white rounded transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
