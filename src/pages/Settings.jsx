import React, { useState, useEffect } from 'react';
import { useOffline } from '../hooks/useOffline';
import { useAssignment } from '../hooks/useAssignment';
import { useAttendance } from '../hooks/useAttendance';
import { useNotification } from '../hooks/useNotification';
import { useProfile } from '../hooks/useProfile';
import { usePushSubscription } from '../hooks/usePushSubscription';
import { 
  RiMoonLine, 
  RiSunLine, 
  RiTranslate2, 
  RiNotificationBadgeLine, 
  RiLockPasswordLine, 
  RiInformationLine, 
  RiHardDrive3Line,
  RiRefreshLine,
  RiMapPinLine,
  RiCameraLine,
  RiNotification3Line,
  RiCheckboxMultipleBlankLine,
  RiShieldCheckLine,
  RiDeleteBin7Line,
  RiExternalLinkLine
} from 'react-icons/ri';

export const Settings = () => {
  // Theme state
  const [theme, setTheme] = useState(localStorage.getItem('appTheme') || 'system');
  
  // Language state
  const [language, setLanguage] = useState(localStorage.getItem('appLang') || 'vi');

  // Notification states
  const [notifPush, setNotifPush] = useState(localStorage.getItem('notifPush') !== 'false');
  const [notifAttendance, setNotifAttendance] = useState(localStorage.getItem('notifAttendance') !== 'false');
  const [notifAssignment, setNotifAssignment] = useState(localStorage.getItem('notifAssignment') !== 'false');
  const [notifSync, setNotifSync] = useState(localStorage.getItem('notifSync') !== 'false');

  // Permissions state
  const [gpsPermission, setGpsPermission] = useState('prompt');
  const [cameraPermission, setCameraPermission] = useState('prompt');
  const [notificationPermission, setNotificationPermission] = useState('prompt');

  // Cache size state
  const [cacheSizeKb, setCacheSizeKb] = useState(0);

  const { fetchTodayAssignment } = useAssignment();
  const { fetchTodayState, fetchAttendanceHistory } = useAttendance();
  const { fetchNotifications } = useNotification();
  const { loadProfile } = useProfile();
  const { subscribe, isSubscribing } = usePushSubscription();

  // Handle Theme Change
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      localStorage.setItem('appTheme', 'dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
      localStorage.setItem('appTheme', 'light');
    } else {
      // System theme
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (systemPrefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      localStorage.setItem('appTheme', 'system');
    }
  }, [theme]);

  // Query Permissions
  const checkPermissions = async () => {
    try {
      if (navigator.permissions) {
        const gpsStatus = await navigator.permissions.query({ name: 'geolocation' });
        setGpsPermission(gpsStatus.state);
        gpsStatus.onchange = () => setGpsPermission(gpsStatus.state);

        try {
          const camStatus = await navigator.permissions.query({ name: 'camera' });
          setCameraPermission(camStatus.state);
          camStatus.onchange = () => setCameraPermission(camStatus.state);
        } catch (e) {
          // Camera permission query not supported in some browsers
          setCameraPermission('prompt');
        }

        try {
          const notifStatus = await navigator.permissions.query({ name: 'notifications' });
          setNotificationPermission(notifStatus.state);
          notifStatus.onchange = () => setNotificationPermission(notifStatus.state);
        } catch (e) {
          setNotificationPermission(window.Notification?.permission || 'denied');
        }
      } else {
        setNotificationPermission(window.Notification?.permission || 'denied');
      }
    } catch (err) {
      console.warn('Error querying permissions:', err);
    }
  };

  useEffect(() => {
    checkPermissions();
  }, []);

  // Calculate Cache Size
  const calculateCacheSize = async () => {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      const usedBytes = estimate.usage || 0;
      setCacheSizeKb(Math.round(usedBytes / 1024));
    }
  };

  useEffect(() => {
    calculateCacheSize();
  }, []);

  // Toggle state triggers
  const handleTogglePush = async (val) => {
    setNotifPush(val);
    localStorage.setItem('notifPush', val);
    
    // If user enables push notification, trigger subscription flow
    if (val) {
      const success = await subscribe();
      if (success) {
        checkPermissions(); // Update permission status
      } else {
        // Revert toggle if subscription failed
        setNotifPush(false);
        localStorage.setItem('notifPush', false);
      }
    }
  };
  const handleToggleAttendance = (val) => {
    setNotifAttendance(val);
    localStorage.setItem('notifAttendance', val);
  };
  const handleToggleAssignment = (val) => {
    setNotifAssignment(val);
    localStorage.setItem('notifAssignment', val);
  };
  const handleToggleSync = (val) => {
    setNotifSync(val);
    localStorage.setItem('notifSync', val);
  };

  // Open settings instructions
  const openBrowserSettings = () => {
    alert(
      'Hướng dẫn cấp quyền trong trình duyệt:\n\n' +
      '1. Nhấp vào biểu tượng 🔒 (Khóa) hoặc ⚙️ (Cài đặt) trên thanh địa chỉ trình duyệt.\n' +
      '2. Bật quyền cho Vị trí (GPS), Máy ảnh (Camera) và Thông báo (Notifications).\n' +
      '3. Tải lại trang để áp dụng các thay đổi quyền.'
    );
  };

  // Clear cache action (respects attendance queue!)
  const handleClearCache = async () => {
    if (!confirm('Bạn có chắc chắn muốn xóa bộ nhớ đệm ứng dụng? Các thông tin phân công và lịch sử đã cache sẽ được tải lại.')) return;

    try {
      // Clear cache storage API
      if (window.caches) {
        const keys = await caches.keys();
        await Promise.all(keys.map(key => caches.delete(key)));
      }
      
      // Clear profile and settings cached data in LocalStorage (keep token and theme/language!)
      const token = localStorage.getItem('accessToken');
      const refresh = localStorage.getItem('refreshToken');
      
      localStorage.clear();
      
      if (token) localStorage.setItem('accessToken', token);
      if (refresh) localStorage.setItem('refreshToken', refresh);
      localStorage.setItem('appTheme', theme);
      localStorage.setItem('appLang', language);

      await calculateCacheSize();
      alert('Đã xóa bộ nhớ đệm thành công! Hàng đợi chấm công ngoại tuyến vẫn được bảo vệ an toàn.');
    } catch (err) {
      alert('Xóa bộ nhớ đệm thất bại: ' + err.message);
    }
  };

  // Refresh cached data from backend
  const handleRefreshCache = async () => {
    try {
      await Promise.all([
        fetchTodayAssignment(),
        fetchTodayState(),
        fetchAttendanceHistory({ page: 1, limit: 10 }),
        fetchNotifications(),
        loadProfile(),
      ]);
      await calculateCacheSize();
      alert('Đã làm mới và đồng bộ lại toàn bộ dữ liệu cache từ máy chủ!');
    } catch (err) {
      alert('Làm mới cache thất bại: ' + err.message);
    }
  };

  const getPermissionLabel = (state) => {
    switch (state) {
      case 'granted':
        return <span className="text-[#10B981] font-black text-[9px] uppercase text-right leading-tight w-14">Đã cấp<br/>quyền</span>;
      case 'denied':
        return <span className="text-red-400 font-black text-[9px] uppercase text-right leading-tight w-14">Bị từ<br/>chối</span>;
      default:
        return <span className="text-[#F87171] font-black text-[9px] uppercase text-right leading-tight w-14">Chờ yêu<br/>cầu</span>;
    }
  };

  return (
    <div className="p-4 space-y-4 pb-24 bg-white min-h-screen text-gray-900 animate-fade-in">
      {/* Title */}
      <div className="pt-1">
        <h1 className="text-xl font-bold text-gray-900">Cài Đặt Hệ Thống</h1>
        <p className="text-xs text-gray-500 font-medium mt-0.5">Quản lý thông báo và quyền ứng dụng</p>
      </div>

      {/* Notification Center toggles */}
      <div className="bg-white p-5 rounded-2xl shadow-sm space-y-4 border border-gray-200">
        <h2 className="text-gray-900 font-bold text-sm border-b border-gray-100 pb-4 flex items-center gap-3">
          <div className="bg-emerald-50 p-2 rounded-xl text-[#10B981]">
            <RiNotification3Line className="text-xl" />
          </div>
          <span>Cấu hình thông báo</span>
        </h2>
        <div className="space-y-5 pt-1">
          {[
            { label: 'Push Notifications (Tất cả)', val: notifPush, set: handleTogglePush },
            { label: 'Thông báo chấm công\n(Attendance)', val: notifAttendance, set: handleToggleAttendance },
            { label: 'Thông báo đồng bộ (Offline Sync)', val: notifSync, set: handleToggleSync }
          ].map((item, idx) => (
            <div key={idx} className="flex justify-between items-center text-xs font-bold">
              <span className="text-gray-700 whitespace-pre-line leading-tight">{item.label}</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={item.val}
                  onChange={(e) => item.set(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#10B981]"></div>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Permission Center */}
      <div className="bg-white border border-emerald-500 p-5 rounded-2xl shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-gray-100 pb-4">
          <h2 className="text-gray-900 font-bold text-sm flex items-center gap-3">
            <div className="bg-emerald-50 p-2 rounded-xl text-[#10B981]">
              <RiShieldCheckLine className="text-xl" />
            </div>
            <span className="leading-tight">Quản lý quyền<br/>trình duyệt</span>
          </h2>
          <span className="bg-emerald-50 text-[#10B981] text-[9px] font-black px-3 py-2 rounded-full uppercase tracking-wider text-center leading-tight">
            Permission<br/>Center
          </span>
        </div>
        <div className="space-y-5 text-xs font-bold pt-1">
          {[
            { label: 'Quyền vị trí GPS', icon: <RiMapPinLine className="text-lg text-gray-400" />, state: gpsPermission, singleLineLabel: true },
            { label: 'Quyền Máy ảnh\n(Camera)', icon: <RiCameraLine className="text-lg text-gray-400" />, state: cameraPermission },
            { label: 'Quyền Nhận thông báo\n(Push)', icon: <RiNotification3Line className="text-lg text-gray-400" />, state: notificationPermission },
            { label: 'Đồng bộ nền (Background\nSync)', icon: <RiCheckboxMultipleBlankLine className="text-lg text-gray-400" />, state: 'granted' }
          ].map((perm, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className="flex-shrink-0">{perm.icon}</div>
              <span className="text-gray-700 flex-1 whitespace-pre-line leading-tight">{perm.label}</span>
              {perm.singleLineLabel && perm.state === 'granted' ? (
                <span className="text-[#10B981] font-black text-[9px] uppercase text-right leading-tight w-14">Đã cấp quyền</span>
              ) : (
                getPermissionLabel(perm.state)
              )}
            </div>
          ))}

          <button
            onClick={openBrowserSettings}
            style={{ backgroundColor: '#10B981', color: '#FFFFFF' }}
            className="w-full py-3.5 font-bold rounded-xl shadow-md hover:opacity-90 transition-all text-xs flex items-center justify-center gap-2 mt-2 cursor-pointer"
          >
            <RiExternalLinkLine className="text-lg" />
            Mở Cài Đặt Quyền Trình Duyệt
          </button>
        </div>
      </div>

      {/* Cache & Data Management */}
      <div className="bg-white p-5 rounded-2xl shadow-sm space-y-4 border border-gray-200">
        <h2 className="text-gray-900 font-bold text-sm border-b border-gray-100 pb-4 flex items-center gap-3">
          <div className="bg-emerald-50 p-2 rounded-xl text-[#10B981]">
            <RiHardDrive3Line className="text-xl" />
          </div>
          <span>Dữ liệu & Bộ nhớ Cache</span>
        </h2>
        <div className="space-y-5 pt-1">
          <div className="flex justify-between items-center text-xs font-bold text-gray-700">
            <span>Dung lượng bộ nhớ đã dùng:</span>
            <span className="text-gray-900 font-black">{cacheSizeKb} KB</span>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleRefreshCache}
              style={{ backgroundColor: '#10B981', color: '#FFFFFF' }}
              className="flex-1 py-3.5 font-bold rounded-xl shadow-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 text-xs cursor-pointer"
            >
              <RiRefreshLine className="text-lg" /> Làm mới
            </button>
            <button
              onClick={handleClearCache}
              style={{ backgroundColor: '#EF4444', color: '#FFFFFF' }}
              className="flex-1 py-3.5 font-bold rounded-xl shadow-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 text-xs cursor-pointer"
            >
              <RiDeleteBin7Line className="text-lg" />
              <span className="leading-tight">Xóa bộ nhớ đệm</span>
            </button>
          </div>
        </div>
      </div>

      {/* App Information */}
      <div className="bg-white p-5 rounded-2xl shadow-sm space-y-4 border border-gray-200">
        <h2 className="text-gray-900 font-bold text-sm border-b border-gray-100 pb-4 flex items-center gap-3">
          <div className="bg-emerald-50 p-2 rounded-xl text-[#10B981]">
            <RiInformationLine className="text-xl" />
          </div>
          <span>Thông tin ứng dụng</span>
        </h2>
        <ul className="space-y-4 pt-1 text-[11px] font-bold text-gray-700">
          <li className="flex justify-between items-center"><span>Phiên bản (App Version)</span> <span className="text-gray-900 font-black text-xs">1.0.0</span></li>
          <li className="flex justify-between items-center hidden"><span>Phiên bản biên dịch (Build)</span> <span className="text-slate-200 font-mono">2026.07.02</span></li>
          <li className="flex justify-between items-center"><span>Môi trường (Environment)</span> <span className="text-[#10B981] uppercase font-black text-xs">PRODUCTION</span></li>
          <li className="flex justify-between items-center hidden"><span>Mã API (API Version)</span> <span className="text-slate-200 font-mono">v1</span></li>
          <li className="flex justify-between items-center"><span>TensorFlow.js Version</span> <span className="text-gray-900 font-black text-xs">4.22.0</span></li>
          <li className="flex justify-between items-center"><span>MediaPipe Version</span> <span className="text-gray-900 font-black text-xs">0.10.0</span></li>
        </ul>
      </div>
    </div>
  );
};

export default Settings;
