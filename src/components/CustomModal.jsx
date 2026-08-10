import React from 'react';
import { HiCheckCircle, HiExclamationCircle, HiInformationCircle, HiXCircle } from 'react-icons/hi';

/**
 * CustomModal - Modern, high-aesthetic modal replacement for browser alert() and confirm()
 * 
 * Props:
 * - isOpen: boolean
 * - onClose: () => void
 * - onConfirm?: () => void
 * - type: 'success' | 'error' | 'warning' | 'confirm' | 'info'
 * - title: string
 * - message: string
 * - confirmText?: string
 * - cancelText?: string
 * - isSubmitting?: boolean
 */
export default function CustomModal({
  isOpen,
  onClose,
  onConfirm,
  type = 'success',
  title,
  message,
  confirmText = 'Đồng ý',
  cancelText = 'Hủy',
  isSubmitting = false
}) {
  if (!isOpen) return null;

  const isConfirmType = type === 'confirm' || type === 'warning';

  const getIcon = () => {
    switch (type) {
      case 'success':
        return (
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-emerald-400/20 to-teal-500/20 dark:from-emerald-500/30 dark:to-teal-600/30 flex items-center justify-center text-emerald-500 dark:text-emerald-400 text-4xl shadow-inner border border-emerald-500/20 animate-bounce-short">
            <HiCheckCircle />
          </div>
        );
      case 'error':
        return (
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-rose-400/20 to-red-500/20 dark:from-rose-500/30 dark:to-red-600/30 flex items-center justify-center text-rose-500 dark:text-rose-400 text-4xl shadow-inner border border-rose-500/20">
            <HiXCircle />
          </div>
        );
      case 'warning':
      case 'confirm':
        return (
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 dark:from-amber-500/30 dark:to-orange-600/30 flex items-center justify-center text-amber-500 dark:text-amber-400 text-4xl shadow-inner border border-amber-500/20">
            <HiExclamationCircle />
          </div>
        );
      default:
        return (
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-400/20 to-indigo-500/20 dark:from-blue-500/30 dark:to-indigo-600/30 flex items-center justify-center text-blue-500 dark:text-blue-400 text-4xl shadow-inner border border-blue-500/20">
            <HiInformationCircle />
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fade-in pointer-events-auto">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-5 text-center transform transition-all animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center">
          {getIcon()}
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
            {title}
          </h3>
          {message && (
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">
              {message}
            </p>
          )}
        </div>

        <div className="flex gap-2.5 pt-2">
          {isConfirmType ? (
            <>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={onClose}
                className="flex-1 py-3.5 px-4 rounded-2xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0' }}
              >
                {cancelText}
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={onConfirm || onClose}
                className="flex-1 py-3.5 px-4 rounded-2xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]"
                style={{ 
                  backgroundColor: type === 'warning' ? '#EF4444' : '#22C55E', 
                  color: '#FFFFFF',
                  boxShadow: type === 'warning' ? '0 8px 20px rgba(239, 68, 68, 0.25)' : '0 8px 20px rgba(34, 197, 94, 0.25)' 
                }}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  confirmText || 'Xác nhận'
                )}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3.5 px-4 rounded-2xl text-xs font-bold transition-all cursor-pointer active:scale-[0.98]"
              style={{ backgroundColor: '#22C55E', color: '#FFFFFF', boxShadow: '0 8px 20px rgba(34, 197, 94, 0.25)' }}
            >
              {confirmText === 'Đồng ý' ? 'Đóng' : (confirmText || 'Đóng')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
