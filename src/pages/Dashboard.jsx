import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useAttendance } from '../hooks/useAttendance';
import { useOffline } from '../hooks/useOffline';
import { useNotification } from '../hooks/useNotification';
import apiClient from '../api/apiClient';
import dayjs from 'dayjs';
import {
  RiMapPinLine,
  RiCalendarCheckLine,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiAlertLine,
  RiRefreshLine,
  RiArrowRightLine,
  RiBarChart2Line,
  RiTimerLine
} from 'react-icons/ri';

const DEPARTMENT_MAP = {
  1: 'Phòng Kỹ Thuật',
  2: 'Phòng Kinh Doanh',
  3: 'Phòng Nhân Sự'
};

export const Dashboard = ({ onStartCheckIn, onStartCheckOut }) => {
  const { user } = useAuth();
  const { todayState, isLoading, fetchTodayState } = useAttendance();
  const { isOffline } = useOffline();
  const { fetchNotifications } = useNotification();
  const navigate = useNavigate();

  const [serverTime, setServerTime] = useState(new Date());
  const [timeOffset, setTimeOffset] = useState(0);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsRange, setAnalyticsRange] = useState('current'); // 'current' or 'previous'
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);

  // Sync server clock on mount (ONCE on mount)
  useEffect(() => {
    let offset = 0;
    const syncTime = async () => {
      try {
        const response = await apiClient.get('/health');
        if (response && response.success && response.data) {
          const serverDate = new Date(response.data.timestamp);
          const localDate = new Date();
          offset = serverDate.getTime() - localDate.getTime();
          setTimeOffset(offset);
          setServerTime(serverDate);
        }
      } catch (err) {
        console.warn('Failed to sync server time:', err);
      }
    };
    syncTime();

    const interval = setInterval(() => {
      setServerTime(new Date(Date.now() + offset));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Fetch today state and notifications on mount
  useEffect(() => {
    fetchTodayState();
    fetchNotifications();
  }, []);

  // Load dashboard analytics
  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsAnalyticsLoading(true);
      try {
        let start, end;
        if (analyticsRange === 'current') {
          start = dayjs().startOf('month').format('YYYY-MM-DD');
          end = dayjs().endOf('month').format('YYYY-MM-DD');
        } else {
          start = dayjs().subtract(1, 'month').startOf('month').format('YYYY-MM-DD');
          end = dayjs().subtract(1, 'month').endOf('month').format('YYYY-MM-DD');
        }
        const response = await apiClient.get('/v1/attendance/analytics', {
          params: { startDate: start, endDate: end }
        });
        if (response && response.success && response.data) {
          setAnalytics(response.data);
        }
      } catch (err) {
        console.error('Failed to fetch attendance analytics:', err);
      } finally {
        setIsAnalyticsLoading(false);
      }
    };
    fetchAnalytics();
  }, [analyticsRange]);

  // Format attendance status badge per Spec #6
  const getAttendanceStatusBadge = () => {
    if (isLoading && !todayState) {
      return (
        <span
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold animate-pulse"
          style={{ backgroundColor: '#FEF9C3', color: '#CA8A04', border: '1px solid #FDE047' }}
        >
          ⏳ Đang tải...
        </span>
      );
    }
    if (!todayState || !todayState.attendance) {
      return (
        <span
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
          style={{ backgroundColor: '#FEE2E2', color: '#DC2626', border: '1px solid #FCA5A5' }}
        >
          ● Chưa Check-in
        </span>
      );
    }

    const { attendanceStatus, reviewStatus } = todayState.attendance;

    if (reviewStatus === 'REJECTED' || attendanceStatus === 'INVALID') {
      return (
        <span
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
          style={{ backgroundColor: '#FEE2E2', color: '#DC2626', border: '1px solid #FCA5A5' }}
        >
          ✖ Từ chối
        </span>
      );
    }

    if (reviewStatus === 'PENDING' || attendanceStatus === 'REVIEW_REQUIRED') {
      return (
        <span
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
          style={{ backgroundColor: '#FEF9C3', color: '#CA8A04', border: '1px solid #FDE047' }}
        >
          ⏳ Chờ duyệt
        </span>
      );
    }

    if (attendanceStatus === 'LATE_AND_LEFT_EARLY') {
      return (
        <span
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
          style={{ backgroundColor: '#FEE2E2', color: '#B91C1C', border: '1px solid #FCA5A5' }}
        >
          ⚠ Đi muộn / Về sớm
        </span>
      );
    }

    if (attendanceStatus === 'LATE') {
      return (
        <span
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
          style={{ backgroundColor: '#FEE2E2', color: '#B91C1C', border: '1px solid #FCA5A5' }}
        >
          ⚠ Đi muộn
        </span>
      );
    }

    if (attendanceStatus === 'LEFT_EARLY') {
      return (
        <span
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
          style={{ backgroundColor: '#FEE2E2', color: '#B91C1C', border: '1px solid #FCA5A5' }}
        >
          ⚠ Về sớm
        </span>
      );
    }

    if (attendanceStatus === 'OVERTIME') {
      return (
        <span
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
          style={{ backgroundColor: '#EEF2FF', color: '#4338CA', border: '1px solid #C7D2FE' }}
        >
          ⭐ Tăng ca
        </span>
      );
    }

    if (attendanceStatus === 'IN_PROGRESS') {
      return (
        <span
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
          style={{ backgroundColor: '#DCFCE7', color: '#15803D', border: '1px solid #BBF7D0' }}
        >
          ✔ Đã Check-in
        </span>
      );
    }

    if (attendanceStatus === 'COMPLETED' || attendanceStatus === 'NORMAL') {
      return (
        <span
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
          style={{ backgroundColor: '#DCFCE7', color: '#15803D', border: '1px solid #BBF7D0' }}
        >
          ✔ {reviewStatus === 'APPROVED' ? 'Đã duyệt' : 'Đã Check-out'}
        </span>
      );
    }

    const STATUS_TEXT_MAP = {
      'LATE_AND_LEFT_EARLY': 'Đi muộn / Về sớm',
      'LATE': 'Đi muộn',
      'LEFT_EARLY': 'Về sớm',
      'REVIEW_REQUIRED': 'Cần kiểm duyệt',
      'INVALID': 'Không hợp lệ',
      'COMPLETED': 'Hoàn thành',
      'NORMAL': 'Bình thường',
      'IN_PROGRESS': 'Đang diễn ra',
      'OVERTIME': 'Tăng ca',
      'ABSENT': 'Vắng mặt',
      'PRESENT': 'Có mặt'
    };

    let displayStatus = STATUS_TEXT_MAP[attendanceStatus] || attendanceStatus;

    return (
      <span
        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
        style={{ backgroundColor: '#FEF9C3', color: '#CA8A04', border: '1px solid #FDE047' }}
      >
        {displayStatus}
      </span>
    );
  };

  const getGreeting = () => {
    const hour = serverTime.getHours();
    if (hour < 12) return 'Chào buổi sáng,';
    if (hour < 18) return 'Chào buổi chiều,';
    return 'Chào buổi tối,';
  };

  const todayAssignment = todayState?.assignment;

  const cardStyle = {
    backgroundColor: '#FFFFFF',
    border: '1px solid #E5E7EB',
    borderRadius: '20px',
    boxShadow: '0 8px 20px rgba(34, 197, 94, 0.08)',
  };

  return (
    <div className="space-y-4 pb-24 min-h-screen animate-fade-in" style={{ backgroundColor: '#F6F8FA' }}>
      {/* 1. Employee Greeting Card */}
      <div className="p-5 flex items-center justify-between transition-all duration-300 hover:translate-y-[-2px]" style={cardStyle}>
        <div className="space-y-1">
          <span className="text-xs font-medium block" style={{ color: '#6B7280' }}>{getGreeting()}</span>
          <h1 className="text-lg font-bold leading-tight" style={{ color: '#111827' }}>{user?.fullName || 'Nguyễn Văn An'}</h1>
          <div className="flex items-center gap-2 pt-0.5">
            <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold" style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}>
              {user?.employeeCode || 'NV001'}
            </span>
            <span className="text-xs" style={{ color: '#6B7280' }}>•</span>
            <span className="text-xs font-medium" style={{ color: '#6B7280' }}>
              {user?.departmentName || (user?.departmentId === 2 ? 'Ban Lập Trình' : (user?.departmentId === 1 ? 'Ban Kỹ Thuật' : 'Ban Lập Trình'))}
            </span>
          </div>
        </div>


      </div>

      {/* 2. System Time Clock Card (Spec #10) */}
      <div className="p-5 text-center space-y-1 relative transition-all duration-300 hover:translate-y-[-2px]" style={cardStyle}>
        <div className="flex items-center justify-between mb-1" style={{ color: '#6B7280' }}>
          <div className="w-5"></div>
          <span className="text-[11px] font-bold tracking-widest uppercase" style={{ color: '#6B7280' }}>GIỜ HỆ THỐNG</span>
          <button
            onClick={fetchTodayState}
            title="Đồng bộ lại"
            className="transition-colors p-1 cursor-pointer"
            style={{ color: '#22C55E' }}
          >
            <RiRefreshLine className={`text-base ${isLoading ? 'animate-spin' : ''}`} style={{ color: '#22C55E' }} />
          </button>
        </div>

        <div className="text-4xl font-extrabold tracking-tight font-mono py-1" style={{ color: '#22C55E' }}>
          {dayjs(serverTime).format('HH:mm:ss')}
        </div>

        <div className="text-xs font-semibold flex items-center justify-center gap-1.5" style={{ color: '#6B7280' }}>
          <span>{dayjs(serverTime).format('dddd')}</span>
          <span>•</span>
          <span>{dayjs(serverTime).format('DD/MM/YYYY')}</span>
        </div>
      </div>

      {/* 3. Today's Attendance Action Card */}
      <div className="p-5 space-y-4 transition-all duration-300 hover:translate-y-[-2px]" style={cardStyle}>
        <div className="flex items-center justify-between pb-3" style={{ borderBottom: '1px solid #E5E7EB' }}>
          <div className="flex items-center gap-2 text-xs font-bold" style={{ color: '#111827' }}>
            <RiCalendarCheckLine className="text-base" style={{ color: '#22C55E' }} />
            <span>Chấm Công Hôm Nay</span>
          </div>
          {getAttendanceStatusBadge()}
        </div>

        {/* Spec #11: Check-in Primary Button */}
        {todayState?.actions?.canCheckIn && (
          <button
            onClick={() => {
              if (onStartCheckIn) onStartCheckIn();
              else navigate('/attendance?flow=check-in');
            }}
            className="w-full py-3.5 font-extrabold flex items-center justify-center gap-2 text-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            style={{
              backgroundColor: '#22C55E',
              color: '#FFFFFF',
              borderRadius: '14px',
              boxShadow: '0 10px 25px rgba(34, 197, 94, 0.25)'
            }}
          >
            <RiArrowRightLine className="text-lg" style={{ color: '#FFFFFF' }} />
            <span>Bắt đầu Check-in</span>
          </button>
        )}

        {todayState?.actions?.canCheckOut && (
          <button
            onClick={() => {
              if (onStartCheckOut) onStartCheckOut();
              else navigate('/attendance?flow=check-out');
            }}
            className="w-full py-3.5 font-extrabold flex items-center justify-center gap-2 text-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            style={{
              backgroundColor: '#F59E0B',
              color: '#FFFFFF',
              borderRadius: '14px',
              boxShadow: '0 10px 25px rgba(245, 158, 11, 0.25)'
            }}
          >
            <RiArrowRightLine className="text-lg" style={{ color: '#FFFFFF' }} />
            <span>Bắt đầu Check-out</span>
          </button>
        )}

        {!todayState?.actions?.canCheckIn && !todayState?.actions?.canCheckOut && todayState?.attendance && (
          (() => {
            const reviewStatus = todayState.attendance.reviewStatus || todayState.attendance.review_status;
            const attendanceStatus = todayState.attendance.attendanceStatus || todayState.attendance.attendance_status;

            if (reviewStatus === 'REJECTED' || attendanceStatus === 'INVALID') {
              return (
                <div
                  className="p-3 rounded-[16px] flex items-center gap-2 text-xs font-bold justify-center text-center"
                  style={{ backgroundColor: '#FEE2E2', color: '#DC2626', border: '1px solid #FCA5A5' }}
                >
                  <RiCloseCircleLine className="text-lg shrink-0" style={{ color: '#DC2626' }} />
                  <span>Bạn đã bị Admin từ chối chấm công!</span>
                </div>
              );
            }

            if (reviewStatus === 'PENDING' || attendanceStatus === 'REVIEW_REQUIRED') {
              return (
                <div
                  className="p-3 rounded-[16px] flex items-center gap-2 text-xs font-bold justify-center text-center"
                  style={{ backgroundColor: '#FEF9C3', color: '#CA8A04', border: '1px solid #FDE047' }}
                >
                  <RiAlertLine className="text-lg shrink-0" style={{ color: '#CA8A04' }} />
                  <span>Lượt chấm công đang chờ Admin phê duyệt...</span>
                </div>
              );
            }

            return (
              <div
                className="p-3 rounded-[16px] flex items-center gap-2 text-xs font-bold justify-center text-center"
                style={{ backgroundColor: '#DCFCE7', color: '#15803D', border: '1px solid #BBF7D0' }}
              >
                <RiCheckboxCircleLine className="text-lg shrink-0" style={{ color: '#15803D' }} />
                <span>Hôm nay bạn đã hoàn thành chấm công!</span>
              </div>
            );
          })()
        )}

        {isLoading && !todayState ? (
          <div
            className="p-3 rounded-[16px] text-xs font-medium text-center animate-pulse"
            style={{ backgroundColor: '#F9FAFB', color: '#6B7280', border: '1px solid #E5E7EB' }}
          >
            ⏳ Đang tải dữ liệu ca làm việc...
          </div>
        ) : !todayAssignment ? (
          <div
            className="p-3 rounded-[16px] text-xs font-medium text-center"
            style={{ backgroundColor: '#F9FAFB', color: '#6B7280', border: '1px solid #E5E7EB' }}
          >
            ⚠️ Không có lịch phân công cho ngày hôm nay.
          </div>
        ) : null}

        <p className="text-[11px] text-center font-medium pt-1" style={{ color: '#6B7280' }}>
          Vui lòng đảm bảo bạn đang ở trong khu vực cho phép
        </p>
      </div>



      {/* 4.5. Monthly Analytics Dashboard Card */}
      {analytics && (
        <div
          className="p-5 space-y-4 transition-all duration-300 hover:translate-y-[-2px] bg-white border border-gray-200 rounded-[20px] shadow-[0_8px_30px_rgba(0,0,0,0.035)]"
        >
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-900">
              <RiBarChart2Line className="text-base text-emerald-500" />
              <span>Thống Kê Công Tích Lũy</span>
            </div>

            {/* Filter Toggle */}
            <div className="flex rounded-lg bg-gray-100 p-0.5 select-none">
              <button
                onClick={() => setAnalyticsRange('current')}
                className={`px-2.5 py-1 rounded-md text-[9px] font-extrabold transition-all cursor-pointer ${analyticsRange === 'current'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
                  }`}
              >
                Tháng này
              </button>
              <button
                onClick={() => setAnalyticsRange('previous')}
                className={`px-2.5 py-1 rounded-md text-[9px] font-extrabold transition-all cursor-pointer ${analyticsRange === 'previous'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
                  }`}
              >
                Tháng trước
              </button>
            </div>
          </div>

          {/* Metrics Layout Grid */}
          <div className="grid grid-cols-2 gap-4 items-center">
            {/* Left: SVG Attendance Rate Circle */}
            <div className="flex items-center gap-3">
              <div className="relative flex-shrink-0">
                <svg className="w-14 h-14" viewBox="0 0 36 36">
                  <path
                    className="text-gray-100"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-emerald-500 transition-all duration-500"
                    strokeWidth="3.5"
                    strokeDasharray={`${analytics.summary.attendanceRate}, 100`}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <text x="18" y="20.5" className="font-extrabold text-[7.5px]" textAnchor="middle" fill="#111827">
                    {analytics.summary.attendanceRate}%
                  </text>
                </svg>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Chuyên cần</span>
                <span className="text-xs font-extrabold text-emerald-600 block">Tỷ lệ đi làm</span>
              </div>
            </div>

            {/* Right: Worked Hours stats */}
            <div className="flex items-center gap-3 bg-[#F0FDF4] p-3 rounded-2xl border border-emerald-100/50 shadow-inner">
              <div className="w-9 h-9 rounded-xl bg-[#DCFCE7] flex items-center justify-center text-lg text-emerald-500">
                <RiTimerLine />
              </div>
              <div>
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block">Số giờ công</span>
                <span className="text-sm font-black text-gray-900 block font-mono">
                  {analytics.summary.totalWorkingHours}h
                </span>
              </div>
            </div>
          </div>

          {/* Summary stats lists */}
          <div className="grid grid-cols-3 gap-2.5 pt-1 text-center">
            <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 shadow-sm">
              <span className="text-[9px] font-bold text-gray-400 block uppercase mb-0.5">Phân công</span>
              <span className="text-xs font-black text-gray-800 font-mono">{analytics.summary.totalAssigned} ca</span>
            </div>
            <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 shadow-sm">
              <span className="text-[9px] font-bold text-gray-400 block uppercase mb-0.5">Đúng giờ</span>
              <span className="text-xs font-black text-emerald-600 font-mono">{analytics.summary.totalOnTime} ca</span>
            </div>
            <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 shadow-sm">
              <span className="text-[9px] font-bold text-gray-400 block uppercase mb-0.5">Trễ / Sớm</span>
              <span className="text-xs font-black text-amber-600 font-mono">
                {analytics.summary.totalLateEarly !== undefined ? analytics.summary.totalLateEarly : (analytics.summary.totalLate + analytics.summary.totalEarlyLeave)} ca
              </span>
            </div>
            <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 shadow-sm">
              <span className="text-[9px] font-bold text-gray-400 block uppercase mb-0.5">Vắng mặt</span>
              <span className="text-xs font-black text-red-500 font-mono">{analytics.summary.absent} ca</span>
            </div>
            <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 shadow-sm">
              <span className="text-[9px] font-bold text-gray-400 block uppercase mb-0.5">Nghỉ phép</span>
              <span className="text-xs font-black text-blue-500 font-mono">{analytics.summary.leave} ngày</span>
            </div>
            <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 shadow-sm">
              <span className="text-[9px] font-bold text-gray-400 block uppercase mb-0.5">Sắp tới</span>
              <span className="text-xs font-black text-slate-500 font-mono">{analytics.summary.pendingShift} ca</span>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default Dashboard;
