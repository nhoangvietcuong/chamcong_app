import Dexie from 'dexie';

export const db = new Dexie('ChamCongOfflineDB');

// Request persistent browser storage to protect IndexedDB from OS eviction
export const requestPersistentStorage = async () => {
  if (typeof window !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persisted();
      if (!isPersisted) {
        await navigator.storage.persist();
      }
    } catch (err) {
      console.warn('Persistent storage request ignored:', err);
    }
  }
};
requestPersistentStorage();

// Define database tables matching Offline PWA & No-GPS Technical Fallback Spec
db.version(3).stores({
  attendance_queue: '++id, queueId, assignmentId, syncStatus, status, capturedAtClient, createdAt',
  assignment_cache: 'assignmentId, workDate',
  attendance_cache: 'attendanceId, workDate',
  notification_cache: 'id, timestamp',
  profile_cache: 'employeeCode',
  settings_cache: 'key'
});

// Helper functions for attendance_queue
export const getPendingSyncCount = async () => {
  return db.attendance_queue.where('syncStatus').equals('pending').or('status').equals('pending').count();
};

export const getAllQueueItems = async () => {
  return db.attendance_queue.orderBy('id').reverse().toArray();
};

export const getAllPendingSyncFIFO = async () => {
  // Returns pending items sorted by capturedAtClient ascending (FIFO)
  const items = await db.attendance_queue
    .filter(item => item.syncStatus === 'pending' || item.status === 'pending')
    .toArray();
  return items.sort((a, b) => new Date(a.capturedAtClient || a.createdAt) - new Date(b.capturedAtClient || b.createdAt));
};

export const addToOfflineQueue = async (data) => {
  const queueId = data.queueId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const nowStr = new Date().toISOString();

  return db.attendance_queue.add({
    ...data,
    queueId,
    syncStatus: 'pending',
    status: 'pending',
    retryCount: data.retryCount || 0,
    lastRetry: null,
    failureReason: null,
    capturedAtClient: data.capturedAtClient || nowStr,
    syncedAtServer: null,
    createdAt: Date.now()
  });
};

export const getNextPendingSync = async () => {
  const pendingItems = await getAllPendingSyncFIFO();
  return pendingItems[0] || null;
};

export const markSyncing = async (id) => {
  return db.attendance_queue.update(id, { syncStatus: 'syncing', status: 'syncing' });
};

export const markFailed = async (id, errorMsg) => {
  const item = await db.attendance_queue.get(id);
  const nextRetryCount = (item?.retryCount || 0) + 1;
  const newStatus = nextRetryCount >= 5 ? 'failed' : 'pending'; // 5 retries max before marking as failed

  return db.attendance_queue.update(id, {
    syncStatus: newStatus,
    status: newStatus,
    retryCount: nextRetryCount,
    lastRetry: Date.now(),
    failureReason: errorMsg
  });
};

export const removeSynced = async (id) => {
  return db.attendance_queue.delete(id);
};

export default db;
