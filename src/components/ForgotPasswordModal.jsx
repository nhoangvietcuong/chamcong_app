import React, { useState, useEffect } from 'react';
import { RiCloseLine, RiMailLine, RiSmartphoneLine, RiKey2Line, RiArrowLeftLine } from 'react-icons/ri';
import authService from '../services/authService';

export const ForgotPasswordModal = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(1); // 1: Request, 2: Verify, 3: Reset, 4: Complete
  const [identifier, setIdentifier] = useState('');
  const [channel, setChannel] = useState('EMAIL');
  const [otpCode, setOtpCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [infoMessage, setInfoMessage] = useState(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  if (!isOpen) return null;

  const handleRequestOtpWithChannel = async (selectedChannel, e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!identifier || !identifier.trim()) {
      setError('Vui lòng nhập Email, Mã nhân viên hoặc Số điện thoại.');
      return;
    }
    setError(null);
    setLoading(true);
    setChannel(selectedChannel);
    try {
      const res = await authService.requestForgotPasswordOtp(identifier.trim(), selectedChannel);
      if (res && res.success === false) {
        setError(res.message || 'Email nhập vào không chính xác. Vui lòng nhập đúng Email đã đăng ký tài khoản.');
        return;
      }
      setInfoMessage(res?.message || 'Nếu thông tin hợp lệ, mã OTP đã được gửi đến bạn.');
      setStep(2);
      setCountdown(60);
    } catch (err) {
      console.error('requestForgotPasswordOtp error:', err);
      const msg = typeof err === 'string' ? err : (err?.message || err?.response?.data?.message || err?.data?.message);
      setError(msg || 'Email nhập vào không chính xác. Vui lòng nhập đúng Email đã đăng ký tài khoản.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    handleRequestOtpWithChannel(channel, e);
  };

  const handleVerifyOtp = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    if (!otpCode || otpCode.trim().length !== 6) {
      setError('Mã OTP phải bao gồm đúng 6 chữ số.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await authService.verifyForgotPasswordOtp(identifier.trim(), otpCode.trim());
      const token = res?.resetToken || res?.data?.resetToken;
      setResetToken(token);
      setStep(3);
    } catch (err) {
      console.error('verifyForgotPasswordOtp error:', err);
      const msg = typeof err === 'string' ? err : (err?.message || err?.response?.data?.message || err?.data?.message);
      setError(msg || 'Mã OTP không chính xác hoặc đã hết hạn.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    if (!newPassword || newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Xác nhận mật khẩu mới không khớp.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await authService.resetPassword(resetToken, newPassword);
      setInfoMessage(res?.message || 'Đặt lại mật khẩu thành công!');
      setStep(4);
    } catch (err) {
      console.error('resetPassword error:', err);
      const msg = typeof err === 'string' ? err : (err?.message || err?.response?.data?.message || err?.data?.message);
      setError(msg || 'Không thể đặt lại mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setIdentifier('');
    setOtpCode('');
    setResetToken('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setInfoMessage(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in">
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-[360px] w-full p-6 relative border border-slate-100"
        style={{ transform: 'translateY(-20px)' }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors p-1"
        >
          <RiCloseLine className="text-2xl" />
        </button>

        {/* Modal Header */}
        <h2 className="text-base font-black text-slate-900 mb-1 flex items-center gap-2">
          <RiKey2Line className="text-[#046A38] text-xl" />
          Khôi Phục Mật Khẩu
        </h2>
        <p className="text-xs font-semibold text-slate-500 mb-5 leading-relaxed">
          {step === 1 && 'Nhập thông tin tài khoản và chọn phương thức nhận mã xác thực'}
          {step === 2 && 'Nhập mã xác thực OTP 6 chữ số đã được gửi cho bạn'}
          {step === 3 && 'Tạo mật khẩu mới cho tài khoản của bạn'}
          {step === 4 && 'Hoàn tất đặt lại mật khẩu'}
        </p>

        {/* Alert Messages */}
        {error && (
          <div
            className="mb-4 p-3 rounded-2xl text-xs font-extrabold border"
            style={{ backgroundColor: '#FEF2F2', color: '#DC2626', borderColor: '#FCA5A5' }}
          >
            ⚠️ {error}
          </div>
        )}

        {infoMessage && step !== 4 && (
          <div
            className="mb-4 p-3 rounded-2xl text-xs font-semibold border"
            style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8', borderColor: '#BFDBFE' }}
          >
            ℹ️ {infoMessage}
          </div>
        )}

        {/* STEP 1: REQUEST OTP */}
        {step === 1 && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Email / Số điện thoại
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Ví dụ: tranhongvan2003pq@gmail.com"
                style={{
                  backgroundColor: '#FFFFFF',
                  color: '#0F172A',
                  border: '1.5px solid #CBD5E1',
                  borderRadius: '14px',
                  padding: '12px 14px',
                  fontSize: '13.5px',
                  fontWeight: '600',
                  width: '100%',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-2">
                Bấm chọn phương thức để nhận mã OTP
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={loading}
                  onClick={(e) => handleRequestOtpWithChannel('EMAIL', e)}
                  style={{
                    backgroundColor: '#ECFDF5',
                    color: '#046A38',
                    border: '2px solid #046A38',
                    borderRadius: '14px',
                    padding: '12px 8px',
                    fontSize: '12px',
                    fontWeight: '850',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  <RiMailLine style={{ fontSize: '16px' }} />
                  <span>{loading && channel === 'EMAIL' ? 'Đang gửi...' : 'Gửi qua Gmail'}</span>
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={(e) => handleRequestOtpWithChannel('SMS', e)}
                  style={{
                    backgroundColor: '#ECFDF5',
                    color: '#046A38',
                    border: '2px solid #046A38',
                    borderRadius: '14px',
                    padding: '12px 8px',
                    fontSize: '12px',
                    fontWeight: '850',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  <RiSmartphoneLine style={{ fontSize: '16px' }} />
                  <span>{loading && channel === 'SMS' ? 'Đang gửi...' : 'Gửi qua SMS'}</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* STEP 2: VERIFY OTP (6-DIGIT CODE) */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Nhập mã OTP 6 chữ số
              </label>
              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="• • • • • •"
                style={{
                  backgroundColor: '#FFFFFF',
                  color: '#0F172A',
                  border: '2px solid #046A38',
                  borderRadius: '14px',
                  padding: '12px',
                  fontSize: '22px',
                  fontWeight: '900',
                  letterSpacing: '0.2em',
                  textAlign: 'center',
                  width: '100%',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
              <span>Không nhận được mã?</span>
              {countdown > 0 ? (
                <span className="font-mono text-slate-400 font-bold">Gửi lại sau {countdown}s</span>
              ) : (
                <button
                  type="button"
                  onClick={(e) => handleRequestOtp(e)}
                  className="text-[#046A38] font-bold hover:underline cursor-pointer"
                >
                  Gửi lại OTP
                </button>
              )}
            </div>

            {/* CONFIRM BUTTON FOR STEP 2 */}
            <div className="space-y-2.5 pt-2">
              <button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                style={{
                  backgroundColor: '#046A38',
                  color: '#FFFFFF',
                  paddingTop: '13px',
                  paddingBottom: '13px',
                  borderRadius: '14px',
                  fontSize: '12.5px',
                  fontWeight: '850',
                  width: '100%',
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  letterSpacing: '0.05em',
                  cursor: 'pointer',
                  opacity: (loading || otpCode.length !== 6) ? 0.6 : 1,
                  boxShadow: '0 4px 12px rgba(4, 106, 56, 0.25)'
                }}
              >
                {loading ? 'ĐANG XÁC THỰC...' : 'XÁC NHẬN MÃ OTP'}
              </button>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full text-slate-500 hover:text-slate-800 text-xs font-bold py-2 flex items-center justify-center gap-1 cursor-pointer"
              >
                <RiArrowLeftLine className="text-sm" />
                <span>Quay lại bước trước</span>
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: RESET PASSWORD */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Mật khẩu mới
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                style={{
                  backgroundColor: '#FFFFFF',
                  color: '#0F172A',
                  border: '1.5px solid #CBD5E1',
                  borderRadius: '14px',
                  padding: '12px 14px',
                  fontSize: '13.5px',
                  fontWeight: '600',
                  width: '100%',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Xác nhận mật khẩu mới
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
                style={{
                  backgroundColor: '#FFFFFF',
                  color: '#0F172A',
                  border: '1.5px solid #CBD5E1',
                  borderRadius: '14px',
                  padding: '12px 14px',
                  fontSize: '13.5px',
                  fontWeight: '600',
                  width: '100%',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                backgroundColor: '#046A38',
                color: '#FFFFFF',
                paddingTop: '13px',
                paddingBottom: '13px',
                borderRadius: '14px',
                fontSize: '12.5px',
                fontWeight: '850',
                width: '100%',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                letterSpacing: '0.05em',
                cursor: 'pointer',
                opacity: loading ? 0.6 : 1,
                marginTop: '12px',
                boxShadow: '0 4px 12px rgba(4, 106, 56, 0.25)'
              }}
            >
              {loading ? 'ĐANG CẬP NHẬT...' : 'XÁC NHẬN ĐẶT LẠI MẬT KHẨU'}
            </button>
          </form>
        )}

        {/* STEP 4: COMPLETE */}
        {step === 4 && (
          <div className="text-center py-2 space-y-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto text-2xl font-black shadow-inner">
              ✓
            </div>
            <h3 className="font-extrabold text-slate-900 text-base">Đặt lại mật khẩu thành công!</h3>
            <p className="text-xs text-slate-600 px-1 leading-relaxed font-medium">
              Mật khẩu của bạn đã được cập nhật. Vì lý do bảo mật, <strong>tất cả các phiên đăng nhập khác đã được thu hồi</strong>.
            </p>
            <button
              type="button"
              onClick={handleClose}
              style={{
                backgroundColor: '#046A38',
                color: '#FFFFFF',
                paddingTop: '13px',
                paddingBottom: '13px',
                borderRadius: '14px',
                fontSize: '12.5px',
                fontWeight: '850',
                width: '100%',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                letterSpacing: '0.05em',
                cursor: 'pointer',
                marginTop: '8px',
                boxShadow: '0 4px 12px rgba(4, 106, 56, 0.25)'
              }}
            >
              ĐĂNG NHẬP NGAY
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
