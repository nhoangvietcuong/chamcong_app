import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import TopAppBar from '../components/layout/TopAppBar';
import BottomNavigation from '../components/layout/BottomNavigation';
import OfflineBanner from '../components/layout/OfflineBanner';
import NotificationPromptModal from '../components/NotificationPromptModal';
import { useNotification } from '../hooks/useNotification';

export const MainLayout = () => {
  const { fetchNotifications } = useNotification();

  useEffect(() => {
    // Initial fetch on mount
    fetchNotifications();

    // Poll every 15 seconds to fetch new notifications in background
    const interval = setInterval(() => {
      fetchNotifications();
    }, 15000);

    return () => clearInterval(interval);
  }, [fetchNotifications]);

  return (
    <div className="min-h-screen bg-[var(--bg-app)] flex flex-col text-[var(--text-primary)]">
      {/* Top Header */}
      <TopAppBar />
      
      {/* Offline Status Alert */}
      <OfflineBanner />

      {/* Notification Permission & iOS PWA Prompt Modal */}
      <NotificationPromptModal />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 py-4 pb-24 overflow-x-hidden">
        <Outlet />
      </main>

      {/* Bottom Sticky Tab bar */}
      <BottomNavigation />
    </div>
  );
};

export default MainLayout;
