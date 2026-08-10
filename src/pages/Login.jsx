import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { loginSchema } from '../validators/authValidator';
import {
  RiUserLine,
  RiLockPasswordLine,
  RiEyeLine,
  RiEyeOffLine,
  RiTimerLine,
  RiGlobeLine,
  RiShieldCheckLine,
  RiLoginBoxLine
} from 'react-icons/ri';

import ForgotPasswordModal from '../components/ForgotPasswordModal';

export const Login = () => {
  const { login, isAuthenticated, isLoading, error: authError } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [loginError, setLoginError] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
      rememberMe: false,
    }
  });

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const onSubmit = async (data) => {
    setLoginError(null);
    const result = await login(data.username, data.password);
    if (result.success) {
      if (data.rememberMe) {
        localStorage.setItem('rememberedUsername', data.username);
      } else {
        localStorage.removeItem('rememberedUsername');
      }
      navigate(from, { replace: true });
    } else {
      setLoginError(result.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-100 to-gray-50 flex flex-col items-center justify-center p-4 font-sans relative">

      {/* Brand Header */}
      <div className="text-center mb-6">
        <div className="w-10 h-10 bg-green-600 text-white p-2 rounded-md shadow-sm flex items-center justify-center mx-auto mb-3">
          <RiTimerLine className="text-white text-xl" />
        </div>
        <h1 className="font-serif text-gray-800 text-2xl font-bold tracking-tight">
          CHAMCONG APP
        </h1>
        <p className="text-xs text-gray-500 font-medium mt-1">
          Hệ thống quản lý thời gian và hiệu suất chuyên nghiệp
        </p>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-white shadow-xl border-t-4 border-green-700 rounded-md p-6 relative z-10 animate-fade-in">

        {/* Error Alert */}
        {(loginError || authError) && (
          <div className="mb-5 bg-red-50 border border-red-100 text-red-500 px-4 py-2.5 rounded-sm text-xs font-semibold flex items-center gap-2">
            <span>⚠️ {loginError || authError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Username */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <RiUserLine className="text-gray-400 text-sm" />
              <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                Tài khoản nhân viên
              </label>
            </div>
            <input
              type="text"
              {...register('username')}
              placeholder="Nhập mã nhân viên hoặc email"
              className="w-full bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:outline-none text-base font-medium placeholder-gray-400"
            />
            {errors.username && (
              <p className="text-red-500 text-[10px] font-semibold mt-0.5">{errors.username.message}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <RiLockPasswordLine className="text-gray-400 text-sm" />
                <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                  Mật khẩu bảo mật
                </label>
              </div>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                placeholder="••••••••"
                className="w-full pl-3 pr-10 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:outline-none text-base font-medium placeholder-gray-300"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                {showPassword ? <RiEyeOffLine className="text-base" /> : <RiEyeLine className="text-base" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-500 text-[10px] font-semibold mt-0.5">{errors.password.message}</p>
            )}
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none group">
              <input
                type="checkbox"
                {...register('rememberMe')}
                className="w-4 h-4 rounded-sm border-gray-300 text-green-500 focus:ring-green-500"
              />
              <span className="text-[11px] text-gray-500 font-semibold group-hover:text-gray-700 transition-colors">
                Duy trì đăng nhập trong 30 ngày
              </span>
            </label>

            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-xs text-green-600 hover:text-green-700 font-extrabold transition-colors cursor-pointer hover:underline"
            >
              Quên mật khẩu?
            </button>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              /* Thêm đoạn style={{...}} này vào để ép màu cứng */
              style={{ backgroundColor: '#22C55E', color: '#FFFFFF' }}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-md shadow-md transition-colors flex items-center justify-center gap-2 uppercase tracking-wide disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              <span>Đăng nhập</span>
              <RiLoginBoxLine className="text-base" />
            </button>
          </div>
        </form>

        {/* Card Footer (Status & Version) */}
        <div className="border-t border-gray-100 pt-4 mt-6 flex justify-center">
          {/* Box Trạng thái hệ thống (Đã căn giữa) */}
          <div className="w-1/2 bg-gray-50 p-2.5 rounded-sm flex flex-col items-center justify-center text-center">
            <span className="text-[9px] font-black text-gray-400 tracking-wider uppercase">
              Trạng thái hệ thống
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
              <span className="text-[10px] text-gray-600 font-bold">Hoạt động tốt</span>
            </div>
          </div>
        </div>
      </div>



      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <ForgotPasswordModal
          isOpen={showForgotPassword}
          onClose={() => setShowForgotPassword(false)}
        />
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-green-500 border-t-transparent mx-auto"></div>
            <p className="mt-4 text-slate-300 font-bold text-sm tracking-wider">Đang xác thực thông tin...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
