import { Link, useLocation } from 'react-router-dom';
import { Home, Users, ArrowLeft } from 'lucide-react';
import { clsx } from 'clsx';
import { Avatar } from '../ui/Avatar';
import { useApp } from '../../context/AppContext';

export function Header({ title, showBack = false, onBack }) {
  const location = useLocation();
  const { profile, signOut } = useApp();

  return (
    <header className="sticky top-0 z-40 bg-white border-b">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Left side */}
        <div className="flex items-center gap-3">
          {showBack ? (
            <button
              onClick={onBack}
              className="p-2 -ml-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <Link
              to="/"
              className="flex items-center gap-2 text-indigo-600 font-bold text-lg"
            >
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">$</span>
              </div>
              <span className="hidden sm:inline">SplitEase</span>
            </Link>
          )}

          {title && (
            <h1 className="text-lg font-semibold text-gray-900 truncate">
              {title}
            </h1>
          )}
        </div>

        {/* Right side - Navigation */}
        <div className="flex items-center gap-3">
          {!showBack && (
            <nav className="flex items-center gap-1">
              <NavLink to="/" icon={Home} label="Home" active={location.pathname === '/'} />
              <NavLink
                to="/groups"
                icon={Users}
                label="Groups"
                active={location.pathname.startsWith('/groups')}
              />
            </nav>
          )}
          {profile && (
            <div className="flex items-center gap-2">
              <Avatar name={profile.fullName} color="#6366F1" size="xs" />
              <span className="hidden sm:inline text-sm text-gray-700 max-w-[120px] truncate">
                {profile.fullName}
              </span>
              <button
                type="button"
                onClick={signOut}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function NavLink({ to, icon: Icon, label, active }) {
  return (
    <Link
      to={to}
      className={clsx(
        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
        active
          ? 'bg-indigo-50 text-indigo-700'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
      )}
    >
      <Icon className="w-4 h-4" />
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}
