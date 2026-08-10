import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import { useOffline } from '../../hooks/useOffline';
import { getProtectedImageUrl } from '../../utils/imageUtils';
import { RiNotification3Line, RiWifiLine, RiWifiOffLine, RiSettings4Line } from 'react-icons/ri';

export const TopAppBar = () => {
  const { user } = useAuth();
  const { unreadCount } = useNotification();
  const { isOffline } = useOffline();
  const navigate = useNavigate();

  return (
    <header
      className="sticky top-0 z-40 w-full text-white px-4 py-3 flex items-center justify-between shadow-sm"
      style={{ background: 'linear-gradient(90deg, #22C55E, #16A34A)' }}
    >
      {/* Left Branding */}
      <div className="flex items-center gap-2">
        <div className="flex items-center text-white" title={isOffline ? "Ngoại tuyến" : "Trực tuyến"}>
          {isOffline ? (
            <RiWifiOffLine className="text-red-200 text-lg animate-pulse" style={{ color: '#FECACA' }} />
          ) : (
            <RiWifiLine className="text-white text-lg" style={{ color: '#FFFFFF' }} />
          )}
        </div>
        <Link to="/" className="flex flex-col leading-none">
          <span className="text-base font-black tracking-tight text-white" style={{ color: '#FFFFFF' }}>CHAMCONG</span>
          <span className="text-[10px] font-bold text-emerald-100 tracking-wider" style={{ color: '#DCFCE7' }}>APP</span>
        </Link>
      </div>

      {/* Right Icons & User Avatar */}
      <div className="flex items-center gap-3">
        {/* Settings Icon */}
        <button
          onClick={() => navigate('/settings')}
          className="relative p-1.5 text-white hover:text-white transition-colors focus:outline-none active:scale-95 cursor-pointer"
          title="Cài đặt"
          style={{ color: '#FFFFFF' }}
        >
          <RiSettings4Line className="text-xl" style={{ color: '#FFFFFF' }} />
        </button>

        {/* Notifications Icon with Badge */}
        <button
          onClick={() => navigate('/notifications')}
          className="relative p-1.5 text-white hover:text-white transition-colors focus:outline-none active:scale-95 cursor-pointer"
          title="Thông báo"
          style={{ color: '#FFFFFF' }}
        >
          <RiNotification3Line className="text-xl" style={{ color: '#FFFFFF' }} />
          {unreadCount > 0 && (
            <span
              className="absolute top-0.5 right-0.5 h-3.5 w-3.5 bg-red-500 text-[9px] font-black text-white rounded-full flex items-center justify-center border border-white"
              style={{ backgroundColor: '#EF4444', color: '#FFFFFF' }}
            >
              {unreadCount}
            </span>
          )}
        </button>


        {/* Avatar / Profile Link */}
        <button
          onClick={() => navigate('/profile')} 
          className="h-8 w-8 rounded-full flex items-center justify-center font-extrabold text-xs shadow-sm overflow-hidden hover:scale-105 active:scale-95 transition-transform cursor-pointer"
          style={{ backgroundColor: '#DCFCE7', color: '#15803D', border: '1px solid #BBF7D0' }}
        >
          {user?.avatarUrl ? (
            <img src={getProtectedImageUrl(user.avatarUrl)} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            <span style={{ color: '#15803D' }}>{user?.fullName?.split(' ').pop()?.charAt(0).toUpperCase() || 'A'}</span>
          )}
        </button>
      </div>
    </header>
  );
};

export default TopAppBar;
