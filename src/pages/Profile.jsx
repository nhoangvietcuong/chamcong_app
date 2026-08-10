import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useProfile } from '../hooks/useProfile';
import { useAuth } from '../hooks/useAuth';
import { useFaceProfile } from '../hooks/useFaceProfile';
import { FaceRegisterPage } from '../components/FaceRegisterPage';
import { registerWebAuthnCredential } from '../utils/webauthn';
import { getProtectedImageUrl } from '../utils/imageUtils';
import {
  RiUser3Line,
  RiMailLine,
  RiPhoneLine,
  RiLockPasswordLine,
  RiCameraSwitchLine,
  RiLogoutBoxRLine,
  RiAlertLine,
  RiInformationLine,
  RiCameraLine,
  RiCloseLine,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiArrowLeftRightLine
} from 'react-icons/ri';

const updateProfileSchema = z.object({
  email: z.string().email('Email không hợp lệ').min(1, 'Email không được để trống'),
  phone: z.string().min(10, 'Số điện thoại phải từ 10 số trở lên').max(11, 'Số điện thoại không quá 11 số'),
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Vui lòng nhập mật khẩu cũ'),
  newPassword: z.string().min(8, 'Mật khẩu mới phải dài từ 8 ký tự trở lên'),
  confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu mới'),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Xác nhận mật khẩu mới không trùng khớp',
  path: ['confirmPassword']
});

export const Profile = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Contact Profile Hook
  const {
    profile,
    isLoading,
    error: profileError,
    loadProfile,
    updateProfileDetails,
    changeProfilePassword,
    uploadProfileAvatar
  } = useProfile();

  const [activeForm, setActiveForm] = useState(null); // 'info' | 'password' | null
  const [successMessage, setSuccessMessage] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  // Security Center WebAuthn State
  const [deviceName, setDeviceName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // Face Profile Hook & State
  const { isFaceRegistered, registerFaceProfile, fetchFaceProfileStatus } = useFaceProfile();
  const [showFaceRegister, setShowFaceRegister] = useState(false);
  const [isRegisteringFace, setIsRegisteringFace] = useState(false);

  const handleRegisterPasskey = async () => {
    if (!deviceName.trim()) return;
    setSuccessMessage(null);
    setSubmitError(null);
    setIsRegistering(true);
    try {
      const res = await registerWebAuthnCredential(deviceName);
      if (res && res.success) {
        setSuccessMessage(`Đăng ký thiết bị "${deviceName}" thành công!`);
        setDeviceName('');
      } else {
        setSubmitError(res?.message || 'Đăng ký thiết bị thất bại.');
      }
    } catch (err) {
      setSubmitError(err.message || 'Lỗi khi đăng ký thiết bị bảo mật.');
    } finally {
      setIsRegistering(false);
    }
  };

  useEffect(() => {
    loadProfile();
    fetchFaceProfileStatus();
  }, [loadProfile, fetchFaceProfileStatus]);

  const {
    register: registerInfo,
    handleSubmit: handleSubmitInfo,
    formState: { errors: infoErrors },
  } = useForm({
    resolver: zodResolver(updateProfileSchema),
    values: {
      email: profile?.email || '',
      phone: profile?.phone || '',
    }
  });

  const {
    register: registerPwd,
    handleSubmit: handleSubmitPwd,
    formState: { errors: pwdErrors },
    reset: resetPwdForm
  } = useForm({
    resolver: zodResolver(changePasswordSchema),
  });

  const onUpdateInfo = async (data) => {
    setSuccessMessage(null);
    setSubmitError(null);
    const result = await updateProfileDetails(data);
    if (result.success) {
      setSuccessMessage('Cập nhật thông tin cá nhân thành công!');
      setActiveForm(null);
    } else {
      setSubmitError(result.message);
    }
  };

  const onChangePwd = async (data) => {
    setSuccessMessage(null);
    setSubmitError(null);
    const result = await changeProfilePassword({
      oldPassword: data.oldPassword,
      newPassword: data.newPassword
    });
    if (result.success) {
      setSuccessMessage('Đổi mật khẩu thành công!');
      resetPwdForm();
      setActiveForm(null);
    } else {
      setSubmitError(result.message);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSuccessMessage(null);
    setSubmitError(null);
    const result = await uploadProfileAvatar(file);
    if (result.success) {
      setSuccessMessage('Cập nhật ảnh đại diện thành công!');
    } else {
      setSubmitError(result.message);
    }
  };

  const formatPhone = (phone) => {
    if (!phone) return 'Chưa cung cấp số điện thoại';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
    }
    return phone;
  };

  return (
    <div className="space-y-4 text-[#111827] animate-fade-in">
      {/* Title */}
      <div className="pt-1">
        <h1 className="text-xl font-bold text-gray-900">Thông Tin Cá Nhân</h1>
        <p className="text-xs text-gray-500 font-medium mt-0.5">Quản lý tài khoản và thông tin liên lạc cá nhân</p>
      </div>

      {/* Success Alert */}
      {successMessage && (
        <div className="bg-green-100 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-xs font-semibold">
          ✅ {successMessage}
        </div>
      )}

      {/* Error Alert */}
      {(submitError || profileError) && (
        <div className="bg-red-50 border border-red-200 text-red-500 px-4 py-3 rounded-xl text-xs font-semibold">
          ❌ {submitError || profileError}
        </div>
      )}

      {/* Profile Header Details Card */}
      <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm flex flex-col items-center text-center space-y-4">

        {/* Parent container of wrapper */}
        <div className="flex flex-col items-center justify-center w-full pt-2 pb-1">
          {/* KHÓA CHẶT KÍCH THƯỚC: w-24 h-24 tương đương 96x96px, shrink-0 để không bị méo */}
          <div className="relative w-24 h-24 mx-auto shrink-0">

            {/* Hộp chứa ảnh: Bắt buộc dùng w-full h-full (ăn theo 96px ở trên) và rounded-full để bo tròn xoe */}
            <div className="w-full h-full rounded-full bg-green-100 border-2 border-green-200 overflow-hidden flex items-center justify-center font-bold text-3xl text-green-600 shadow-sm">
              {profile?.avatarUrl ? (
                <img
                  src={getProtectedImageUrl(profile.avatarUrl)}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{profile?.fullName?.split(' ').pop()?.charAt(0).toUpperCase()}</span>
              )}
            </div>

            {/* Nút camera: Gắn chặt vào góc dưới cùng bên phải của hình tròn */}
            <label className="absolute bottom-0 right-0 z-10 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-md cursor-pointer hover:scale-110 transition-all border-2 border-white flex items-center justify-center w-8 h-8" style={{ backgroundColor: '#22C55E' }}>
              <RiCameraSwitchLine className="text-base" style={{ color: '#FFFFFF' }} />
              <input type="file" onChange={handleAvatarChange} accept="image/*" className="hidden" />
            </label>

          </div>
        </div>

        {/* User details completely separate and pushed below the wrapper */}
        <div className="w-full pt-1">
          <h2 className="text-lg font-bold text-gray-900 leading-snug">{profile?.fullName}</h2>
          <span className="text-gray-500 text-xs font-medium block mt-1">
            Mã nhân viên: <span className="font-bold text-gray-900">{profile?.employeeCode}</span>
          </span>
        </div>

        {/* Profile Contact List */}
        <div className="w-full text-left space-y-3 pt-4 border-t border-gray-200 text-xs font-medium">
          <div className="flex items-center gap-3 text-gray-600">
            <RiMailLine className="text-base text-green-500 flex-shrink-0" />
            <span className="truncate">{profile?.email || 'Chưa cung cấp email'}</span>
          </div>
          <div className="flex items-center gap-3 text-gray-600">
            <RiPhoneLine className="text-base text-green-500 flex-shrink-0" />
            <span>{formatPhone(profile?.phone)}</span>
          </div>
          <div className="flex items-center gap-3 text-gray-600">
            <RiUser3Line className="text-base text-green-500 flex-shrink-0" />
            <span>Kỹ thuật viên hiện trường</span>
          </div>
        </div>
      </div>

      {/* Editing options */}
      {activeForm === null ? (
        <div className="space-y-3">
          <button
            onClick={() => { setSubmitError(null); setSuccessMessage(null); setActiveForm('info'); }}
            className="w-full py-3.5 bg-white border border-gray-200 hover:border-green-500 text-gray-700 font-bold rounded-2xl shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all text-xs cursor-pointer"
          >
            Chỉnh sửa thông tin liên lạc
          </button>
          <button
            onClick={() => { setSubmitError(null); setSuccessMessage(null); setActiveForm('password'); }}
            className="w-full py-3.5 bg-white border border-gray-200 hover:border-green-500 text-gray-700 font-bold rounded-2xl shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all text-xs cursor-pointer"
          >
            Thay đổi mật khẩu
          </button>
          <button
            onClick={logout}
            className="w-full py-3.5 bg-white border border-red-200 hover:border-red-300 text-red-500 font-bold rounded-2xl flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all text-xs cursor-pointer"
          >
            <RiLogoutBoxRLine className="text-base" /> Đăng xuất tài khoản
          </button>
        </div>
      ) : activeForm === 'info' ? (
        /* Edit Info Form */
        <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-gray-900 font-bold text-xs">Chỉnh sửa liên lạc</h3>
          <form onSubmit={handleSubmitInfo(onUpdateInfo)} className="space-y-4">
            <div className="space-y-1.5 text-xs font-semibold">
              <label className="text-gray-500 block">Địa chỉ Email</label>
              <input
                type="email"
                {...registerInfo('email')}
                className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:outline-none font-medium text-base"
              />
              {infoErrors.email && <p className="text-red-500 text-[10px] font-semibold">{infoErrors.email.message}</p>}
            </div>

            <div className="space-y-1.5 text-xs font-semibold">
              <label className="text-gray-500 block">Số điện thoại</label>
              <input
                type="text"
                {...registerInfo('phone')}
                className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:outline-none font-medium text-base"
              />
              {infoErrors.phone && <p className="text-red-500 text-[10px] font-semibold">{infoErrors.phone.message}</p>}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 text-white font-semibold px-4 py-2 rounded-lg shadow-md transition-all text-xs disabled:opacity-50 cursor-pointer"
                style={{ backgroundColor: '#22C55E', color: '#FFFFFF' }}
              >
                Lưu thay đổi
              </button>
              <button
                type="button"
                onClick={() => setActiveForm(null)}
                className="flex-1 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg transition-all text-xs cursor-pointer"
              >
                Hủy bỏ
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Change Password Form */
        <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-gray-900 font-bold text-xs">Thay đổi mật khẩu</h3>
          <form onSubmit={handleSubmitPwd(onChangePwd)} className="space-y-4">
            <div className="space-y-1.5 text-xs font-semibold">
              <label className="text-gray-500 block">Mật khẩu hiện tại</label>
              <input
                type="password"
                {...registerPwd('oldPassword')}
                placeholder="Nhập mật khẩu hiện tại"
                className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:outline-none font-medium text-base"
              />
              {pwdErrors.oldPassword && <p className="text-red-500 text-[10px] font-semibold">{pwdErrors.oldPassword.message}</p>}
            </div>

            <div className="space-y-1.5 text-xs font-semibold">
              <label className="text-gray-500 block">Mật khẩu mới</label>
              <input
                type="password"
                {...registerPwd('newPassword')}
                placeholder="Tối thiểu 8 ký tự"
                className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:outline-none font-medium text-base"
              />
              {pwdErrors.newPassword && <p className="text-red-500 text-[10px] font-semibold">{pwdErrors.newPassword.message}</p>}
            </div>

            <div className="space-y-1.5 text-xs font-semibold">
              <label className="text-gray-500 block">Xác nhận mật khẩu mới</label>
              <input
                type="password"
                {...registerPwd('confirmPassword')}
                placeholder="Xác nhận lại mật khẩu mới"
                className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:outline-none font-medium text-base"
              />
              {pwdErrors.confirmPassword && <p className="text-red-500 text-[10px] font-semibold">{pwdErrors.confirmPassword.message}</p>}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 text-white font-semibold px-4 py-2 rounded-lg shadow-md transition-all text-xs disabled:opacity-50 cursor-pointer"
                style={{ backgroundColor: '#22C55E', color: '#FFFFFF' }}
              >
                Cập nhật mật khẩu
              </button>
              <button
                type="button"
                onClick={() => setActiveForm(null)}
                className="flex-1 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg transition-all text-xs cursor-pointer"
              >
                Hủy bỏ
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Security Center section (WebAuthn Device Passkeys) */}
      {/*
      <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm space-y-4">
        <h2 className="text-gray-800 font-bold text-xs border-b border-gray-200 pb-3 flex items-center gap-2">
          <RiLockPasswordLine className="text-green-500 text-base" />
          <span>Trung Tâm Bảo Mật & Thiết Bị</span>
        </h2>

        <div className="space-y-4">
          <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
            Đăng ký vân tay, FaceID, Windows Hello hoặc khóa bảo mật USB để đăng nhập nhanh và xác thực chấm công không cần mật khẩu.
          </p>

          <div className="bg-gray-100 p-4 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-gray-700">Đăng ký thiết bị bảo mật mới</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="Tên thiết bị (ví dụ: FaceID iPhone)..."
                className="flex-1 px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500 text-xs font-semibold"
              />
              <button
                onClick={handleRegisterPasskey}
                disabled={isRegistering || !deviceName.trim()}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl text-xs disabled:opacity-40 cursor-pointer"
              >
                {isRegistering ? 'Đang tạo...' : 'Đăng ký'}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-[11px] text-gray-400 font-bold block">Thiết bị đã đăng ký</span>
            <div className="bg-gray-100 border border-dashed border-gray-200 p-6 rounded-xl text-center text-xs text-gray-500 font-medium">
              ⚠️ Danh sách thiết bị không thể hiển thị do máy chủ chưa cung cấp API truy vấn.
            </div>
          </div>
        </div>
      </div>
      */}
      {/* Render FaceRegisterPage eKYC Overlay */}
      {showFaceRegister && (
        <FaceRegisterPage
          onClose={() => setShowFaceRegister(false)}
          onComplete={async (embeddings) => {
            setShowFaceRegister(false);
            setSuccessMessage(null);
            setSubmitError(null);
            setIsRegisteringFace(true);
            try {
              const res = await registerFaceProfile(embeddings);
              if (res && res.success) {
                setSuccessMessage('Đăng ký khuôn mặt eKYC chuẩn doanh nghiệp thành công!');
              } else {
                setSubmitError(res?.message || 'Đăng ký khuôn mặt thất bại.');
              }
            } catch (err) {
              setSubmitError(err.message || 'Lỗi kết nối máy chủ.');
            } finally {
              setIsRegisteringFace(false);
            }
          }}
        />
      )}
    </div>
  );
};

export default Profile;
