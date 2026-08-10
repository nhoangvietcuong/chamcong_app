import React from 'react';
import {
  RiArrowLeftLine,
  RiCloseLine,
  RiCameraLine,
  RiArrowLeftRightLine,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiAlertLine
} from 'react-icons/ri';

export const FaceAttendanceCamera = ({
  activeFlow,
  flowStep,
  flowStatusText,
  flowError,
  cameraFacing,
  toggleCamera,
  handleCapture,
  closeFlow,
  startFlow,
  videoRef,
  canvasRef
}) => {
  const isCheckIn = activeFlow === 'check-in';

  return (
    <div
      className="w-full h-full flex flex-col justify-between bg-[#0F172A] text-slate-100 font-sans select-none overflow-hidden animate-fade-in"
      style={{
        minHeight: '100dvh',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)'
      }}
    >
      {/* 1. Header Bar: ← Quay lại | Check-in khuôn mặt | ✕ */}
      <header className="flex-none px-4 py-3 bg-[#0F172A] border-b border-slate-800/80 flex items-center justify-between z-20">
        <button
          onClick={closeFlow}
          className="flex items-center gap-1 text-slate-400 hover:text-slate-200 text-xs font-semibold px-2 py-1.5 rounded-lg active:bg-slate-800 transition-colors min-w-[44px] min-h-[44px]"
        >
          <RiArrowLeftLine className="text-lg" />
          <span>Quay lại</span>
        </button>

        <h2 className="text-sm font-extrabold text-slate-100 flex items-center gap-2">
          <RiCameraLine className="text-primary-500 text-lg" />
          <span>{isCheckIn ? 'Check-in khuôn mặt' : 'Check-out khuôn mặt'}</span>
        </h2>

        <button
          onClick={closeFlow}
          className="w-10 h-10 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 flex items-center justify-center focus:outline-none transition-colors border border-slate-700/60 active:scale-95 min-w-[44px] min-h-[44px]"
          aria-label="Đóng"
        >
          <RiCloseLine className="text-xl" />
        </button>
      </header>

      {/* 2. Status Bar: Trạng thái: "Căn khuôn mặt vào vòng tròn" */}
      <div className="flex-none px-4 py-2.5 bg-slate-900/80 border-b border-slate-800/60 flex items-center justify-center gap-2 z-10">
        <div
          className={`h-2.5 w-2.5 rounded-full ${flowStep === 'success'
              ? 'bg-emerald-500'
              : flowStep === 'failed'
                ? 'bg-red-500'
                : 'bg-primary-500 animate-pulse'
            }`}
        ></div>
        <span className="text-xs font-medium text-slate-300">
          Trạng thái:{' '}
          <span className="font-bold text-slate-100">
            {flowStatusText || 'Đưa khuôn mặt vào vòng tròn'}
          </span>
        </span>
      </div>

      {/* 3. Main Camera Preview Component (Occupies ~70% screen height, flex: 1, min 60%) */}
      <main className="flex-1 w-full max-w-md mx-auto p-3 sm:p-4 flex flex-col items-center justify-center min-h-[60vh] relative">
        {/* Camera Box: Rounded 16px, border, shadow, black background */}
        <div className="relative w-full h-full rounded-2xl border border-slate-800/90 shadow-2xl bg-black overflow-hidden flex items-center justify-center">
          <video
            ref={videoRef}
            className={`w-full h-full object-cover cursor-pointer ${cameraFacing === 'user' ? 'scale-x-[-1]' : ''
              }`}
            muted
            playsInline
            webkit-playsinline="true"
            autoPlay
            onClick={() => videoRef.current?.play().catch(() => { })}
          />

          {/* Face Guide Overlay: Dark vignette + Centered Dashed Circle */}
          {(flowStep === 'camera' || flowStep === 'face' || flowStep === 'face-check' || flowStep === 'gps') && (
            <div className="absolute inset-0 bg-slate-950/35 pointer-events-none flex flex-col items-center justify-center p-4">
              {/* Dashed Face Reticle Circle */}
              <div className="relative w-56 h-56 sm:w-64 sm:h-64 rounded-full border-2 border-dashed border-primary-400 shadow-[0_0_30px_rgba(99,102,241,0.45)] flex items-center justify-center animate-pulse">
                <div className="w-full h-full rounded-full border border-primary-500/20"></div>
              </div>

              {/* Guide Pill Badge */}
              <div className="mt-4 bg-slate-900/90 border border-slate-700/80 px-4 py-1.5 rounded-full text-[11px] font-extrabold text-slate-200 shadow-lg backdrop-blur-md flex items-center gap-1.5">
                <span className="text-primary-400">⚡</span>
                <span>Căn giữa khuôn mặt vào vòng tròn</span>
              </div>
            </div>
          )}

          {/* Hidden Canvas for Frame Capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Insecure Context Warning */}
          {(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) && (
            <div className="absolute inset-0 bg-slate-950/95 p-6 flex flex-col items-center justify-center text-center space-y-4 z-30">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                <RiAlertLine className="text-2xl animate-pulse" />
              </div>
              <h3 className="text-slate-100 text-sm font-black">Yêu Cầu Kết Nối Safe / HTTPS</h3>
              <p className="text-slate-400 text-xs leading-relaxed max-w-xs">
                Trình duyệt yêu cầu kết nối HTTPS bảo mật để khởi chạy Camera. Vui lòng sử dụng đường dẫn an toàn.
              </p>
            </div>
          )}

          {/* Uploading / Processing State */}
          {(flowStep === 'biometric' || flowStep === 'uploading') && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-30 space-y-4">
              <div className="h-14 w-14 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
              <div className="space-y-1">
                <h3 className="text-slate-100 text-base font-black">{flowStatusText}</h3>
                <p className="text-slate-400 text-xs font-medium max-w-xs">
                  Hệ thống đang trích xuất đặc trưng và ghi nhận chấm công...
                </p>
              </div>
            </div>
          )}

          {/* Success Screen */}
          {flowStep === 'success' && (
            <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 text-center z-30 space-y-5">
              <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center animate-bounce">
                <RiCheckboxCircleLine className="text-5xl" />
              </div>
              <div className="space-y-1">
                <h3 className="text-slate-100 text-lg font-extrabold">
                  {activeFlow === 'check-in' ? 'Check-in Thành Công!' : 'Check-out Thành Công!'}
                </h3>
                <p className="text-slate-400 text-xs max-w-xs font-medium leading-relaxed">
                  {flowStatusText?.includes('ngoại tuyến')
                    ? flowStatusText
                    : (activeFlow === 'check-in' ? 'Bạn đã check-in thành công.' : 'Bạn đã check-out thành công.')
                  }
                </p>
              </div>
              <button
                onClick={closeFlow}
                className="px-6 py-3 bg-gradient-to-r from-primary-600 to-accent-purple text-white font-extrabold rounded-xl hover:opacity-95 transition-all shadow-lg text-xs min-w-[120px] min-h-[44px]"
              >
                Hoàn thành
              </button>
            </div>
          )}

          {/* Failed Screen */}
          {flowStep === 'failed' && (
            <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 text-center z-30 space-y-5">
              <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center">
                <RiCloseCircleLine className="text-5xl" />
              </div>
              <div className="space-y-1">
                <h3 className="text-slate-100 text-lg font-extrabold">Không thể thực hiện</h3>
                <p className="text-red-400 text-xs font-semibold leading-relaxed max-w-xs">
                  {flowError}
                </p>
              </div>
              <div className="flex gap-3 w-full max-w-xs pt-2">
                <button
                  onClick={() => startFlow(activeFlow)}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl transition-all text-xs border border-slate-700 min-h-[44px]"
                >
                  Thử lại
                </button>
                <button
                  onClick={closeFlow}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all text-xs shadow-md min-h-[44px]"
                >
                  Hủy bỏ
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* 4. Controls Bar: [ Đổi camera ]   [ ● Chụp ]   [ Hủy ] */}
      {(flowStep === 'face' || flowStep === 'gps' || flowStep === 'camera') && (
        <footer className="flex-none px-6 py-4 bg-[#0F172A] border-t border-slate-800/80 flex items-center justify-between max-w-md mx-auto w-full z-20">
          {/* Switch Camera Button */}
          <button
            onClick={toggleCamera}
            className="flex items-center justify-center gap-1.5 px-4 py-3 bg-slate-800/90 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700/70 text-xs font-bold transition-all shadow-md active:scale-95 min-w-[95px] min-h-[44px]"
            title="Đổi camera"
          >
            <RiArrowLeftRightLine className="text-base" />
            <span>Đổi camera</span>
          </button>

          {/* Center Capture Button (Primary, Pulse) */}
          <button
            onClick={handleCapture}
            className="relative w-16 h-16 rounded-full bg-primary-600 hover:bg-primary-500 flex items-center justify-center border-4 border-slate-900 shadow-xl text-white transition-all active:scale-95 animate-pulse min-w-[64px] min-h-[64px]"
            title="Chụp ảnh"
          >
            <RiCameraLine className="text-2xl" />
          </button>

          {/* Cancel Button */}
          <button
            onClick={closeFlow}
            className="flex items-center justify-center px-5 py-3 bg-slate-800/90 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700/70 text-xs font-bold transition-all shadow-md active:scale-95 min-w-[80px] min-h-[44px]"
          >
            Hủy
          </button>
        </footer>
      )}
    </div>
  );
};

export default FaceAttendanceCamera;
