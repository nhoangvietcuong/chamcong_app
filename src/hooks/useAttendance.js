import { useCallback } from 'react';
import dayjs from 'dayjs';
import { useAttendanceStore } from '../store/attendanceStore';
import attendanceService from '../services/attendanceService';

export const useAttendance = () => {
  const {
    todayState,
    attendanceHistory,
    totalHistory,
    currentAttendanceDetail,
    isLoading,
    error,
    setTodayState,
    setAttendanceHistory,
    setAttendanceDetail,
    setLoading,
    setError
  } = useAttendanceStore();

  const fetchTodayState = useCallback(async () => {
    setLoading(true);
    const todayStr = dayjs().format('YYYY-MM-DD');
    try {
      const response = await attendanceService.getTodayState();
      if (response && response.success && response.data) {
        setTodayState(response.data);
        try {
          localStorage.setItem('chamcong_today_state', JSON.stringify({
            date: todayStr,
            data: response.data
          }));
        } catch (e) {
          console.warn('Failed to cache todayState to localStorage:', e);
        }
        return response.data;
      }
    } catch (err) {
      console.warn('Network error fetching today state, checking cache:', err);
    } finally {
      setLoading(false);
    }

    // Offline fallback: load cached todayState for today
    try {
      const cached = localStorage.getItem('chamcong_today_state');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.date === todayStr && parsed.data) {
          setTodayState(parsed.data);
          return parsed.data;
        }
      }
    } catch (e) {
      console.warn('Failed to read todayState cache:', e);
    }

    setTodayState(null);
    return null;
  }, [setTodayState, setLoading]);

  const fetchAttendanceHistory = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const response = await attendanceService.getHistory(params);
      if (response && response.success && response.data) {
        const { items, pagination } = response.data;
        setAttendanceHistory(items, pagination.total);
        return response.data;
      }
      return null;
    } catch (err) {
      setError(err.message || 'Lấy lịch sử chấm công thất bại');
      return null;
    } finally {
      setLoading(false);
    }
  }, [setAttendanceHistory, setLoading, setError]);

  const selectAttendanceDetail = useCallback((attendanceId) => {
    // Find in existing history
    const detail = attendanceHistory.find(item => item.attendanceId === parseInt(attendanceId, 10));
    if (detail) {
      setAttendanceDetail(detail);
      return detail;
    }
    // If not found in history, and matches today's state
    if (todayState && todayState.attendance && todayState.attendance.attendanceId === parseInt(attendanceId, 10)) {
      // Re-map today's state into full detail model
      const todayDetail = {
        attendanceId: todayState.attendance.attendanceId,
        workDate: todayState.assignment?.workDate,
        checkInTime: todayState.attendance.checkInTime,
        checkOutTime: todayState.attendance.checkOutTime,
        attendanceStatus: todayState.attendance.attendanceStatus,
        reviewStatus: todayState.attendance.reviewStatus || 'PENDING', // Default if missing
        locationName: todayState.assignment?.location?.locationName,
        locationAddress: todayState.assignment?.location?.address
      };
      setAttendanceDetail(todayDetail);
      return todayDetail;
    }
    return null;
  }, [attendanceHistory, todayState, setAttendanceDetail]);

  const checkIn = useCallback(async (formData, options = {}) => {
    setLoading(true);
    try {
      const response = await attendanceService.checkIn(formData, options);
      return { success: true, data: response.data };
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
        return { success: false, isCanceled: true, message: 'Yêu cầu đã bị hủy' };
      }
      return { success: false, message: err.message || 'Check-in thất bại' };
    } finally {
      setLoading(false);
    }
  }, [setLoading]);

  const checkOut = useCallback(async (formData, options = {}) => {
    setLoading(true);
    try {
      const response = await attendanceService.checkOut(formData, options);
      return { success: true, data: response.data };
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
        return { success: false, isCanceled: true, message: 'Yêu cầu đã bị hủy' };
      }
      return { success: false, message: err.message || 'Check-out thất bại' };
    } finally {
      setLoading(false);
    }
  }, [setLoading]);

  const checkInOt = useCallback(async (formData, options = {}) => {
    setLoading(true);
    try {
      const response = await attendanceService.checkInOt(formData, options);
      return { success: true, data: response.data };
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
        return { success: false, isCanceled: true, message: 'Yêu cầu đã bị hủy' };
      }
      return { success: false, message: err.message || 'Check-in tăng ca thất bại' };
    } finally {
      setLoading(false);
    }
  }, [setLoading]);

  const checkOutOt = useCallback(async (formData, options = {}) => {
    setLoading(true);
    try {
      const response = await attendanceService.checkOutOt(formData, options);
      return { success: true, data: response.data };
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
        return { success: false, isCanceled: true, message: 'Yêu cầu đã bị hủy' };
      }
      return { success: false, message: err.message || 'Check-out tăng ca thất bại' };
    } finally {
      setLoading(false);
    }
  }, [setLoading]);

  return {
    todayState,
    attendanceHistory,
    totalHistory,
    currentAttendanceDetail,
    isLoading,
    error,
    fetchTodayState,
    fetchAttendanceHistory,
    selectAttendanceDetail,
    checkIn,
    checkOut,
    checkInOt,
    checkOutOt,
    setTodayState
  };
};

export default useAttendance;
