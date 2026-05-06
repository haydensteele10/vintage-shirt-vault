import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from './Navbar';
import BottomNav from './BottomNav';
import Onboarding from './Onboarding';

export default function Layout() {
  const { user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    const key = `onboarding_done_${user.id}`;
    if (!localStorage.getItem(key)) {
      setShowOnboarding(true);
    }
  }, [user?.id]);

  function finishOnboarding() {
    if (user?.id) {
      localStorage.setItem(`onboarding_done_${user.id}`, '1');
    }
    setShowOnboarding(false);
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-950 overflow-x-hidden">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:pb-8 pb-32">
        <Outlet />
      </main>
      <BottomNav />
      {showOnboarding && <Onboarding onDone={finishOnboarding} />}
    </div>
  );
}
