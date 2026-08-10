import { useEffect, useCallback } from 'react';
import { useOfflineStore } from '../store/offlineStore';
import { getPendingSyncCount, getAllPendingSyncFIFO, markSyncing, markFailed, removeSynced } from '../indexeddb/db';
import apiClient from '../api/apiClient';

export const useOffline = () => {
  const { isOffline, pendingCount, setIsOffline, setPendingCount } = useOfflineStore();

  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await getPendingSyncCount();
      setPendingCount(count);
      return count;
    } catch (err) {
      console.error('Error getting pending offline count:', err);
      return 0;
    }
  }, [setPendingCount]);

  const autoSyncQueueFIFO = useCallback(async () => {
    if (!navigator.onLine) return;
    // Brief delay to allow mobile cellular network socket to finish handshaking after toggling Airplane mode
    await new Promise(r => setTimeout(r, 1500));

    try {
      const items = await getAllPendingSyncFIFO();
      if (!items || items.length === 0) return;

      for (const item of items) {
        if (!navigator.onLine) break;
        await markSyncing(item.id);

        try {
          const formData = new FormData();
          if (item.queueId) formData.append('queueId', item.queueId);
          if (item.type) formData.append('type', item.type);
          if (item.assignmentId) formData.append('assignmentId', item.assignmentId);
          if (item.latitude) formData.append('latitude', item.latitude);
          if (item.longitude) formData.append('longitude', item.longitude);
          if (item.gpsAccuracy) formData.append('gpsAccuracy', item.gpsAccuracy);
          formData.append('capturedAtClient', item.capturedAtClient || new Date(item.createdAt || Date.now()).toISOString());
          formData.append('clientRequestId', item.clientRequestId || item.queueId);
          formData.append('isNoGps', item.isNoGps ? 'true' : 'false');
          formData.append('isOfflineSync', 'true');
          if (item.isPwaStandalone) formData.append('isPwaStandalone', item.isPwaStandalone);

          let photoBlob = item.photoBlob;
          if (!photoBlob && item.photoBase64) {
            const byteString = atob(item.photoBase64.split(',')[1]);
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
            photoBlob = new Blob([ab], { type: 'image/jpeg' });
          }

          // Validate Blob on iOS Safari (structured clone bug)
          if (photoBlob && !(photoBlob instanceof Blob)) {
            if (item.photoBase64) {
              const byteString = atob(item.photoBase64.split(',')[1]);
              const ab = new ArrayBuffer(byteString.length);
              const ia = new Uint8Array(ab);
              for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
              photoBlob = new Blob([ab], { type: 'image/jpeg' });
            } else {
              // Unrecoverable corrupted Blob
              await markFailed(item.id, 'Dữ liệu ảnh bị lỗi hỏng. Vui lòng xóa đơn này.');
              continue; // Skip to next item
            }
          }

          if (photoBlob) {
            formData.append('photo', photoBlob, `offline_attendance_${item.type || 'checkin'}_${Date.now()}.jpg`);
          }

          const endpoint = '/attendance/offline-sync';
          
          let res;
          try {
            res = await apiClient.post(endpoint, formData);
          } catch (firstErr) {
            // Retry once if cellular socket was still warming up
            await new Promise(r => setTimeout(r, 2000));
            res = await apiClient.post(endpoint, formData);
          }

          if (res && res.success) {
            await removeSynced(item.id);
          } else {
            await markFailed(item.id, res?.message || 'Sync rejected by server');
          }
        } catch (err) {
          await markFailed(item.id, err.message || 'Lỗi kết nối máy chủ khi đồng bộ.');
        }
      }
      await refreshPendingCount();
    } catch (err) {
      console.error('Auto sync error:', err);
    }
  }, [refreshPendingCount]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      refreshPendingCount();
      autoSyncQueueFIFO();
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check & auto-sync if online and items exist
    refreshPendingCount().then(count => {
      if (count > 0 && navigator.onLine) {
        autoSyncQueueFIFO();
      }
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setIsOffline, refreshPendingCount, autoSyncQueueFIFO]);

  return {
    isOffline,
    pendingCount,
    refreshPendingCount,
    autoSyncQueueFIFO
  };
};

export default useOffline;
