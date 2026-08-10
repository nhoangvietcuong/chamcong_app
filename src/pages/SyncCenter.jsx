import React, { useEffect, useState, useCallback } from 'react';
import { useOffline } from '../hooks/useOffline';
import { useAttendance } from '../hooks/useAttendance';
import { useNotification } from '../hooks/useNotification';
import { useSyncStore } from '../store/syncStore';
import {
  getAllQueueItems,
  removeSynced,
  markSyncing,
  markFailed,
  db
} from '../indexeddb/db';
import apiClient from '../api/apiClient';
import dayjs from 'dayjs';
import {
  RiRefreshLine,
  RiDeleteBinLine,
  RiLoader2Line,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiTimeLine,
  RiCompassLine,
  RiInformationLine,
  RiMapPinLine
} from 'react-icons/ri';

export const SyncCenter = () => {
  const { isOffline, refreshPendingCount } = useOffline();
  const { fetchTodayState, fetchAttendanceHistory } = useAttendance();
  const { fetchNotifications } = useNotification();
  const { isSyncing, setSyncing, setSyncProgress, setSyncError, setLastSyncTime } = useSyncStore();

  const [queueItems, setQueueItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);

  // Load items from Dexie
  const loadQueue = useCallback(async () => {
    try {
      const items = await getAllQueueItems();
      setQueueItems(items);
    } catch (err) {
      console.error('Failed to load offline queue:', err);
    }
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // Base64 to Blob helper
  const base64ToBlob = (base64, mime = 'image/jpeg') => {
    const byteString = atob(base64.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mime });
  };

  // Sync a single queue item with auto-retry
  const syncItem = async (item) => {
    await markSyncing(item.id);
    await loadQueue();

    const endpoint = '/attendance/offline-sync';
    let attempts = 0;
    let lastError = null;

    while (attempts < 3) {
      attempts++;
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
          photoBlob = base64ToBlob(item.photoBase64);
        }

        // Validate Blob on iOS Safari (structured clone bug)
        if (photoBlob && !(photoBlob instanceof Blob)) {
          if (item.photoBase64) {
            photoBlob = base64ToBlob(item.photoBase64);
          } else {
            // Unrecoverable corrupted Blob
            return { success: false, error: 'Dữ liệu ảnh bị lỗi hỏng trên trình duyệt. Vui lòng xóa đơn này và thử chấm công lại.' };
          }
        }

        if (photoBlob) {
          formData.append('photo', photoBlob, `offline_attendance_${item.type || 'checkin'}_${Date.now()}.jpg`);
        }

        const res = await apiClient.post(endpoint, formData);

        if (res && res.success) {
          await removeSynced(item.id);
          return { success: true };
        } else {
          const errorMsg = res?.message || 'Yêu cầu bị từ chối bởi máy chủ.';
          await markFailed(item.id, errorMsg);
          return { success: false, error: errorMsg };
        }
      } catch (err) {
        lastError = err.response?.data?.message || err.message || 'Lỗi kết nối máy chủ.';
        if (attempts < 3) {
          await new Promise((r) => setTimeout(r, 1200));
        }
      }
    }

    await markFailed(item.id, lastError);
    return { success: false, error: lastError };
  };

  // Sync all queue items
  const handleSyncAll = async () => {
    if (isOffline) {
      alert('Thiết bị đang ngoại tuyến. Vui lòng kết nối Internet để đồng bộ.');
      return;
    }
    if (queueItems.length === 0) return;

    setSyncing(true);
    setSyncProgress(0);

    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < queueItems.length; i++) {
      const item = queueItems[i];
      // Only sync pending or failed items
      if (item.status === 'syncing') continue;

      const res = await syncItem(item);
      if (res.success) {
        succeeded++;
      } else {
        failed++;
      }
      setSyncProgress(Math.round(((i + 1) / queueItems.length) * 100));
    }

    // Refresh data
    await loadQueue();
    await refreshPendingCount();
    setLastSyncTime(new Date());

    if (succeeded > 0) {
      fetchTodayState();
      fetchAttendanceHistory({ page: 1, limit: 10 });
      fetchNotifications();
    }

    if (failed > 0) {
      setSyncError(`Đồng bộ hoàn tất: ${succeeded} thành công, ${failed} thất bại.`);
    } else {
      alert(`Đồng bộ ngoại tuyến hoàn tất! (${succeeded} thành công)`);
    }
  };

  // Delete a queue item
  const handleDeleteItem = async (id, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (!window.confirm('Bạn có chắc chắn muốn xóa giao dịch chấm công ngoại tuyến này?')) return;

    try {
      await db.attendance_queue.delete(id);
      await loadQueue();
      await refreshPendingCount();
      if (selectedItem?.id === id) {
        setSelectedItem(null);
      }
    } catch (err) {
      console.error('Failed to delete queue item:', err);
    }
  };

  // Manual single item retry trigger
  const handleRetryItem = async (item, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (isOffline) {
      alert('Thiết bị đang ngoại tuyến. Vui lòng kết nối Internet để đồng bộ.');
      return;
    }

    setSyncing(true);
    const res = await syncItem(item);
    setSyncing(false);

    await loadQueue();
    await refreshPendingCount();

    if (res.success) {
      alert('Đồng bộ thành công!');
      fetchTodayState();
      fetchAttendanceHistory({ page: 1, limit: 10 });
      fetchNotifications();
    } else {
      alert('Đồng bộ thất bại: ' + res.error);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FEF9C3] text-[#CA8A04] border border-[#FDE047]">Chờ đồng bộ</span>;
      case 'syncing':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1"><RiLoader2Line className="animate-spin" /> Đang đồng bộ</span>;
      case 'failed':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">Lỗi</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400">{status}</span>;
    }
  };

  return (
    <div className="p-4 space-y-5 animate-fade-in pb-28 text-[#111827]">
      {/* Title Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-xl font-bold text-[#111827]">Trung Tâm Đồng Bộ</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Quản lý và kiểm tra hàng đợi chấm công ngoại tuyến</p>
        </div>
        {queueItems.length > 0 && (
          <button
            onClick={handleSyncAll}
            disabled={isOffline || isSyncing}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold rounded-2xl text-xs flex items-center gap-1.5 transition-all shadow-md disabled:opacity-40"
          >
            <RiRefreshLine className={isSyncing ? "animate-spin" : ""} /> Đồng bộ tất cả
          </button>
        )}
      </div>

      {/* Connection warning */}
      {isOffline && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-2xl text-xs font-semibold flex items-center gap-2.5 shadow-sm">
          <RiInformationLine className="text-lg text-amber-600 shrink-0" />
          <span>Thiết bị đang ngoại tuyến. Dữ liệu sẽ tự động gửi về Admin ngay khi có kết nối Internet trở lại.</span>
        </div>
      )}

      {/* Queue list */}
      {queueItems.length > 0 ? (
        <div className="space-y-4">
          {queueItems.map((item) => {
            const photoSrc = item.photoBlob ? URL.createObjectURL(item.photoBlob) : item.photoBase64;
            const isNoGpsItem = item.isNoGps || !item.latitude;

            return (
              <div
                key={item.id}
                className="bg-white border border-slate-100 p-5 rounded-[22px] shadow-[0_8px_20px_rgba(0,0,0,0.03)] transition-all hover:shadow-[0_12px_24px_rgba(0,0,0,0.06)] flex flex-col gap-3.5"
              >
                {/* Clickable Card Body (Opens Detail Modal) */}
                <div
                  onClick={() => setSelectedItem(item)}
                  className="cursor-pointer flex flex-col gap-3.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${
                        item.type === 'check-in' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      }`}>
                        {item.type || 'CHECK-IN'}
                      </span>
                      {isNoGpsItem && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                          No-GPS
                        </span>
                      )}
                      {getStatusBadge(item.status)}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono font-bold">
                      ID: {item.id}
                    </span>
                  </div>

                  <div className="flex gap-3.5 items-center">
                    {/* Photo Thumbnail */}
                    {photoSrc ? (
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 shadow-sm">
                        <img src={photoSrc} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-400">
                        <RiInformationLine />
                      </div>
                    )}

                    <div className="space-y-1 flex-1 min-w-0">
                      <h4 className="text-slate-800 font-extrabold text-xs truncate">
                        Ca làm việc: {item.assignmentId ? `#${item.assignmentId}` : 'Hôm nay (Tự động)'}
                      </h4>
                      <p className="text-slate-500 text-[11px] font-semibold flex items-center gap-1">
                        <RiTimeLine className="text-slate-400" />
                        {dayjs(item.capturedAtClient || item.createdAt).format('HH:mm:ss DD/MM/YYYY')}
                      </p>
                      <p className="text-slate-400 text-[10px] font-mono truncate">
                        UUID: {item.queueId || item.clientRequestId}
                      </p>
                    </div>
                  </div>

                  {item.failureReason && (
                    <div className="bg-red-50 border border-red-200 p-3 rounded-xl text-xs text-red-700 font-semibold leading-relaxed flex items-start gap-2">
                      <RiCloseCircleLine className="text-base text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-extrabold block">Không thể đồng bộ:</span>
                        <span className="text-[11px] text-red-600 font-medium">{item.failureReason}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action buttons inside queue items */}
                <div className="flex justify-end gap-2.5 border-t border-slate-100 pt-3">
                  <button
                    onClick={(e) => handleRetryItem(item, e)}
                    disabled={isOffline || isSyncing}
                    className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-extrabold rounded-xl text-[11px] flex items-center gap-1 transition-all disabled:opacity-40 border border-emerald-200"
                  >
                    <RiRefreshLine /> Gửi lại
                  </button>
                  <button
                    onClick={(e) => handleDeleteItem(item.id, e)}
                    className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-extrabold rounded-xl text-[11px] flex items-center gap-1 transition-all border border-red-200"
                  >
                    <RiDeleteBinLine /> Xóa
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white border border-slate-100 p-12 rounded-[24px] text-center shadow-sm">
          <div className="mx-auto w-16 h-16 text-slate-700 mb-4 flex items-center justify-center bg-slate-950/40 rounded-full">
            <RiRefreshLine className="text-3xl" />
          </div>
          <h3 className="text-slate-500 text-sm font-semibold">Hàng đợi trống</h3>
          <p className="text-slate-600 text-xs mt-1 max-w-xs mx-auto leading-relaxed">
            Không có dữ liệu chấm công ngoại tuyến nào đang chờ đồng bộ. Tất cả giao dịch đã được tải lên máy chủ thành công.
          </p>
        </div>
      )}

      {/* Queue Detail Dialog Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 relative max-h-[80vh] overflow-y-auto space-y-6 shadow-2xl mb-8">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`badge ${selectedItem.type === 'check-in' ? 'badge-green' : 'badge-purple'}`}>
                  {selectedItem.type}
                </span>
                {getStatusBadge(selectedItem.status)}
              </div>
              <h2 className="text-xl font-black text-slate-100">Chi tiết Hàng đợi Ngoại tuyến</h2>
              <span className="text-slate-500 text-xs font-bold uppercase tracking-wider block mt-1">
                Thông tin kỹ thuật chi tiết
              </span>
            </div>

            {/* Photo preview */}
            {selectedItem.photoBase64 && (
              <div className="space-y-1">
                <span className="text-slate-500 text-[10px] font-bold uppercase block">Ảnh đã chụp (ngoại tuyến)</span>
                <div className="h-44 rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden">
                  <img src={selectedItem.photoBase64} alt="Captured" className="h-full w-full object-cover" />
                </div>
              </div>
            )}

            {/* Details Grid */}
            <div className="bg-slate-950/40 border border-slate-800/60 p-4 rounded-2xl space-y-3">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                <RiCompassLine className="text-slate-500" /> Tọa độ & Độ chính xác GPS
              </span>
              <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs font-semibold">
                <div>
                  <span className="text-slate-500 block mb-0.5">Tọa độ GPS</span>
                  <span className="text-slate-300 font-mono">
                    {selectedItem.latitude?.toFixed(6)}, {selectedItem.longitude?.toFixed(6)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Độ chính xác GPS</span>
                  <span className="text-slate-300">{selectedItem.gpsAccuracy || 0} mét</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Lượt thử lại</span>
                  <span className="text-slate-300">{selectedItem.retryCount} / 3</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Thiết bị PWA</span>
                  <span className="text-slate-300">{selectedItem.isPwaStandalone === 1 ? 'Đúng' : 'Không'}</span>
                </div>
              </div>
            </div>

            {/* Biometric verification details */}
            <div className="bg-slate-950/40 border border-slate-800/60 p-4 rounded-2xl space-y-2 text-xs font-semibold">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                <RiInformationLine className="text-slate-500" /> Dữ liệu đặc trưng khuôn mặt
              </span>
              <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                <div>
                  <span className="text-slate-500 block mb-0.5">Model version</span>
                  <span className="text-slate-300">{selectedItem.modelVersion}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Embedding version</span>
                  <span className="text-slate-300">{selectedItem.embeddingVersion}</span>
                </div>
              </div>
              <div className="pt-2">
                <span className="text-slate-500 block mb-0.5">Face embedding (in memory)</span>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-950 p-2 rounded-xl block truncate">
                  {selectedItem.embedding}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={(e) => handleRetryItem(selectedItem, e)}
                disabled={isOffline || isSyncing}
                className="flex-1 py-3.5 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-2xl text-xs disabled:opacity-40"
              >
                Gửi lại ngay
              </button>
              <button
                onClick={() => setSelectedItem(null)}
                className="flex-1 py-3.5 bg-slate-850 hover:bg-slate-800 text-slate-350 font-bold rounded-2xl text-xs"
              >
                Đóng chi tiết
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SyncCenter;
