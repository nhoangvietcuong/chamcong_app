import { useCallback } from 'react';
import { useAssignmentStore } from '../store/assignmentStore';
import assignmentService from '../services/assignmentService';
import db from '../indexeddb/db';

export const useAssignment = () => {
  const {
    todayAssignment,
    upcomingAssignments,
    completedAssignments,
    assignmentHistory,
    totalHistory,
    currentAssignmentDetail,
    isLoading,
    error,
    setTodayAssignment,
    setUpcomingAssignments,
    setCompletedAssignments,
    setAssignmentHistory,
    setAssignmentDetail,
    setLoading,
    setError
  } = useAssignmentStore();

  const fetchTodayAssignment = useCallback(async () => {
    setLoading(true);
    try {
      const response = await assignmentService.getTodayAssignment();
      if (response && response.success && response.data) {
        setTodayAssignment(response.data);
        try {
          await db.assignment_cache.put({ ...response.data, id: 'today' });
        } catch (e) {
          console.warn('Failed to cache assignment to IndexedDB:', e);
        }
        return response.data;
      }
      setTodayAssignment(null);
      return null;
    } catch (err) {
      // Fallback to IndexedDB cached assignment when offline
      try {
        const cached = await db.assignment_cache.get('today');
        if (cached) {
          setTodayAssignment(cached);
          return cached;
        }
      } catch (cacheErr) {
        console.warn('Failed to load cached assignment from IndexedDB:', cacheErr);
      }
      setError(err.message || 'Lấy phân công hôm nay thất bại');
      setTodayAssignment(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [setTodayAssignment, setLoading, setError]);

  const fetchAssignmentHistory = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const response = await assignmentService.getAssignmentsHistory(params);
      if (response && response.success && response.data) {
        const { items, pagination } = response.data;
        setAssignmentHistory(items, pagination.total);
        return response.data;
      }
      return null;
    } catch (err) {
      setError(err.message || 'Lấy lịch sử phân công thất bại');
      return null;
    } finally {
      setLoading(false);
    }
  }, [setAssignmentHistory, setLoading, setError]);

  const fetchUpcomingAndCompleted = useCallback(async () => {
    setLoading(true);
    try {
      // Query history for assignments
      const response = await assignmentService.getAssignmentsHistory({ limit: 100 });
      if (response && response.success && response.data) {
        const items = response.data.items || [];
        const todayStr = new Date().toISOString().substring(0, 10);
        
        const upcoming = items.filter(item => item.workDate > todayStr && item.status !== 'CANCELLED');
        const completed = items.filter(item => item.status === 'COMPLETED');
        
        setUpcomingAssignments(upcoming);
        setCompletedAssignments(completed);
      }
    } catch (err) {
      console.error('Error fetching assignments lists:', err);
    } finally {
      setLoading(false);
    }
  }, [setUpcomingAssignments, setCompletedAssignments, setLoading]);

  const fetchAssignmentDetail = useCallback(async (id) => {
    setLoading(true);
    try {
      const response = await assignmentService.getAssignmentDetail(id);
      if (response && response.success) {
        setAssignmentDetail(response.data);
        return response.data;
      }
      return null;
    } catch (err) {
      setError(err.message || 'Lấy chi tiết phân công thất bại');
      return null;
    } finally {
      setLoading(false);
    }
  }, [setAssignmentDetail, setLoading, setError]);

  return {
    todayAssignment,
    upcomingAssignments,
    completedAssignments,
    assignmentHistory,
    totalHistory,
    currentAssignmentDetail,
    isLoading,
    error,
    fetchTodayAssignment,
    fetchAssignmentHistory,
    fetchUpcomingAndCompleted,
    fetchAssignmentDetail
  };
};

export default useAssignment;
