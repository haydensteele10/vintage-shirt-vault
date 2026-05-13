import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export default function RequireAuth() {
  const { session, user } = useAuth();
  const location = useLocation();

  const [dbChecked,       setDbChecked]       = useState(false);
  const [hasUsernameInDb, setHasUsernameInDb] = useState(false);

  useEffect(() => {
    if (!user?.id) { setDbChecked(true); return; }

    const key = `username_set_${user.id}`;
    if (sessionStorage.getItem(key) === '1') { setDbChecked(true); return; }

    supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        const has = !!(data?.username);
        if (has) sessionStorage.setItem(key, '1');
        setHasUsernameInDb(has);
        setDbChecked(true);
      })
      .catch(() => {
        // Fail open — don't block the user if the check errors
        setDbChecked(true);
        setHasUsernameInDb(true);
      });
  }, [user?.id]);

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Show blank while the one-time DB check is in flight
  if (!dbChecked) {
    return <div className="min-h-screen bg-gray-950" />;
  }

  // Re-check sessionStorage on every render so post-SetupUsername navigation works
  // without a full page reload.
  const sessionKey       = user?.id ? `username_set_${user.id}` : null;
  const sessionConfirmed = sessionKey ? sessionStorage.getItem(sessionKey) === '1' : false;
  const needsUsername    = !sessionConfirmed && !hasUsernameInDb;

  if (needsUsername && location.pathname !== '/setup-username') {
    return <Navigate to="/setup-username" replace />;
  }

  return <Outlet />;
}
