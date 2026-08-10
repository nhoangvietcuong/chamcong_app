import React from 'react';
import { Link } from 'react-router-dom';
import { useOffline } from '../../hooks/useOffline';
import { RiWifiOffLine, RiRefreshLine } from 'react-icons/ri';

export const OfflineBanner = () => {
  const { isOffline, pendingCount } = useOffline();

  if (!isOffline && pendingCount === 0) return null;

  return (
    <div className="w-full text-sm font-medium z-50">
      {isOffline && (
        <Link to="/sync" className="bg-red-500 text-white px-4 py-2 flex items-center justify-center gap-2 animate-pulse hover:bg-red-600 transition-colors block">
          <RiWifiOffLine className="text-lg" />
          <span>Bạn đang ngoại tuyến. Chấm công sẽ được lưu ngoại tuyến. Click xem hàng đợi.</span>
        </Link>
      )}
      {!isOffline && pendingCount > 0 && (
        <Link to="/sync" className="bg-amber-500 text-slate-900 px-4 py-2 flex items-center justify-center gap-2 hover:bg-amber-400 transition-colors block">
          <RiRefreshLine className="text-lg animate-spin" />
          <span>Đang có {pendingCount} dữ liệu chấm công chờ đồng bộ. Click xem chi tiết.</span>
        </Link>
      )}
    </div>
  );
};

export default OfflineBanner;
