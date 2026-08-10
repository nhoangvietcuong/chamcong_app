import React, { useState, useEffect, useCallback } from 'react';
import { 
  RiFileTextLine, RiCalendar2Line, RiTimeLine, RiAddLine, 
  RiCloseLine, RiRefreshLine, RiDeleteBin6Line, RiTimerLine
} from 'react-icons/ri';
import useAuth from '../hooks/useAuth';
import otService from '../services/otService';
import dayjs from 'dayjs';
import CustomModal from '../components/CustomModal';

const STATUS_MAP = {
  PENDING: { label: 'Chờ duyệt', style: { backgroundColor: '#FEF9C3', color: '#CA8A04', border: '1px solid #FDE047' } },
  APPROVED: { label: 'Đã duyệt', style: { backgroundColor: '#DCFCE7', color: '#15803D', border: '1px solid #BBF7D0' } },
  REJECTED: { label: 'Từ chối', style: { backgroundColor: '#FEE2E2', color: '#DC2626', border: '1px solid #FCA5A5' } },
  CANCELLED: { label: 'Đã hủy', style: { backgroundColor: '#F3F4F6', color: '#6B7280', border: '1px solid #E5E7EB' } }
};

export const OvertimeRequests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals / Form
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Custom Modal state
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
    confirmText: 'Đồng ý',
    cancelText: 'Hủy',
    onConfirm: null,
    isSubmitting: false
  });

  const closeModal = () => {
    setModalConfig(prev => ({ ...prev, isOpen: false }));
  };
  
  // Focus states for input styling
  const [dateFocused, setDateFocused] = useState(false);
  const [reasonFocused, setReasonFocused] = useState(false);

  const [swipedId, setSwipedId] = useState(null);
  const [startX, setStartX] = useState(0);
  const [hiddenIds, setHiddenIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('hiddenOtRequests') || '[]');
    } catch (e) {
      return [];
    }
  });

  const hideRequest = (id) => {
    const updated = [...hiddenIds, id];
    setHiddenIds(updated);
    localStorage.setItem('hiddenOtRequests', JSON.stringify(updated));
  };

  const handleClearAllHistory = () => {
    setModalConfig({
      isOpen: true,
      type: 'confirm',
      title: 'Xóa tất cả lịch sử',
      message: 'Bạn có chắc chắn muốn xóa tất cả lịch sử tăng ca khỏi giao diện? (Đơn chờ duyệt sẽ bị hủy)',
      confirmText: 'Xóa toàn bộ',
      cancelText: 'Bỏ qua',
      onConfirm: async () => {
        setModalConfig(prev => ({ ...prev, isSubmitting: true }));
        try {
          const pendingRequests = requests.filter(r => r.status === 'PENDING');
          for (const r of pendingRequests) {
            try {
              await otService.cancelRequest(r.otRequestId);
            } catch (err) {
              console.error('Failed to cancel request:', r.otRequestId, err);
            }
          }
          const allIds = requests.map(r => r.otRequestId);
          setHiddenIds(allIds);
          localStorage.setItem('hiddenOtRequests', JSON.stringify(allIds));
          fetchRequests();
        } finally {
          setModalConfig(prev => ({ ...prev, isOpen: false, isSubmitting: false }));
        }
      }
    });
  };

  const [form, setForm] = useState({
    workDate: '',
    reason: ''
  });

  const fetchRequests = useCallback(async (showSkeleton = true) => {
    if (showSkeleton) setLoading(true);
    try {
      const res = await otService.getMyRequests({ limit: 50 });
      if (res && res.success && res.data) {
        setRequests(res.data || []);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách đơn tăng ca:', err);
    } finally {
      if (showSkeleton) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests(true);

    // Background poll every 15 seconds to keep UI synced without page reloads
    const interval = setInterval(() => {
      fetchRequests(false);
    }, 15000);

    return () => clearInterval(interval);
  }, [fetchRequests]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!form.workDate) {
      return setErrorMessage('Vui lòng chọn ngày làm việc');
    }
    
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const data = {
        employeeId: user.employeeId,
        workDate: form.workDate,
        reason: form.reason
      };

      const res = await otService.createRequest(data);
      if (res && res.success) {
        setIsFormOpen(false);
        setForm({ workDate: '', reason: '' });
        fetchRequests();
        setModalConfig({
          isOpen: true,
          type: 'success',
          title: 'Đăng ký thành công!',
          message: 'Đơn đăng ký tăng ca của bạn đã được gửi thành công và đang chờ Admin phê duyệt.'
        });
      }
    } catch (err) {
      setErrorMessage(err.message || 'Lỗi gửi đơn đăng ký tăng ca');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = (id) => {
    setModalConfig({
      isOpen: true,
      type: 'confirm',
      title: 'Xác nhận hủy đơn',
      message: 'Bạn có chắc chắn muốn hủy đơn đăng ký tăng ca này không?',
      confirmText: 'Hủy đơn',
      cancelText: 'Bỏ qua',
      onConfirm: async () => {
        setModalConfig(prev => ({ ...prev, isSubmitting: true }));
        try {
          const res = await otService.cancelRequest(id);
          if (res && res.success) {
            fetchRequests();
            setModalConfig({
              isOpen: true,
              type: 'success',
              title: 'Đã hủy đơn',
              message: 'Hủy đơn đăng ký tăng ca thành công.'
            });
          }
        } catch (err) {
          setModalConfig({
            isOpen: true,
            type: 'error',
            title: 'Không thể hủy đơn',
            message: err.message || 'Không thể hủy đơn đăng ký tăng ca'
          });
        }
      }
    });
  };

  const getStatusBadge = (status) => {
    const item = STATUS_MAP[status] || { label: status, style: { backgroundColor: '#F3F4F6', color: '#4B5563' } };
    return (
      <span 
        className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border"
        style={item.style}
      >
        {item.label}
      </span>
    );
  };

  const cardStyle = {
    backgroundColor: '#FFFFFF',
    border: '1px solid #E5E7EB',
    borderRadius: '20px',
    boxShadow: '0 8px 20px rgba(79, 70, 229, 0.08)',
  };

  return (
    <div className="space-y-4 pb-24 text-left min-h-screen animate-fade-in" style={{ backgroundColor: '#F6F8FA' }}>
      <style>{`
        input[type="date"]::-webkit-datetime-edit,
        input[type="date"]::-webkit-datetime-edit-fields-wrapper,
        input[type="time"]::-webkit-datetime-edit,
        input[type="time"]::-webkit-datetime-edit-fields-wrapper {
          color: #111827 !important;
        }
      `}</style>
      
      {/* Title */}
      <div className="flex items-center justify-between py-1">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Đăng Ký Tăng Ca</h1>
          <p className="text-xs text-gray-500 font-medium mt-0.5">Yêu cầu làm thêm giờ và theo dõi phê duyệt</p>
        </div>
        <button
          onClick={() => {
            setErrorMessage(null);
            setSuccessMessage(null);
            setIsFormOpen(true);
          }}
          className="w-10 h-10 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer"
          style={{ backgroundColor: '#4F46E5', color: '#FFFFFF', boxShadow: '0 10px 25px rgba(79, 70, 229, 0.25)' }}
        >
          <RiAddLine className="text-2xl" />
        </button>
      </div>

      {/* List of Requests */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-800">Lịch sử tăng ca</h3>
          <div className="flex items-center gap-2">
            {requests.filter(req => !hiddenIds.includes(req.otRequestId)).length > 0 && (
              <button
                onClick={handleClearAllHistory}
                className="p-1.5 rounded-xl text-red-500 hover:text-red-700 bg-white hover:bg-red-50 border border-gray-200 transition-colors shadow-xs cursor-pointer flex items-center gap-1 text-[10px] font-bold px-2.5"
              >
                <RiDeleteBin6Line className="text-xs" />
                Xóa tất cả
              </button>
            )}
            <button 
              onClick={() => { fetchRequests(); }}
              className="p-1.5 rounded-full text-gray-500 hover:text-gray-900 bg-white hover:bg-gray-50 border border-gray-200 transition-colors shadow-sm cursor-pointer"
            >
              <RiRefreshLine className="text-sm" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-24 bg-white border border-gray-200 rounded-2xl animate-pulse"></div>
            ))}
          </div>
        ) : requests.filter(req => !hiddenIds.includes(req.otRequestId)).length > 0 ? (
          <div className="flex flex-col animate-fade-in" style={{ gap: '18px' }}>
            {requests.filter(req => !hiddenIds.includes(req.otRequestId)).map((req) => {
              const isCancelable = req.status === 'PENDING';

              return (
                <div 
                  key={req.otRequestId}
                  className="relative w-full overflow-hidden rounded-2xl"
                  onTouchStart={(e) => {
                    setStartX(e.touches[0].clientX);
                  }}
                  onTouchMove={(e) => {
                    const currentX = e.touches[0].clientX;
                    const diffX = startX - currentX;
                    if (diffX > 50) {
                      setSwipedId(req.otRequestId);
                    } else if (diffX < -30) {
                      if (swipedId === req.otRequestId) {
                        setSwipedId(null);
                      }
                    }
                  }}
                >
                  {/* Under-layer Swipe Action Button */}
                  <div 
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (isCancelable) {
                        await handleCancelRequest(req.otRequestId);
                      } else {
                        if (window.confirm('Bạn có chắc chắn muốn ẩn đơn tăng ca này khỏi giao diện?')) {
                          hideRequest(req.otRequestId);
                        }
                      }
                      setSwipedId(null);
                    }}
                    className="absolute right-0 top-0 bottom-0 w-[76px] text-white flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors shadow-sm"
                    style={{ 
                      zIndex: 1, 
                      backgroundColor: isCancelable ? '#EF4444' : '#6B7280',
                      display: swipedId === req.otRequestId ? 'flex' : 'none'
                    }}
                  >
                    <RiDeleteBin6Line className="text-lg" />
                    <span className="text-[9px] font-extrabold">{isCancelable ? 'Hủy đơn' : 'Xóa ẩn'}</span>
                  </div>

                  {/* Foreground Request Card */}
                  <div 
                    className="relative z-10 p-4 flex flex-col gap-3 text-gray-800 shadow-sm border border-gray-150 rounded-[16px] bg-white transition-transform duration-200 text-left"
                    style={{
                      transform: swipedId === req.otRequestId ? 'translateX(-76px)' : 'translateX(0px)',
                      transition: 'transform 0.2s ease-out'
                    }}
                  >
                    {/* Header: Date and Status */}
                    <div className="flex items-center justify-between">
                      <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-[#EEF2FF] text-[#4F46E5] border-[#C7D2FE]">
                        Tăng ca
                      </span>
                      {getStatusBadge(req.status)}
                    </div>

                    {/* Date and Time row */}
                    <div className="flex items-center gap-8 text-left">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Ngày làm việc</span>
                        <span className="text-xs font-semibold text-gray-800 mt-0.5">
                          {dayjs(req.workDate).format('DD/MM/YYYY')}
                        </span>
                      </div>
                      <span className="text-gray-300 text-xs font-light mt-2">|</span>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Khung giờ</span>
                        <span className="text-xs font-semibold text-gray-800 mt-0.5">
                          Sau ca làm việc {req.startTime && req.endTime ? `(${req.startTime.substring(0, 5)} - ${req.endTime.substring(0, 5)})` : ''}
                        </span>
                      </div>
                    </div>

                    {/* Duration Banner */}
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F5F7FF] text-[#4F46E5] text-[10px] font-semibold border border-[#EBEFFF]">
                      <RiTimerLine className="text-xs text-[#4F46E5] shrink-0" />
                      <span>
                        Thời lượng dự kiến: <strong>{req.durationHours ? parseFloat(req.durationHours).toFixed(1) : '4.0'} giờ</strong>
                      </span>
                    </div>

                    {/* Reason */}
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Lý do:</span>
                      <p className="text-xs text-gray-700 font-medium leading-relaxed">{req.reason || 'Không có lý do ghi rõ'}</p>
                    </div>

                    {/* Reject Reason */}
                    {req.rejectReason && (
                      <div className="space-y-0.5 pt-1.5 border-t border-dashed border-gray-150">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Ghi chú quản lý:</span>
                        <p className="text-xs text-red-500 font-medium leading-relaxed">{req.rejectReason}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white border border-dashed border-gray-300 p-8 rounded-2xl text-center shadow-sm">
            <RiFileTextLine className="text-3xl text-gray-300 mx-auto mb-2" />
            <span className="text-gray-400 text-xs font-semibold">Chưa có yêu cầu đăng ký tăng ca nào</span>
          </div>
        )}
      </div>

      {/* Overtime Form Drawer/Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-xs">
          <div className="w-[calc(100%-32px)] max-w-md bg-white rounded-[24px] p-6 pb-6 space-y-4 animate-slide-up text-left shadow-2xl" style={{ marginTop: '90px', display: 'flex', flexDirection: 'column', maxHeight: '72vh' }}>
            <div className="flex items-center justify-between shrink-0">
              <h3 className="text-base font-bold text-gray-900">Đăng ký tăng ca mới</h3>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 bg-gray-100 transition-colors cursor-pointer"
              >
                <RiCloseLine className="text-lg" />
              </button>
            </div>

            {errorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-650 p-3 rounded-xl text-xs font-semibold shrink-0">
                ⚠️ {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-xl text-xs font-semibold shrink-0">
                ✅ {successMessage}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 flex flex-col overflow-hidden">
              <div className="space-y-4 overflow-y-auto pr-1 pb-8 flex-1 text-left" style={{ maxHeight: '46vh' }}>
                
                {/* Work Date */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <RiCalendar2Line className="text-xs text-gray-400" />
                    Ngày làm việc
                  </label>
                  <div className="relative w-full">
                    <input
                      type="date"
                      name="workDate"
                      value={form.workDate}
                      onChange={handleInputChange}
                      onFocus={() => setDateFocused(true)}
                      onBlur={() => setDateFocused(false)}
                      className="w-full px-4 py-3 text-xs font-semibold focus:outline-none transition-all duration-200"
                      style={{ 
                        color: '#111827', 
                        backgroundColor: '#F9FAFB', 
                        border: `1px solid ${dateFocused ? '#4F46E5' : '#D1D5DB'}`,
                        boxShadow: dateFocused ? '0 0 0 3px rgba(79, 70, 229, 0.15)' : 'none',
                        minHeight: '46px',
                        borderRadius: '14px',
                        display: 'block'
                      }}
                      required
                    />
                  </div>
                </div>

                {/* Reason Textarea */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                      <RiFileTextLine className="text-xs text-gray-400" />
                      Lý do làm thêm giờ
                    </label>
                    <span className="text-[9px] text-gray-400 font-medium">
                      {(form.reason || '').length}/100 ký tự
                    </span>
                  </div>
                  <textarea
                    name="reason"
                    rows="3"
                    placeholder="Vui lòng nhập lý do làm thêm (tối đa 100 ký tự)..."
                    value={form.reason}
                    onChange={handleInputChange}
                    maxLength={100}
                    onFocus={() => setReasonFocused(true)}
                    onBlur={() => setReasonFocused(false)}
                    className="w-full px-4 py-3 text-xs font-semibold focus:outline-none resize-none transition-all duration-200"
                    style={{ 
                      color: '#111827', 
                      backgroundColor: '#F9FAFB', 
                      border: `1px solid ${reasonFocused ? '#4F46E5' : '#D1D5DB'}`,
                      boxShadow: reasonFocused ? '0 0 0 3px rgba(79, 70, 229, 0.15)' : 'none',
                      borderRadius: '14px'
                    }}
                    required
                  ></textarea>
                </div>

              </div>

              <div className="pt-2 shrink-0">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 text-white rounded-2xl text-sm font-extrabold shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-60 flex items-center justify-center cursor-pointer"
                  style={{ backgroundColor: '#4F46E5', boxShadow: '0 10px 25px rgba(79, 70, 229, 0.25)' }}
                >
                  {submitting ? 'Đang gửi...' : 'Gửi yêu cầu tăng ca'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Modal for Alerts & Confirmations */}
      <CustomModal
        isOpen={modalConfig.isOpen}
        onClose={closeModal}
        onConfirm={modalConfig.onConfirm}
        type={modalConfig.type}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmText={modalConfig.confirmText}
        cancelText={modalConfig.cancelText}
        isSubmitting={modalConfig.isSubmitting}
      />
    </div>
  );
};

export default OvertimeRequests;
