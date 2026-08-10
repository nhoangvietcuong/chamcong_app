import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  RiArrowLeftLine,
  RiCloseLine,
  RiCameraLine,
  RiArrowLeftRightLine,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiAlertLine,
  RiRefreshLine,
  RiCheckLine
} from 'react-icons/ri';

class CameraErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('CameraErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[99999] bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white space-y-4 font-sans pointer-events-auto">
          <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center text-3xl font-bold">
            ⚠️
          </div>
          <h3 className="text-lg font-bold">Không thể hiển thị màn hình Camera</h3>
          <p className="text-xs text-red-400 max-w-xs font-mono bg-slate-900 p-3 rounded-xl border border-slate-800 break-words text-left">
            {this.state.error?.toString() || 'Lỗi không xác định'}
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              if (this.props.closeFlow) this.props.closeFlow();
            }}
            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold rounded-xl border border-slate-700 cursor-pointer"
          >
            Quay lại
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const AttendanceCameraPageInner = ({
  activeFlow,
  flowStep,
  flowStatusText,
  flowError,
  cameraFacing,
  capturedPhoto,
  toggleCamera,
  handleCapture,
  handleVerifyFace,
  handleCaptureEvidence,
  handleRetakeEvidence,
  handleConfirmAttendance,
  closeFlow,
  startFlow,
  videoRef,
  canvasRef,
  faceOverlayState = 'IDLE',
  checkInResult = null,
  showFaceFailModal = false,
  faceFailModalData = null,
  onConfirmFailModal = null
}) => {
  const isCheckIn = activeFlow === 'check-in';
  const onMainCapture = handleVerifyFace || handleCapture;

  const getSilhouetteStrokeColor = () => {
    switch (faceOverlayState) {
      case 'READY':
        return '#10B981'; // Xanh lá
      case 'ADJUST':
        return '#FACC15'; // Vàng
      case 'ERROR':
      case 'MULTIPLE':
        return '#EF4444'; // Đỏ
      case 'IDLE':
      default:
        return '#9CA3AF'; // Xám
    }
  };

  // Prevent background scroll when camera page is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';

    const handlePopState = () => {
      if (closeFlow) closeFlow();
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('popstate', handlePopState);
    };
  }, [closeFlow]);

  const portalContent = (
    <div
      className="fixed inset-0 z-[99999] bg-black text-slate-100 flex flex-col justify-between font-sans overflow-hidden select-none animate-fade-in pointer-events-none"
      style={{
        height: '100dvh',
        width: '100vw',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)'
      }}
    >
      {/* Layer 1 (z-0): Background Camera Video Stream */}
      <div
        className="absolute inset-0 z-0 bg-black overflow-hidden w-full h-full pointer-events-none"
        style={{ transform: 'translateZ(0px)', WebkitTransform: 'translateZ(0px)' }}
      >
        <video
          ref={videoRef}
          className={`w-full h-full object-cover pointer-events-none ${cameraFacing === 'user' ? 'scale-x-[-1]' : ''
            }`}
          muted
          playsInline
          webkit-playsinline="true"
          autoPlay
        />
        {/* Hidden processing canvas */}
        <canvas ref={canvasRef} className="hidden pointer-events-none" />
      </div>

      {/* Layer 1.5 (z-30): Captured Evidence Photo Preview */}
      {flowStep === 'evidence_preview' && capturedPhoto && (
        <div
          className="absolute inset-0 z-30 bg-slate-950 flex items-center justify-center p-3 pointer-events-auto"
          style={{ transform: 'translateZ(20px)', WebkitTransform: 'translateZ(20px)' }}
        >
          <img
            src={capturedPhoto}
            alt="Ảnh xác thực hiện trường"
            className="w-full h-full object-contain rounded-2xl border border-slate-800"
          />
        </div>
      )}

      {/* Layer 1.2 (z-20): Temporary photo freeze during camera switch */}
      {flowStep === 'evidence_capture' && flowStatusText && flowStatusText.includes('Đang chuyển sang camera trước') && capturedPhoto && (
        <div
          className="absolute inset-0 z-20 bg-slate-950 flex items-center justify-center pointer-events-none"
          style={{ transform: 'translateZ(15px)', WebkitTransform: 'translateZ(15px)' }}
        >
          <img
            src={capturedPhoto}
            alt="Ảnh xác thực vị trí"
            className="w-full h-full object-cover opacity-80"
          />
        </div>
      )}

      {/* Layer 2 (z-10): Oval Face Guide SVG Cutout Overlay & Outline */}
      {(flowStep === 'face' || flowStep === 'gps' || flowStep === 'camera' || flowStep === 'verifying_face') && (
        <svg
          className="absolute inset-0 z-10 w-full h-full pointer-events-none"
          style={{ transform: 'translateZ(10px)', WebkitTransform: 'translateZ(10px)' }}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 400 500"
          preserveAspectRatio="xMidYMid slice"
        >
          {/* Semi-transparent dark background outside of the oval cutout using evenodd (No SVG Mask ID required) */}
          <path
            fill="rgba(15, 23, 42, 0.72)"
            fillRule="evenodd"
            d="M 0,0 H 400 V 500 H 0 Z M 200,60 C 260.75,60 310,127.16 310,210 C 310,292.84 260.75,360 200,360 C 139.25,360 90,292.84 90,210 C 90,127.16 139.25,60 200,60 Z"
            className="pointer-events-none"
          />

          {/* Oval Face Guide outline ellipse */}
          <ellipse
            cx="200"
            cy="210"
            rx="110"
            ry="150"
            fill="none"
            stroke={getSilhouetteStrokeColor()}
            strokeWidth="4"
            className="transition-all duration-300 pointer-events-none"
          />
        </svg>
      )}

      {/* Layer 4 (z-50): Top Header Bar */}
      <header className="relative z-50 flex-none px-4 py-3 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/60 flex items-center justify-between pointer-events-auto">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            closeFlow();
          }}
          className="flex items-center gap-1.5 text-slate-300 hover:text-white text-xs font-bold px-3 py-2 rounded-xl bg-slate-800/80 active:bg-slate-700 transition-all min-w-[44px] min-h-[44px] pointer-events-auto touch-manipulation cursor-pointer"
        >
          <RiArrowLeftLine className="text-lg" />
          <span>Quay lại</span>
        </button>

        <h2 className="text-sm font-extrabold text-slate-100 flex items-center gap-2 pointer-events-none">
          <RiCameraLine className="text-[#22C55E] text-lg" />
          <span>
            {flowStep === 'evidence_capture' || flowStep === 'evidence_preview'
              ? 'Ảnh xác thực hiện trường'
              : activeFlow === 'ot-check-in'
                ? 'Check-in Tăng ca khuôn mặt'
                : activeFlow === 'ot-check-out'
                  ? 'Check-out Tăng ca khuôn mặt'
                  : activeFlow === 'check-in'
                    ? 'Check-in khuôn mặt'
                    : 'Check-out khuôn mặt'}
          </span>
        </h2>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            closeFlow();
          }}
          className="w-11 h-11 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 flex items-center justify-center focus:outline-none transition-colors border border-slate-700/60 active:scale-95 min-w-[44px] min-h-[44px] pointer-events-auto touch-manipulation cursor-pointer"
          aria-label="Đóng"
        >
          <RiCloseLine className="text-xl" />
        </button>
      </header>

      {/* Layer 5 (z-50): Status Badge Bar */}
      <div className="relative z-50 flex-none py-3 px-4 flex items-center justify-center pointer-events-none">
        <div className="bg-slate-900/90 border border-slate-700/80 backdrop-blur-md px-5 py-2 rounded-full shadow-xl flex items-center gap-2 pointer-events-none max-w-xs text-center">
          <div
            className={`h-2.5 w-2.5 rounded-full shrink-0 ${flowStep === 'success'
              ? 'bg-green-500'
              : flowStep === 'failed'
                ? 'bg-[#EF4444]'
                : flowStep === 'evidence_capture' || flowStep === 'evidence_preview'
                  ? 'bg-green-500 animate-pulse'
                  : 'bg-[#FACC15] animate-pulse'
              }`}
          ></div>
          <span className="text-xs font-bold text-slate-200 pointer-events-none truncate">
            {flowStep === 'success'
              ? '🟢 Chấm công thành công'
              : flowStep === 'failed'
                ? '🔴 Thất bại'
                : flowStep === 'evidence_capture'
                  ? '📸 Chụp ảnh xác thực vị trí'
                  : flowStep === 'evidence_preview'
                    ? '🔍 Xem lại ảnh xác thực hiện trường'
                    : `🟡 ${flowStatusText || 'Đặt khuôn mặt vào khung'}`}
          </span>
        </div>
      </div>

      {/* Flexible Spacer */}
      <div className="flex-1 pointer-events-none"></div>

      {/* Layer 6 (z-50): Modal Overlays */}
      {(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) && (
        <div className="absolute inset-0 bg-slate-950/95 p-6 flex flex-col items-center justify-center text-center space-y-4 z-50 pointer-events-auto">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
            <RiAlertLine className="text-2xl animate-pulse" />
          </div>
          <h3 className="text-slate-100 text-sm font-black">Yêu Cầu Kết Nối Safe / HTTPS</h3>
          <p className="text-slate-400 text-xs leading-relaxed max-w-xs">
            Trình duyệt yêu cầu kết nối HTTPS bảo mật để bật Camera. Vui lòng sử dụng đường dẫn an toàn.
          </p>
        </div>
      )}

      {(flowStep === 'verifying_face' || flowStep === 'biometric' || flowStep === 'uploading') && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-50 space-y-4 pointer-events-auto">
          <div className="h-14 w-14 animate-spin rounded-full border-4 border-[#22C55E] border-t-transparent"></div>
          <div className="space-y-1">
            <h3 className="text-slate-100 text-base font-black">{flowStatusText}</h3>
            <p className="text-slate-400 text-xs font-medium max-w-xs">
              {flowStep === 'verifying_face'
                ? 'Đang xác thực thông tin khuôn mặt với hệ thống...'
                : 'Đang xử lý gói tin và tạo bản ghi chấm công...'}
            </p>
          </div>
        </div>
      )}

      {flowStep === 'success' && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-50 pointer-events-auto animate-fade-in">
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl w-full max-w-[310px] p-6 text-center shadow-2xl flex flex-col items-center gap-3.5 border border-slate-100 animate-scale-up"
            style={{ transform: 'translateY(-50px)' }}
          >
            {/* Soft Green Outer Circle + Solid Dark Green Inner Circle with Checkmark */}
            <div className="w-16 h-16 rounded-full bg-[#E6F4EA] flex items-center justify-center mb-1">
              <div className="w-10 h-10 rounded-full bg-[#006837] flex items-center justify-center text-white text-xl font-black shadow-sm">
                ✓
              </div>
            </div>

            {/* Title & Message */}
            <h3 className="text-xl font-bold text-slate-900 leading-tight">
              Thành công!
            </h3>
            <p className="text-xs text-slate-600 font-semibold leading-relaxed max-w-[240px]">
              {flowStatusText || 'Đã ghi nhận Chấm công ngoại tuyến!'}
            </p>

            {activeFlow === 'check-in' && checkInResult && (() => {
              const allowedL = checkInResult.allowedLocations || [];
              const hasMultipleAssigned = allowedL.length > 1;
              const isAssigned = hasMultipleAssigned
                ? allowedL.some(l => l.locationId === checkInResult.actualCheckInLocation?.locationId)
                : (checkInResult.assignedLocation?.locationId === checkInResult.actualCheckInLocation?.locationId);

              return (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-left space-y-1.5 w-full my-1 text-[11px]">
                  {!hasMultipleAssigned && isAssigned ? (
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Địa điểm</span>
                      <span className="font-bold text-emerald-700 block">{checkInResult.actualCheckInLocation?.locationName}</span>
                    </div>
                  ) : (
                    <>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Địa điểm phân công</span>
                        <span className="font-semibold text-slate-600 block">
                          {hasMultipleAssigned
                            ? allowedL.map(l => l.locationName || l.location_name).join(' / ')
                            : checkInResult.assignedLocation?.locationName}
                        </span>
                      </div>
                      <div className="border-t border-slate-200 pt-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Địa điểm Check-in</span>
                        <span className="font-bold text-emerald-700 block">
                          {checkInResult.actualCheckInLocation?.locationName}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              );
            })()}

            {/* Action Button */}
            <button
              type="button"
              onClick={closeFlow}
              className="w-full py-3.5 font-bold text-sm tracking-wider uppercase rounded-xl transition-all shadow-md cursor-pointer mt-1 active:scale-95 border-0"
              style={{ backgroundColor: '#006837', color: '#FFFFFF' }}
            >
              ĐÓNG
            </button>
          </div>
        </div>
      )}

      {flowStep === 'failed' && (
        <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-50 space-y-5 pointer-events-auto">
          <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center">
            <RiCloseCircleLine className="text-5xl" />
          </div>
          <div className="space-y-1">
            <h3 className="text-slate-100 text-lg font-extrabold">Giao Dịch Thất Bại</h3>
            <p className="text-red-400 text-xs font-semibold leading-relaxed max-w-xs">
              {flowError}
            </p>
          </div>
          <div className="flex gap-3 w-full max-w-xs pt-2">
            <button
              type="button"
              onClick={() => startFlow(activeFlow)}
              className="flex-1 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-[14px] transition-all text-xs border border-slate-700 min-h-[44px] pointer-events-auto touch-manipulation cursor-pointer"
            >
              Thử lại
            </button>
            <button
              type="button"
              onClick={closeFlow}
              className="flex-1 py-3.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-[14px] transition-all text-xs shadow-md min-h-[44px] pointer-events-auto touch-manipulation cursor-pointer"
            >
              Hủy bỏ
            </button>
          </div>
        </div>
      )}

      {/* Liveness Guides Overlay */}
      {flowStep === 'face' && (
        <div
          className="absolute left-0 right-0 z-[9999] w-full max-w-xs mx-auto px-4 pointer-events-none flex flex-col items-center space-y-2.5"
          style={{
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 185px)'
          }}
        >
          {/* Progress Indicator */}
          {(faceOverlayState === 'READY' || faceOverlayState === 'ADJUST') && (
            <div className="w-full bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-full h-2 overflow-hidden shadow-inner">
              <div
                className={`h-full transition-all duration-500 rounded-full ${faceOverlayState === 'READY' ? 'bg-[#22C55E] w-full animate-pulse' : 'bg-[#FACC15] w-[45%]'
                  }`}
              ></div>
            </div>
          )}


        </div>
      )}

      {/* Step 1: Main Control Panel (Face Scan) */}
      {(flowStep === 'face' || flowStep === 'gps' || flowStep === 'camera' || flowStep === 'verifying_face') && (
        <footer
          className="camera-controls fixed left-0 right-0 z-[9999] w-full max-w-md mx-auto px-6 grid grid-cols-3 items-end pointer-events-auto"
          style={{
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 25px)'
          }}
        >
          {/* Left Slot: Switch Camera Button */}
          <div className="flex flex-col items-center justify-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleCamera();
              }}
              className="w-[50px] h-[50px] rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-white/20 shadow-2xl flex items-center justify-center transition-all active:scale-90 backdrop-blur-xl pointer-events-auto touch-manipulation cursor-pointer shrink-0"
              title="Đổi camera"
            >
              <RiArrowLeftRightLine className="text-xl text-emerald-400" />
            </button>
            <span className="text-[10px] font-bold text-slate-300 mt-1.5 tracking-tight pointer-events-none drop-shadow">Đổi camera</span>
          </div>

          {/* Center Slot: Double-Ring Shutter Button (Dead Center at 50%) */}
          <div className="flex items-center justify-center">
            <div className="w-[74px] h-[74px] rounded-full border-2 border-white/30 p-1 flex items-center justify-center shadow-2xl shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onMainCapture) onMainCapture();
                }}
                className="w-full h-full rounded-full bg-[#22C55E] hover:bg-green-600 active:bg-green-700 flex items-center justify-center text-white shadow-[0_0_20px_rgba(34,197,94,0.5)] active:scale-90 transition-transform pointer-events-auto touch-manipulation cursor-pointer"
                title="Chụp ảnh"
              >
                <RiCameraLine className="text-2xl" />
              </button>
            </div>
          </div>

          {/* Right Slot: Cancel Button */}
          <div className="flex flex-col items-center justify-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                closeFlow();
              }}
              className="w-[50px] h-[50px] rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-white/20 shadow-2xl flex items-center justify-center transition-all active:scale-90 backdrop-blur-xl pointer-events-auto touch-manipulation cursor-pointer shrink-0"
              title="Hủy"
            >
              <RiCloseLine className="text-2xl text-rose-400" />
            </button>
            <span className="text-[10px] font-bold text-slate-300 mt-1.5 tracking-tight pointer-events-none drop-shadow">Hủy</span>
          </div>
        </footer>
      )}

      {/* Step 2: Evidence Capture Control Panel */}
      {flowStep === 'evidence_capture' && (
        <footer
          className="camera-controls fixed left-0 right-0 z-[9999] w-full max-w-md mx-auto px-6 grid grid-cols-3 items-end pointer-events-auto"
          style={{
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 25px)'
          }}
        >
          {/* Left Slot: Switch Camera Button */}
          <div className="flex flex-col items-center justify-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleCamera();
              }}
              className="w-[50px] h-[50px] rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-white/20 shadow-2xl flex items-center justify-center transition-all active:scale-90 backdrop-blur-xl pointer-events-auto touch-manipulation cursor-pointer shrink-0"
              title="Đổi camera"
            >
              <RiArrowLeftRightLine className="text-xl text-emerald-400" />
            </button>
            <span className="text-[10px] font-bold text-slate-300 mt-1.5 tracking-tight pointer-events-none drop-shadow">Đổi camera</span>
          </div>

          {/* Center Slot: Double-Ring Shutter Button (Dead Center at 50%) */}
          <div className="flex items-center justify-center">
            <div className="w-[74px] h-[74px] rounded-full border-2 border-white/30 p-1 flex items-center justify-center shadow-2xl shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (handleCaptureEvidence) handleCaptureEvidence();
                }}
                className="w-full h-full rounded-full bg-[#22C55E] hover:bg-green-600 active:bg-green-700 flex items-center justify-center text-white shadow-[0_0_20px_rgba(34,197,94,0.5)] active:scale-90 transition-transform pointer-events-auto touch-manipulation cursor-pointer"
                title="Chụp ảnh hiện trường"
              >
                <RiCameraLine className="text-2xl" />
              </button>
            </div>
          </div>

          {/* Right Slot: Cancel Button */}
          <div className="flex flex-col items-center justify-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                closeFlow();
              }}
              className="w-[50px] h-[50px] rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-white/20 shadow-2xl flex items-center justify-center transition-all active:scale-90 backdrop-blur-xl pointer-events-auto touch-manipulation cursor-pointer shrink-0"
              title="Hủy"
            >
              <RiCloseLine className="text-2xl text-rose-400" />
            </button>
            <span className="text-[10px] font-bold text-slate-300 mt-1.5 tracking-tight pointer-events-none drop-shadow">Hủy</span>
          </div>
        </footer>
      )}

      {/* Step 2 Preview: Evidence Preview Control Panel */}
      {flowStep === 'evidence_preview' && (
        <footer
          className="camera-controls fixed left-0 right-0 z-[9999] w-full max-w-md mx-auto px-5 flex items-center justify-between gap-3 pointer-events-auto"
          style={{
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 90px)'
          }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (handleRetakeEvidence) handleRetakeEvidence();
            }}
            className="flex items-center justify-center gap-1.5 px-4 py-3 bg-slate-800/95 hover:bg-slate-700 text-slate-200 rounded-2xl border border-slate-700/80 text-xs font-bold transition-all shadow-xl active:scale-95 min-h-[44px] pointer-events-auto touch-manipulation cursor-pointer shrink-0 backdrop-blur-md"
            title="Chụp lại"
          >
            <RiRefreshLine className="text-base text-amber-400" />
            <span>Chụp lại</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (handleConfirmAttendance) handleConfirmAttendance();
            }}
            className="flex-1 py-3.5 bg-green-500 hover:bg-green-600 text-white font-extrabold rounded-[14px] shadow-[0_10px_25px_rgba(34,197,94,0.25)] text-xs flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] min-h-[44px] pointer-events-auto touch-manipulation cursor-pointer"
            style={{ backgroundColor: '#22C55E' }}
            title="Xác nhận"
          >
            <RiCheckLine className="text-lg" />
            <span>Xác nhận</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              closeFlow();
            }}
            className="flex items-center justify-center gap-1.5 px-4 py-3 bg-slate-800/95 hover:bg-slate-700 text-slate-200 rounded-2xl border border-slate-700/80 text-xs font-bold transition-all shadow-xl active:scale-95 min-h-[44px] pointer-events-auto touch-manipulation cursor-pointer shrink-0 backdrop-blur-md"
            title="Hủy"
          >
            <RiCloseLine className="text-lg text-red-400" />
            <span>Hủy</span>
          </button>
        </footer>
      )}

      {/* Modal Cảnh báo Quét mặt Thất bại (Lần 1 / Lần 2) bên trong Camera Portal */}
      {showFaceFailModal && (
        <div
          className="pointer-events-auto"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100000,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            backdropFilter: 'blur(6px)',
            pointerEvents: 'auto'
          }}
        >
          <div
            className="pointer-events-auto"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '24px',
              maxWidth: '380px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              textAlign: 'center',
              pointerEvents: 'auto'
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: faceFailModalData?.isFinal ? '#FEF2F2' : '#FFFBEB',
                color: faceFailModalData?.isFinal ? '#DC2626' : '#D97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
                fontSize: '28px'
              }}
            >
              {faceFailModalData?.isFinal ? '❌' : '⚠️'}
            </div>

            <h3
              style={{
                fontSize: '17px',
                fontWeight: '700',
                color: '#111827',
                marginBottom: '8px'
              }}
            >
              {faceFailModalData?.title}
            </h3>

            <p
              style={{
                fontSize: '13px',
                color: '#4B5563',
                lineHeight: '1.5',
                marginBottom: '20px'
              }}
            >
              {faceFailModalData?.message}
            </p>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onConfirmFailModal) onConfirmFailModal();
              }}
              style={{
                backgroundColor: faceFailModalData?.isFinal ? '#DC2626' : '#046A38',
                color: '#ffffff',
                paddingTop: '12px',
                paddingBottom: '12px',
                borderRadius: '16px',
                fontSize: '13px',
                fontWeight: '700',
                width: '100%',
                textAlign: 'center',
                display: 'block',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            >
              {faceFailModalData?.buttonText}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // Render directly into document.body using React Portal
  return createPortal(portalContent, document.body);
};

export const AttendanceCameraPage = (props) => (
  <CameraErrorBoundary closeFlow={props.closeFlow}>
    <AttendanceCameraPageInner {...props} />
  </CameraErrorBoundary>
);

export default AttendanceCameraPage;
