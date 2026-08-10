import React, { useState, useEffect, useCallback } from 'react';
import { 
  RiFileTextLine, RiCalendar2Line, RiTimeLine, RiAddLine, 
  RiCheckLine, RiCloseLine, RiRefreshLine, RiAlertLine, RiDeleteBin6Line, RiCameraLine
} from 'react-icons/ri';
import useAuth from '../hooks/useAuth';
import leaveService from '../services/leaveService';
import dayjs from 'dayjs';
import CustomModal from '../components/CustomModal';

const LEAVE_TYPES = [
  { value: 'ANNUAL', label: 'Nghỉ phép năm' },
  { value: 'COMPENSATORY', label: 'Nghỉ bù' },
  { value: 'SICK', label: 'Nghỉ bệnh' },
  { value: 'UNPAID', label: 'Nghỉ không lương' },
  { value: 'MARRIAGE', label: 'Nghỉ cưới' },
  { value: 'MATERNITY', label: 'Nghỉ thai sản' },
  { value: 'OTHER', label: 'Nghỉ khác' }
];

const LEAVE_TYPE_MAP = {
  ANNUAL: { label: 'Nghỉ phép năm', style: { backgroundColor: '#EEF2FF', color: '#4F46E5', border: '1px solid #C7D2FE' } },
  COMPENSATORY: { label: 'Nghỉ bù', style: { backgroundColor: '#F3E8FF', color: '#7E22CE', border: '1px solid #E9D5FF' } },
  SICK: { label: 'Nghỉ bệnh', style: { backgroundColor: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' } },
  UNPAID: { label: 'Nghỉ không lương', style: { backgroundColor: '#F3F4F6', color: '#4B5563', border: '1px solid #D1D5DB' } },
  MARRIAGE: { label: 'Nghỉ cưới', style: { backgroundColor: '#FDF2F8', color: '#DB2777', border: '1px solid #FBCFE8' } },
  MATERNITY: { label: 'Nghỉ thai sản', style: { backgroundColor: '#F5F3FF', color: '#7C3AED', border: '1px solid #DDD6FE' } },
  OTHER: { label: 'Nghỉ khác', style: { backgroundColor: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A' } }
};

const STATUS_MAP = {
  PENDING: { label: 'Chờ duyệt', style: { backgroundColor: '#FEF9C3', color: '#CA8A04', border: '1px solid #FDE047' } },
  APPROVED: { label: 'Đã duyệt', style: { backgroundColor: '#DCFCE7', color: '#15803D', border: '1px solid #BBF7D0' } },
  REJECTED: { label: 'Từ chối', style: { backgroundColor: '#FEE2E2', color: '#DC2626', border: '1px solid #FCA5A5' } },
  CANCELLED: { label: 'Đã hủy', style: { backgroundColor: '#F3F4F6', color: '#6B7280', border: '1px solid #E5E7EB' } }
};

export const LeaveRequests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(null);
  
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

  const [startDateFocused, setStartDateFocused] = useState(false);
  const [endDateFocused, setEndDateFocused] = useState(false);
  const [selectFocused, setSelectFocused] = useState(false);
  const [reasonFocused, setReasonFocused] = useState(false);

  const [swipedId, setSwipedId] = useState(null);
  const [startX, setStartX] = useState(0);
  const [hiddenIds, setHiddenIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('hiddenLeaveRequests') || '[]');
    } catch (e) {
      return [];
    }
  });

  const hideRequest = (id) => {
    const updated = [...hiddenIds, id];
    setHiddenIds(updated);
    localStorage.setItem('hiddenLeaveRequests', JSON.stringify(updated));
  };

  const handleClearAllHistory = () => {
    setModalConfig({
      isOpen: true,
      type: 'confirm',
      title: 'Xóa tất cả lịch sử',
      message: 'Bạn có chắc chắn muốn xóa tất cả lịch sử nghỉ phép khỏi giao diện? (Đơn chờ duyệt sẽ bị hủy)',
      confirmText: 'Xóa toàn bộ',
      cancelText: 'Bỏ qua',
      onConfirm: async () => {
        setModalConfig(prev => ({ ...prev, isSubmitting: true }));
        try {
          const pendingRequests = requests.filter(r => r.status === 'PENDING');
          for (const r of pendingRequests) {
            try {
              await leaveService.cancelRequest(r.leaveRequestId);
            } catch (err) {
              console.error('Failed to cancel request:', r.leaveRequestId, err);
            }
          }
          const allIds = requests.map(r => r.leaveRequestId);
          setHiddenIds(allIds);
          localStorage.setItem('hiddenLeaveRequests', JSON.stringify(allIds));
          fetchRequests();
          fetchBalance();
        } finally {
          setModalConfig(prev => ({ ...prev, isOpen: false, isSubmitting: false }));
        }
      }
    });
  };

  const [form, setForm] = useState({
    leaveType: 'ANNUAL',
    startDate: '',
    endDate: '',
    reason: ''
  });

  const [evidenceFile, setEvidenceFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const fetchBalance = useCallback(async () => {
    try {
      const year = dayjs().year();
      const res = await leaveService.getMyLeaveBalance(year);
      if (res && res.success && res.data) {
        setBalance(res.data);
      }
    } catch (err) {
      console.error('Lỗi tải số dư phép:', err);
    }
  }, []);

  const fetchRequests = useCallback(async (showSkeleton = true) => {
    if (showSkeleton) setLoading(true);
    try {
      const res = await leaveService.getMyRequests({ limit: 50 });
      if (res && res.success && res.data) {
        setRequests(res.data.items || []);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách đơn nghỉ phép:', err);
    } finally {
      if (showSkeleton) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalance();
    fetchRequests(true);

    // Background poll every 15 seconds to keep UI synced without page reloads
    const interval = setInterval(() => {
      fetchBalance();
      fetchRequests(false);
    }, 15000);

    return () => clearInterval(interval);
  }, [fetchBalance, fetchRequests]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const todayStr = dayjs().format('YYYY-MM-DD');
    const startDateVal = form.leaveType === 'COMPENSATORY' ? (form.startDate || todayStr) : form.startDate;
    const endDateVal = form.leaveType === 'COMPENSATORY' ? (form.endDate || todayStr) : form.endDate;

    if (!startDateVal || !endDateVal) {
      return setErrorMessage('Vui lòng chọn ngày bắt đầu và kết thúc');
    }
    
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const formData = new FormData();
      formData.append('employeeId', user.employeeId);
      formData.append('leaveType', form.leaveType);
      formData.append('startDate', startDateVal);
      formData.append('endDate', endDateVal);
      formData.append('reason', form.reason);
      if (evidenceFile) {
        formData.append('evidencePhoto', evidenceFile);
      }

      const res = await leaveService.createRequest(formData);
      if (res && res.success) {
        setIsFormOpen(false);
        setForm({ leaveType: 'ANNUAL', startDate: '', endDate: '', reason: '' });
        setEvidenceFile(null);
        setPreviewUrl(null);
        fetchRequests();
        fetchBalance();
        setModalConfig({
          isOpen: true,
          type: 'success',
          title: 'Gửi đơn thành công!',
          message: 'Đơn xin nghỉ phép của bạn đã được gửi thành công và đang chờ Admin phê duyệt.'
        });
      }
    } catch (err) {
      setErrorMessage(err.message || 'Lỗi gửi đơn nghỉ phép');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = (id) => {
    setModalConfig({
      isOpen: true,
      type: 'confirm',
      title: 'Xác nhận hủy đơn',
      message: 'Bạn có chắc chắn muốn hủy đơn xin nghỉ phép này không?',
      confirmText: 'Hủy đơn',
      cancelText: 'Bỏ qua',
      onConfirm: async () => {
        setModalConfig(prev => ({ ...prev, isSubmitting: true }));
        try {
          const res = await leaveService.cancelRequest(id);
          if (res && res.success) {
            fetchRequests();
            fetchBalance();
            setModalConfig({
              isOpen: true,
              type: 'success',
              title: 'Đã hủy đơn',
              message: 'Hủy đơn xin nghỉ phép thành công.'
            });
          }
        } catch (err) {
          setModalConfig({
            isOpen: true,
            type: 'error',
            title: 'Không thể hủy đơn',
            message: err.message || 'Không thể hủy đơn nghỉ phép'
          });
        }
      }
    });
  };

  const getLeaveTypeDisplay = (type) => LEAVE_TYPE_MAP[type]?.label || type;
  
  const getLeaveTypeBadge = (type) => {
    const map = LEAVE_TYPE_MAP[type] || { label: type, style: { backgroundColor: '#F3F4F6', color: '#4B5563' } };
    return (
      <span 
        className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border"
        style={map.style}
      >
        {map.label}
      </span>
    );
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
    boxShadow: '0 8px 20px rgba(34, 197, 94, 0.08)',
  };

  return (
    <div className="space-y-4 pb-24 text-left min-h-screen animate-fade-in" style={{ backgroundColor: '#F6F8FA' }}>
      <style>{`
        input[type="date"]::-webkit-datetime-edit,
        input[type="date"]::-webkit-datetime-edit-fields-wrapper,
        input[type="date"]::-webkit-datetime-edit-text,
        input[type="date"]::-webkit-datetime-edit-month-field,
        input[type="date"]::-webkit-datetime-edit-day-field,
        input[type="date"]::-webkit-datetime-edit-year-field {
          color: #111827 !important;
        }
      `}</style>
      {/* Title */}
      <div className="flex items-center justify-between py-1">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Đơn Xin Nghỉ Phép</h1>
          <p className="text-xs text-gray-500 font-medium mt-0.5">Tạo đơn phép và theo dõi quá trình phê duyệt</p>
        </div>
        <button
          onClick={() => {
            setErrorMessage(null);
            setSuccessMessage(null);
            setIsFormOpen(true);
          }}
          className="w-10 h-10 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer"
          style={{ backgroundColor: '#22C55E', color: '#FFFFFF', boxShadow: '0 10px 25px rgba(34, 197, 94, 0.25)' }}
        >
          <RiAddLine className="text-2xl" />
        </button>
      </div>

      {/* Balance Cards (Mobile Style) */}
      {balance && (
        <div className="space-y-2">
          {/* Header to describe the cards */}
          <div className="text-left px-1.5">
            <span className="text-xs font-bold text-gray-700">Số dư phép năm ({dayjs().year()})</span>
          </div>
          <div className="p-5 grid grid-cols-3 gap-2 text-center" style={cardStyle}>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Tổng cộng</span>
              <span className="text-xl font-extrabold text-gray-800 font-mono">{parseFloat(balance.annualDaysTotal).toFixed(1)}</span>
            </div>
            <div className="space-y-1 border-x border-gray-150">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Đã dùng</span>
              <span className="text-xl font-extrabold text-gray-800 font-mono">{parseFloat(balance.annualDaysUsed).toFixed(1)}</span>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Còn lại</span>
              <span className="text-xl font-extrabold font-mono" style={{ color: '#22C55E' }}>
                {Math.max(0, parseFloat(balance.annualDaysTotal) - parseFloat(balance.annualDaysUsed)).toFixed(1)}
              </span>
            </div>
          </div>
          
          {/* Other Leave Types Used Summary */}
          <div className="flex justify-center gap-3 text-[10px] font-bold text-gray-500 bg-white py-2 px-3 rounded-2xl border border-gray-200 shadow-xs">
            <span>Nghỉ bệnh đã dùng: <span className="text-gray-800 font-mono">{parseFloat(balance.sickDaysUsed).toFixed(1)} ngày</span></span>
            <span className="text-gray-300">|</span>
            <span>Nghỉ không lương: <span className="text-gray-800 font-mono">{parseFloat(balance.unpaidDaysUsed).toFixed(1)} ngày</span></span>
          </div>
        </div>
      )}

      {/* List of Requests */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-800">Lịch sử xin nghỉ</h3>
          <div className="flex items-center gap-2">
            {requests.filter(req => !hiddenIds.includes(req.leaveRequestId)).length > 0 && (
              <button
                onClick={handleClearAllHistory}
                className="p-1.5 rounded-xl text-red-500 hover:text-red-700 bg-white hover:bg-red-50 border border-gray-200 transition-colors shadow-xs cursor-pointer flex items-center gap-1 text-[10px] font-bold px-2.5"
              >
                <RiDeleteBin6Line className="text-xs" />
                Xóa tất cả
              </button>
            )}
            <button 
              onClick={() => { fetchBalance(); fetchRequests(); }}
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
        ) : requests.filter(req => !hiddenIds.includes(req.leaveRequestId)).length > 0 ? (
          <div className="flex flex-col" style={{ gap: '18px' }}>
            {requests.filter(req => !hiddenIds.includes(req.leaveRequestId)).map((req) => {
              const isCancelable = req.status === 'PENDING' || (req.status === 'APPROVED' && dayjs().isBefore(dayjs(req.startDate)));

              return (
                <div 
                  key={req.leaveRequestId}
                  className="relative w-full overflow-hidden rounded-2xl"
                  onTouchStart={(e) => {
                    setStartX(e.touches[0].clientX);
                  }}
                  onTouchMove={(e) => {
                    const currentX = e.touches[0].clientX;
                    const diffX = startX - currentX;
                    if (diffX > 50) {
                      setSwipedId(req.leaveRequestId);
                    } else if (diffX < -30) {
                      if (swipedId === req.leaveRequestId) {
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
                        await handleCancelRequest(req.leaveRequestId);
                      } else {
                        if (window.confirm('Bạn có chắc chắn muốn ẩn lịch sử nghỉ phép này khỏi giao diện?')) {
                          hideRequest(req.leaveRequestId);
                        }
                      }
                      setSwipedId(null);
                    }}
                    className="absolute right-0 top-0 bottom-0 w-[76px] text-white flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors shadow-sm"
                    style={{ 
                      zIndex: 1, 
                      backgroundColor: isCancelable ? '#EF4444' : '#6B7280',
                      display: swipedId === req.leaveRequestId ? 'flex' : 'none'
                    }}
                  >
                    <RiDeleteBin6Line className="text-lg" />
                    <span className="text-[9px] font-extrabold">{isCancelable ? 'Hủy đơn' : 'Xóa ẩn'}</span>
                  </div>

                  {/* Foreground Request Card */}
                  <div 
                    className="relative z-10 p-4 flex flex-col gap-3 text-gray-800 shadow-sm border border-gray-150 rounded-[16px] bg-white transition-transform duration-200 text-left"
                    style={{
                      transform: swipedId === req.leaveRequestId ? 'translateX(-76px)' : 'translateX(0px)',
                      transition: 'transform 0.2s ease-out'
                    }}
                  >
                    {/* Header: Type and Status */}
                    <div className="flex items-center justify-between">
                      {getLeaveTypeBadge(req.leaveType)}
                      {getStatusBadge(req.status)}
                    </div>

                    {/* Date display row */}
                    <div className="flex items-center gap-8 text-left">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Từ ngày</span>
                        <span className="text-xs font-semibold text-gray-800 mt-0.5">
                          {dayjs(req.startDate).format('DD/MM/YYYY')}
                        </span>
                      </div>
                      <span className="text-gray-300 text-xs font-light mt-2">➜</span>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Đến ngày</span>
                        <span className="text-xs font-semibold text-gray-800 mt-0.5">
                          {dayjs(req.endDate).format('DD/MM/YYYY')}
                        </span>
                      </div>
                    </div>

                    {/* Days Count banner */}
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F5F7FF] text-[#4F46E5] text-[10px] font-semibold border border-[#EBEFFF]">
                      <RiCalendar2Line className="text-xs text-[#4F46E5] shrink-0" />
                      <span>
                        Số ngày nghỉ: <strong>{dayjs(req.endDate).diff(dayjs(req.startDate), 'day') + 1} ngày</strong>
                      </span>
                    </div>

                    {/* Reason */}
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Lý do:</span>
                      <p className="text-xs text-gray-700 font-medium leading-relaxed">{req.reason || 'Không có lý do ghi rõ'}</p>
                    </div>

                    {/* Evidence if any */}
                    {req.evidenceUrl && (
                      <div className="pt-0.5">
                        <a 
                          href={req.evidenceUrl.startsWith('http') ? req.evidenceUrl : `${window.location.origin.replace(':5173', ':3000')}${req.evidenceUrl}`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-[9px] font-extrabold text-[#22C55E] bg-green-50 hover:bg-green-100 py-1 px-2.5 rounded-lg border border-green-100 transition-colors"
                        >
                          <RiCameraLine className="text-xs shrink-0" />
                          Xem minh chứng đính kèm
                        </a>
                      </div>
                    )}

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
            <span className="text-gray-400 text-xs font-semibold">Chưa có đơn xin nghỉ phép nào</span>
          </div>
        )}
      </div>

      {/* Leave Form Bottom Drawer/Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-xs">
          <div className="w-[calc(100%-32px)] max-w-md bg-white rounded-[24px] p-6 pb-6 space-y-4 animate-slide-up text-left shadow-2xl" style={{ marginTop: '90px', display: 'flex', flexDirection: 'column', maxHeight: '72vh' }}>
            <div className="flex items-center justify-between shrink-0">
              <h3 className="text-base font-bold text-gray-900">
                {form.leaveType === 'COMPENSATORY' ? 'Đơn xin nghỉ bù mới' : 'Đơn xin nghỉ phép mới'}
              </h3>
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
                {/* Leave Type Selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <RiFileTextLine className="text-xs text-gray-400" />
                    Loại hình nghỉ phép
                  </label>
                  <select
                    name="leaveType"
                    value={form.leaveType}
                    onChange={handleInputChange}
                    onFocus={() => setSelectFocused(true)}
                    onBlur={() => setSelectFocused(false)}
                    className="w-full px-4 py-3 rounded-xl text-xs font-semibold focus:outline-none transition-all duration-200"
                    style={{ 
                      color: '#111827', 
                      backgroundColor: '#F9FAFB', 
                      border: `1px solid ${selectFocused ? '#22C55E' : '#D1D5DB'}`,
                      boxShadow: selectFocused ? '0 0 0 3px rgba(34, 197, 94, 0.15)' : 'none',
                      minHeight: '46px',
                      appearance: 'none',
                      WebkitAppearance: 'none',
                      backgroundImage: "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"%236B7280\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polyline points=\"6 9 12 15 18 9\"></polyline></svg>')",
                      backgroundPosition: 'right 14px center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '16px',
                      paddingRight: '40px'
                    }}
                  >
                    {LEAVE_TYPES.map(type => (
                      <option key={type.value} value={type.value} style={{ color: '#111827', backgroundColor: '#FFFFFF' }}>{type.label}</option>
                    ))}
                  </select>
                </div>

                {/* Date Selection - Hidden when leaveType is COMPENSATORY */}
                {form.leaveType !== 'COMPENSATORY' && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                        <RiCalendar2Line className="text-xs text-gray-400" />
                        Từ ngày
                      </label>
                      <div className="relative w-full">
                        <input
                          type="date"
                          name="startDate"
                          value={form.startDate}
                          onChange={handleInputChange}
                          onFocus={() => setStartDateFocused(true)}
                          onBlur={() => setStartDateFocused(false)}
                          className="w-full px-4 py-3 text-xs font-semibold focus:outline-none transition-all duration-200"
                          style={{ 
                            color: '#111827', 
                            backgroundColor: '#F9FAFB', 
                            border: `1px solid ${startDateFocused ? '#22C55E' : '#D1D5DB'}`,
                            boxShadow: startDateFocused ? '0 0 0 3px rgba(34, 197, 94, 0.15)' : 'none',
                            minHeight: '46px',
                            appearance: 'none',
                            WebkitAppearance: 'none',
                            borderRadius: '14px',
                            display: 'block'
                          }}
                          required={form.leaveType !== 'COMPENSATORY'}
                        />
                        {!form.startDate && !startDateFocused && (
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-semibold pointer-events-none">
                            Chọn ngày bắt đầu (dd/mm/yyyy)
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                        <RiCalendar2Line className="text-xs text-gray-400" />
                        Đến hết ngày
                      </label>
                      <div className="relative w-full">
                        <input
                          type="date"
                          name="endDate"
                          value={form.endDate}
                          onChange={handleInputChange}
                          onFocus={() => setEndDateFocused(true)}
                          onBlur={() => setEndDateFocused(false)}
                          className="w-full px-4 py-3 text-xs font-semibold focus:outline-none transition-all duration-200"
                          style={{ 
                            color: '#111827', 
                            backgroundColor: '#F9FAFB', 
                            border: `1px solid ${endDateFocused ? '#22C55E' : '#D1D5DB'}`,
                            boxShadow: endDateFocused ? '0 0 0 3px rgba(34, 197, 94, 0.15)' : 'none',
                            minHeight: '46px',
                            appearance: 'none',
                            WebkitAppearance: 'none',
                            borderRadius: '14px',
                            display: 'block'
                          }}
                          required={form.leaveType !== 'COMPENSATORY'}
                        />
                        {!form.endDate && !endDateFocused && (
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-semibold pointer-events-none">
                            Chọn ngày kết thúc (dd/mm/yyyy)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Reason Textarea */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                      <RiTimeLine className="text-xs text-gray-400" />
                      {form.leaveType === 'COMPENSATORY' ? 'Lý do nghỉ bù' : 'Lý do nghỉ phép'}
                    </label>
                    <span className="text-[9px] text-gray-400 font-medium">
                      {(form.reason || '').length}/100 ký tự
                    </span>
                  </div>
                  <textarea
                    name="reason"
                    rows="3"
                    placeholder={form.leaveType === 'COMPENSATORY' ? 'Vui lòng nhập lý do nghỉ bù (tối đa 100 ký tự)...' : 'Vui lòng nhập lý do chi tiết (tối đa 100 ký tự)...'}
                    value={form.reason}
                    onChange={handleInputChange}
                    maxLength={100}
                    onFocus={() => setReasonFocused(true)}
                    onBlur={() => setReasonFocused(false)}
                    className="w-full px-4 py-3 text-xs font-semibold focus:outline-none resize-none transition-all duration-200"
                    style={{ 
                      color: '#111827', 
                      backgroundColor: '#F9FAFB', 
                      border: `1px solid ${reasonFocused ? '#22C55E' : '#D1D5DB'}`,
                      boxShadow: reasonFocused ? '0 0 0 3px rgba(34, 197, 94, 0.15)' : 'none',
                      borderRadius: '14px'
                    }}
                    required
                  ></textarea>
                </div>

                {/* Photo Upload (Evidence) */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <RiCameraLine className="text-xs text-gray-400" />
                    Minh chứng đính kèm (nếu có)
                  </label>
                  <div className="flex items-center gap-3">
                    <label 
                      className="flex flex-col items-center justify-center border border-dashed border-gray-300 rounded-2xl bg-gray-50 hover:bg-gray-100 cursor-pointer transition-all w-20 h-20 shrink-0"
                      style={{ borderRadius: '14px' }}
                    >
                      <RiAddLine className="text-2xl text-gray-400 font-light" />
                      <span className="text-[9px] text-gray-400 font-medium mt-0.5">Chọn ảnh</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            setEvidenceFile(file);
                            setPreviewUrl(URL.createObjectURL(file));
                          }
                        }} 
                        className="hidden" 
                      />
                    </label>
                    
                    {previewUrl && (
                      <div className="relative w-20 h-20 rounded-2xl border border-gray-200 overflow-hidden bg-gray-50">
                        <img 
                          src={previewUrl} 
                          alt="Minh chứng" 
                          className="w-full h-full object-cover" 
                          style={{ borderRadius: '14px' }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setEvidenceFile(null);
                            setPreviewUrl(null);
                          }}
                          className="absolute top-1 right-1 p-0.5 bg-red-500 text-white rounded-full text-[10px] shadow-md cursor-pointer hover:scale-105 active:scale-95 transition-all flex items-center justify-center w-4.5 h-4.5 border border-white"
                        >
                          <RiCloseLine />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Spacer to prevent submit button covering photo selector */}
                <div className="h-10"></div>
              </div>

              <div className="pt-2 shrink-0">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 text-white rounded-2xl text-sm font-extrabold shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-60 flex items-center justify-center cursor-pointer"
                  style={{ 
                    backgroundColor: form.leaveType === 'COMPENSATORY' ? '#7E22CE' : '#4F46E5', 
                    boxShadow: form.leaveType === 'COMPENSATORY' ? '0 10px 25px rgba(126, 34, 206, 0.25)' : '0 10px 25px rgba(79, 70, 229, 0.25)' 
                  }}
                >
                  {submitting ? 'Đang gửi...' : (form.leaveType === 'COMPENSATORY' ? 'Gửi yêu cầu nghỉ bù' : 'Gửi yêu cầu nghỉ phép')}
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

export default LeaveRequests;
