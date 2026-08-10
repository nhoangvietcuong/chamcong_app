import React, { useEffect, useState } from 'react';
import { useNotification } from '../hooks/useNotification';
import { RiNotification3Line, RiCheckDoubleLine, RiAlertLine, RiDeleteBin6Line } from 'react-icons/ri';
import dayjs from 'dayjs';

export const Notifications = () => {
  const { 
    notifications, 
    unreadCount, 
    isLoading, 
    fetchNotifications, 
    markNotificationAsRead, 
    markAllNotificationsAsRead,
    deleteNotification,
    deleteAllNotifications
  } = useNotification();

  const [swipedId, setSwipedId] = useState(null);
  const [startX, setStartX] = useState(0);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleTouchStart = (e, id) => {
    setStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (e, id) => {
    const currentX = e.touches[0].clientX;
    const diffX = startX - currentX;
    
    // Swipe left (diffX > 50)
    if (diffX > 50) {
      setSwipedId(id);
    } 
    // Swipe right (diffX < -30) to restore
    else if (diffX < -30) {
      if (swipedId === id) {
        setSwipedId(null);
      }
    }
  };

  const getNotifIcon = (type) => {
    switch (type) {
      case 'LEAVE_APPROVED':
      case 'SUCCESS':
        return (
          <div className="p-2.5 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#DCFCE7', color: '#15803D' }}>
            <RiCheckDoubleLine className="text-xl" />
          </div>
        );
      case 'LEAVE_REJECTED':
      case 'FAILED':
        return (
          <div className="p-2.5 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
            <RiAlertLine className="text-xl" />
          </div>
        );
      default:
        return (
          <div className="p-2.5 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}>
            <RiNotification3Line className="text-xl" />
          </div>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-24 text-left" style={{ backgroundColor: '#F6F8FA', minHeight: '100vh' }}>
      {/* Title */}
      <div className="flex items-center justify-between py-1">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Trung Tâm Thông Báo</h1>
          <p className="text-xs text-gray-500 font-medium mt-0.5">Nhận các cập nhật về nghỉ phép, phân công và hệ thống</p>
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              onClick={markAllNotificationsAsRead}
              className="text-xs font-bold focus:outline-none cursor-pointer"
              style={{ color: '#22C55E' }}
            >
              Đọc tất cả
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={async () => {
                if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ thông báo?')) {
                  await deleteAllNotifications();
                }
              }}
              className="text-xs font-bold focus:outline-none cursor-pointer"
              style={{ color: '#EF4444' }}
            >
              Xóa tất cả
            </button>
          )}
        </div>
      </div>

      {/* Notifications list */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5 animate-pulse flex gap-4">
              <div className="h-10 w-10 bg-gray-200 rounded-full flex-shrink-0"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-gray-200 rounded"></div>
                <div className="h-4 w-full bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length > 0 ? (
        <div className="space-y-3">
          {notifications.map((notif) => (
            <div 
              key={notif.id}
              className="relative w-full overflow-hidden rounded-2xl"
              onTouchStart={(e) => handleTouchStart(e, notif.id)}
              onTouchMove={(e) => handleTouchMove(e, notif.id)}
            >
              {/* Slide-to-delete Red Button Behind Card */}
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm('Bạn có chắc chắn muốn xóa thông báo này?')) {
                    deleteNotification(notif.id);
                  }
                  setSwipedId(null);
                }}
                className="absolute right-0 top-0 bottom-0 w-[72px] bg-red-500 text-white rounded-2xl flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-red-600 transition-colors shadow-sm"
                style={{ 
                  zIndex: 1,
                  display: swipedId === notif.id ? 'flex' : 'none'
                }}
              >
                <RiDeleteBin6Line className="text-lg" />
                <span className="text-[9px] font-extrabold">Xóa</span>
              </div>

              {/* Foreground Notification Card */}
              <div
                onClick={() => {
                  if (swipedId === notif.id) {
                    setSwipedId(null);
                  } else {
                    markNotificationAsRead(notif.id);
                  }
                }}
                className={`relative z-10 border rounded-2xl p-4 flex gap-4 bg-white transition-all duration-200 cursor-pointer ${
                  notif.isRead 
                    ? 'border-gray-200 opacity-85' 
                    : 'border-l-4 border-l-green-500 border-y-gray-200 border-r-gray-200 bg-[#F0FDF4]/30 shadow-xs'
                }`}
                style={{
                  borderLeftColor: notif.isRead ? '#E5E7EB' : '#22C55E',
                  transform: swipedId === notif.id ? 'translateX(-72px)' : 'translateX(0px)',
                  transition: 'transform 0.2s ease-out'
                }}
              >
                <div className="flex-shrink-0">{getNotifIcon(notif.type)}</div>
                <div className="flex-1 min-w-0 space-y-1 text-left">
                  <div className="flex items-center justify-between">
                    <h4 className={`font-bold text-xs truncate ${notif.isRead ? 'text-gray-600' : 'text-gray-900'}`}>{notif.title}</h4>
                    <span className="text-[9px] text-gray-400 font-semibold font-mono">
                      {dayjs(notif.time).format('HH:mm DD/MM')}
                    </span>
                  </div>
                  <p className={`text-xs leading-relaxed font-medium ${notif.isRead ? 'text-gray-500' : 'text-gray-700'}`} style={{ whiteSpace: 'pre-line' }}>
                    {notif.body}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white border border-dashed border-gray-300 p-12 rounded-2xl text-center shadow-xs">
          <div className="mx-auto w-14 h-14 text-gray-400 mb-3 flex items-center justify-center bg-gray-50 rounded-full">
            <RiNotification3Line className="text-2xl" />
          </div>
          <h3 className="text-gray-500 text-xs font-bold">Chưa có thông báo nào</h3>
          <p className="text-gray-400 text-[11px] mt-1 max-w-xs mx-auto leading-relaxed font-medium">
            Các cập nhật về phê duyệt đơn nghỉ phép, phân công ca làm mới hoặc thông tin chấm công sẽ hiển thị ở đây.
          </p>
        </div>
      )}
    </div>
  );
};

export default Notifications;
