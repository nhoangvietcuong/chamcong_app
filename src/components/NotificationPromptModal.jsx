import React, { useState, useEffect } from 'react';
import { usePushSubscription } from '../hooks/usePushSubscription';
import { RiNotification3Line, RiShareBoxLine, RiAddBoxLine, RiCloseLine, RiCheckLine, RiCheckboxCircleFill } from 'react-icons/ri';

export const NotificationPromptModal = () => {
  const { subscribe, isSubscribing } = usePushSubscription();
  const [isVisible, setIsVisible] = useState(false);
  const [isIosSafari, setIsIosSafari] = useState(false);
  const [isSuccessState, setIsSuccessState] = useState(false);
  const [permissionState, setPermissionState] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const hasNotification = 'Notification' in window;
    const permission = hasNotification ? Notification.permission : 'unsupported';
    setPermissionState(permission);

    // Detect iOS & Standalone Mode
    const userAgent = window.navigator.userAgent || '';
    const isIos = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
    const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;

    // If permission is already granted, silently ensure backend push subscription is active
    if (permission === 'granted') {
      subscribe({ silent: true });
      setIsVisible(false);
      return;
    }

    if (isIos && !isStandalone) {
      setIsIosSafari(true);
      setIsVisible(true);
    } else if (permission !== 'granted') {
      setIsIosSafari(false);
      setIsVisible(true);
    }
  }, [subscribe]);

  const handleEnableNotifications = async () => {
    const success = await subscribe({ silent: false });
    const currentPermission = typeof window !== 'undefined' && window.Notification ? Notification.permission : 'unsupported';
    setPermissionState(currentPermission);

    if (success || currentPermission === 'granted') {
      setIsSuccessState(true);
    } else if (currentPermission === 'denied') {
      alert('Quyền gửi thông báo đang bị TẮT trên trình duyệt của bạn. Vui lòng bấm vào biểu tượng Khóa 🔒 trên thanh địa chỉ trình duyệt -> Chọn "Cho phép Thông báo" (Allow Notifications).');
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem('chamcong_notification_prompt_dismissed', 'true');
    setIsVisible(false);
  };

  if (!isVisible || (permissionState === 'granted' && !isSuccessState)) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in pointer-events-auto">
      <div
        className="bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900/30 rounded-[28px] p-6 max-w-sm w-full shadow-2xl space-y-5 text-left animate-scale-up relative overflow-hidden"
        style={{
          boxShadow: '0 25px 50px -12px rgba(4, 120, 87, 0.25)'
        }}
      >
        {/* Top Decorative Gradient Accent */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-green-500" />

        {isSuccessState ? (
          /* Custom Premium Success View */
          <div className="space-y-4 text-center py-2 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-4xl mx-auto shadow-inner">
              <RiCheckboxCircleFill className="text-emerald-600 animate-scale-up" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                Đã Bật Thông Báo Thành Công!
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed px-2">
                Thiết bị của bạn đã sẵn sàng nhận thông báo nhắc ca làm việc và kết quả phê duyệt từ hệ thống.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleDismiss}
                style={{ backgroundColor: '#059669', color: '#ffffff', border: 'none' }}
                className="w-full py-3.5 px-4 rounded-2xl hover:bg-emerald-700 text-white text-xs font-extrabold shadow-lg shadow-emerald-600/30 transition-all active:scale-[0.98] cursor-pointer text-center"
              >
                HOÀN TẤT
              </button>
            </div>
          </div>
        ) : (
          /* Prompt Header & Content Body */
          <>
            {/* Header Icon & Title */}
            <div className="flex items-start justify-between pt-1">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl font-black shrink-0 shadow-sm">
                  <RiNotification3Line className="animate-bounce" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
                    {isIosSafari ? 'Thông Báo Trên iPhone' : 'Bật Thông Báo Nhắc Nhở'}
                  </h3>
                  <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 uppercase tracking-wider">
                    {isIosSafari ? 'Yêu cầu iOS 16.4+' : 'Ứng dụng Chấm công'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full transition-colors"
              >
                <RiCloseLine className="text-xl" />
              </button>
            </div>

            {/* Content Body */}
            {isIosSafari ? (
              /* iOS Safari PWA Guidance View */
              <div className="space-y-3.5 text-xs text-slate-700 dark:text-slate-300">
                <p className="font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
                  Theo quy định của Apple, để nhận thông báo chấm công trên iPhone, bạn cần <strong className="text-emerald-600 dark:text-emerald-400">Thêm ứng dụng vào Màn hình chính</strong>:
                </p>

                <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 space-y-2.5">
                  <div className="flex items-center gap-2.5 font-bold text-slate-900 dark:text-slate-100 text-[11px]">
                    <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] shrink-0">1</span>
                    <span className="flex items-center gap-1">
                      Bấm nút <strong>Chia sẻ</strong> <RiShareBoxLine className="text-base text-emerald-600 inline" /> ở thanh dưới Safari
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 font-bold text-slate-900 dark:text-slate-100 text-[11px]">
                    <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] shrink-0">2</span>
                    <span className="flex items-center gap-1">
                      Chọn <strong>"Thêm vào MH chính"</strong> <RiAddBoxLine className="text-base text-emerald-600 inline" />
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 font-bold text-slate-900 dark:text-slate-100 text-[11px]">
                    <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] shrink-0">3</span>
                    <span>Mở app từ màn hình chính để nhận thông báo ngay!</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDismiss}
                  style={{ backgroundColor: '#059669', color: '#ffffff', border: 'none' }}
                  className="w-full py-3.5 px-4 rounded-2xl hover:bg-emerald-700 text-white text-xs font-extrabold shadow-lg shadow-emerald-600/25 transition-all active:scale-[0.98] cursor-pointer text-center"
                >
                  Tôi đã hiểu
                </button>
              </div>
            ) : (
              /* Standard Notification Permission Prompt View */
              <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
                <p className="font-semibold leading-relaxed text-slate-800 dark:text-slate-200">
                  Nhận thông báo tức thì khi đến giờ <strong className="text-emerald-600 dark:text-emerald-400">Check-in, Check-out</strong>, nhắc nhở ca làm việc và kết quả duyệt chấm công từ Admin.
                </p>

                <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
                  <ul className="space-y-1.5 font-medium text-slate-700 dark:text-slate-300 text-[11px]">
                    <li className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold">
                      <RiCheckLine className="text-base text-emerald-600" /> Tự động nhắc ca làm việc đúng giờ
                    </li>
                    <li className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold">
                      <RiCheckLine className="text-base text-emerald-600" /> Thông báo kết quả phê duyệt đơn
                    </li>
                  </ul>
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isSubscribing}
                    onClick={handleEnableNotifications}
                    style={{ backgroundColor: '#059669', color: '#ffffff', border: 'none' }}
                    className="w-full py-3.5 px-4 rounded-2xl hover:bg-emerald-700 text-white text-xs font-extrabold shadow-lg shadow-emerald-600/30 transition-all active:scale-[0.98] cursor-pointer text-center flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <RiNotification3Line className="text-base text-white" />
                    <span className="text-white font-extrabold">{isSubscribing ? 'Đang xử lý...' : '🔔 BẬT THÔNG BÁO NGAY'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="w-full py-2.5 px-4 rounded-2xl bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold transition-colors cursor-pointer text-center"
                  >
                    Để sau
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default NotificationPromptModal;
