import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { RiShieldUserLine, RiLogoutBoxRLine } from 'react-icons/ri';

export const Unauthorized = () => {
  const { user, logout, isLoading } = useAuth();

  return (
    <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-red-900/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-orange-950/10 blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md glass-panel bg-slate-900/60 p-8 rounded-3xl border border-slate-800 shadow-2xl text-center relative z-10 animate-fade-in">
        <div className="mx-auto w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-6">
          <RiShieldUserLine className="text-4xl" />
        </div>

        <h1 className="text-2xl font-extrabold text-slate-100 mb-2">QUYỀN TRUY CẬP BỊ HẠN CHẾ</h1>
        <p className="text-sm text-slate-400 font-medium mb-6">
          Tài khoản của bạn ({user?.username}) có vai trò là <span className="text-amber-400 font-bold">{user?.role}</span>.
          Ứng dụng này chỉ dành riêng cho nhân viên kỹ thuật hiện trường (<span className="text-primary-400 font-bold">EMPLOYEE</span>).
        </p>
        
        <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-2xl mb-8 text-left text-xs text-slate-500 font-medium leading-relaxed">
          <p className="font-bold text-slate-400 mb-1">💡 Dành cho Quản trị viên & Quản lý:</p>
          Vui lòng sử dụng trang quản trị <span className="text-primary-400 font-bold">React Admin Dashboard</span> để thực hiện các nghiệp vụ quản lý phòng ban, địa điểm, phân công và kiểm duyệt chấm công.
        </div>

        <button
          onClick={logout}
          disabled={isLoading}
          className="w-full py-4 px-6 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl font-bold flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all shadow-md disabled:opacity-50 text-sm"
        >
          <RiLogoutBoxRLine className="text-lg" />
          <span>Đăng xuất & Đổi tài khoản</span>
        </button>
      </div>
    </div>
  );
};

export default Unauthorized;
