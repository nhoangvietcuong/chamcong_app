import React, { useRef, useState, useEffect } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision';
import { FacePoseAssessor, CONFIG } from '../utils/faceRecognition';
import {
  RiCameraLine,
  RiCheckLine,
  RiAlertLine,
  RiCloseLine,
  RiInformationLine
} from 'react-icons/ri';

const STEPS = [
  { id: 'STRAIGHT', text: 'Nhìn thẳng vào camera', desc: 'Giữ khuôn mặt ngay ngắn và căn giữa khung hình.', pose: 'STRAIGHT', lighting: 'NORMAL' },
  { id: 'LEFT', text: 'Quay đầu nhẹ sang trái (~20°)', desc: 'Xoay đầu từ từ sang phía bên trái của bạn.', pose: 'LEFT', lighting: 'NORMAL' },
  { id: 'RIGHT', text: 'Quay đầu nhẹ sang phải (~20°)', desc: 'Xoay đầu từ từ sang phía bên phải của bạn.', pose: 'RIGHT', lighting: 'NORMAL' },
  { id: 'DOWN', text: 'Cúi nhẹ đầu xuống dưới', desc: 'Hơi nghiêng mặt xuống dưới góc camera.', pose: 'DOWN', lighting: 'NORMAL' },
  { id: 'UP', text: 'Ngẩng nhẹ đầu lên trên', desc: 'Hơi hướng mặt lên trên góc camera.', pose: 'UP', lighting: 'NORMAL' },
  { id: 'GLASSES', text: 'Chụp với kính (nếu có)', desc: 'Đeo kính hoặc phụ kiện thường dùng, hoặc bấm bỏ qua nếu không đeo.', pose: 'GLASSES', lighting: 'NORMAL' }
];

export const FaceRegisterPage = ({ onComplete, onClose }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const requestRef = useRef(null);

  const [isInitializing, setIsInitializing] = useState(true);
  const [initStatus, setInitStatus] = useState('Đang nạp các mô hình nhận diện (AI)...');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [capturedEmbeddings, setCapturedEmbeddings] = useState([]);
  const [poseFeedback, setPoseFeedback] = useState('Đang tìm khuôn mặt...');
  const [isFaceOk, setIsFaceOk] = useState(false);
  const [captureDelay, setCaptureDelay] = useState(false);

  // References for loaders
  const faceLandmarkerRef = useRef(null);

  useEffect(() => {
    let activeStream = null;

    async function init() {
      try {
        // 1. Khởi động camera stream
        setInitStatus('Đang kết nối Camera...');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
        });
        activeStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => videoRef.current.play();
        }

        // 2. Load face-api.js models (WebGL)
        setInitStatus('Nạp mô hình face-api...');
        await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models');

        // 3. Load MediaPipe Face Landmarker (WebAssembly)
        setInitStatus('Khởi tạo bộ đo Pose MediaPipe...');
        const filesetResolver = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
        );
        const landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU'
          },
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: true,
          runningMode: 'VIDEO',
          numFaces: 1
        });
        faceLandmarkerRef.current = landmarker;

        setIsInitializing(false);
      } catch (err) {
        console.error('Registration init error:', err);
        setInitStatus('Lỗi khởi tạo: ' + err.message);
      }
    }

    init();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(t => t.stop());
      }
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  // Frame processing loop
  useEffect(() => {
    let active = true;
    let lastProcessingTime = 0;

    const processFrame = async () => {
      if (!active) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const landmarker = faceLandmarkerRef.current;

      // Skip frames if assets or stream are not ready
      if (!video || !canvas || !landmarker || video.paused || video.ended || video.videoWidth === 0 || video.videoHeight === 0) {
        requestRef.current = requestAnimationFrame(processFrame);
        return;
      }

      try {
        const timestamp = performance.now();
        if (timestamp - lastProcessingTime < 70) {
          requestRef.current = requestAnimationFrame(processFrame);
          return;
        }
        lastProcessingTime = timestamp;

        const results = landmarker.detectForVideo(video, timestamp);
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        if (results && results.facialTransformationMatrixes?.length > 0) {
          const qualityCheck = FacePoseAssessor.analyze(canvas, results);
          
          if (!qualityCheck.passed) {
            setPoseFeedback(qualityCheck.reason);
            setIsFaceOk(false);
          } else {
            const { yaw, pitch, isSmiling, currentYawPose, currentPitchPose } = qualityCheck.pose;
            const currentStep = STEPS[currentStepIndex];

            let isTargetMatched = false;
            let feedback = '';

            if (currentStep.id === 'STRAIGHT') {
              if (currentYawPose === 'STRAIGHT' && currentPitchPose === 'LEVEL') {
                isTargetMatched = true;
                feedback = 'Tư thế nhìn thẳng tốt!';
              } else {
                feedback = 'Vui lòng nhìn thẳng và giữ đầu thẳng.';
              }
            } else if (currentStep.id === 'LEFT') {
              if (currentYawPose === 'LEFT') {
                isTargetMatched = true;
                feedback = `Đã quay trái (${Math.abs(yaw).toFixed(0)}°). Đạt yêu cầu!`;
              } else {
                feedback = 'Vui lòng quay đầu nhẹ sang trái.';
              }
            } else if (currentStep.id === 'RIGHT') {
              if (currentYawPose === 'RIGHT') {
                isTargetMatched = true;
                feedback = `Đã quay phải (${Math.abs(yaw).toFixed(0)}°). Đạt yêu cầu!`;
              } else {
                feedback = 'Vui lòng quay đầu nhẹ sang phải.';
              }
            } else if (currentStep.id === 'DOWN') {
              if (currentPitchPose === 'DOWN') {
                isTargetMatched = true;
                feedback = `Đã cúi đầu (${Math.abs(pitch).toFixed(0)}°). Đạt yêu cầu!`;
              } else {
                feedback = 'Vui lòng cúi nhẹ đầu.';
              }
            } else if (currentStep.id === 'UP') {
              if (currentPitchPose === 'UP') {
                isTargetMatched = true;
                feedback = `Đã ngẩng đầu (${Math.abs(pitch).toFixed(0)}°). Đạt yêu cầu!`;
              } else {
                feedback = 'Vui lòng ngẩng nhẹ đầu.';
              }
            } else if (currentStep.id === 'SMILE') {
              if (isSmiling) {
                isTargetMatched = true;
                feedback = 'Nụ cười rất tốt!';
              } else {
                feedback = 'Hãy mỉm cười nhẹ trước camera.';
              }
            } else if (currentStep.id === 'GLASSES') {
              isTargetMatched = true;
              feedback = 'Bấm "Chụp ảnh kính" hoặc bấm "Bỏ qua".';
            }

            setPoseFeedback(feedback);
            setIsFaceOk(isTargetMatched);

            if (isTargetMatched && !captureDelay && currentStep.id !== 'GLASSES') {
              setCaptureDelay(true);
              setTimeout(() => {
                handleTriggerCapture(canvas, currentStep, qualityCheck.qualityScore);
              }, 300);
            }
          }
        } else {
          setPoseFeedback('Không tìm thấy khuôn mặt trong khung hình.');
          setIsFaceOk(false);
        }
      } catch (err) {
        console.error('[FaceRegisterPage] Frame processing error:', err);
      }

      requestRef.current = requestAnimationFrame(processFrame);
    };

    requestRef.current = requestAnimationFrame(processFrame);
    return () => cancelAnimationFrame(requestRef.current);
  }, [isInitializing, currentStepIndex, captureDelay]);

  // Capture action
  const handleTriggerCapture = async (canvas, currentStep, qualityScore) => {
    // 1. Dựng ảnh và chạy face-api để tính embedding
    const detection = await faceapi
      .detectSingleFace(canvas, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      setCaptureDelay(false);
      return;
    }

    const newEmbedding = {
      embedding: Array.from(detection.descriptor),
      pose: currentStep.pose,
      lighting: 'NORMAL',
      quality: qualityScore
    };

    const updated = [...capturedEmbeddings, newEmbedding];
    setCapturedEmbeddings(updated);

    // 2. Chuyển bước tiếp theo
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
      setTimeout(() => setCaptureDelay(false), 1500); // Trì hoãn 1.5s trước khi bắt đầu step mới
    } else {
      // Đăng ký thành công
      onComplete(updated);
    }
  };

  const handleSkipGlasses = () => {
    // Hoàn thành không cần ảnh kính
    onComplete(capturedEmbeddings);
  };

  const handleManualCaptureGlasses = () => {
    if (!canvasRef.current || !isFaceOk) return;
    handleTriggerCapture(canvasRef.current, STEPS[currentStepIndex], 0.9);
  };

  const currentStep = STEPS[currentStepIndex];

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950 text-slate-100 flex flex-col justify-between font-sans select-none overflow-hidden" style={{ height: '100dvh', width: '100vw' }}>
      {isInitializing && (
        <div className="absolute inset-0 z-[10000] bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-slate-100 font-sans">
          <div className="h-14 w-14 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent mb-4"></div>
          <h3 className="text-base font-extrabold">Khởi tạo quy trình eKYC</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">{initStatus}</p>
          <button
            onClick={onClose}
            className="mt-6 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl transition-all border border-slate-700 active:scale-95 cursor-pointer"
          >
            Hủy bỏ
          </button>
        </div>
      )}
      {/* Header */}
      <header className="px-4 py-3 bg-slate-900 border-b border-slate-800/80 flex items-center justify-between flex-none">
        <div className="flex items-center gap-2">
          <RiCameraLine className="text-emerald-500 text-lg" />
          <span className="text-sm font-extrabold">Đăng ký khuôn mặt eKYC</span>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center hover:bg-slate-700 active:scale-95 transition-all"
        >
          <RiCloseLine className="text-lg" />
        </button>
      </header>

      {/* Guide Banner */}
      <div className="bg-slate-900/60 p-4 border-b border-slate-800/40 text-center flex-none">
        <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
          Bước {currentStepIndex + 1} / {STEPS.length}
        </span>
        <h3 className="text-sm font-black mt-2 text-slate-100">{currentStep.text}</h3>
        <p className="text-xs text-slate-400 mt-0.5">{currentStep.desc}</p>
      </div>

      {/* Camera Panel */}
      <main className="flex-1 flex items-center justify-center p-4 relative bg-black">
        <div className="relative w-[300px] h-[380px] sm:w-[320px] sm:h-[400px] rounded-2xl overflow-hidden border-2 border-slate-800 bg-slate-900 flex items-center justify-center">
          <video
            ref={videoRef}
            muted
            playsInline
            webkit-playsinline="true"
            autoPlay
            className="w-full h-full object-cover scale-x-[-1]"
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* SVG Oval Face Guide Overlay & Outline */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 320 400"
            preserveAspectRatio="xMidYMid slice"
          >
            <path
              fill="rgba(15, 23, 42, 0.65)"
              fillRule="evenodd"
              d="M 0,0 H 320 V 400 H 0 Z M 160,48 C 208.6,48 248,101.73 248,168 C 248,234.27 208.6,288 160,288 C 111.4,288 72,234.27 72,168 C 72,101.73 111.4,48 160,48 Z"
              className="pointer-events-none"
            />
            <ellipse
              cx="160"
              cy="168"
              rx="88"
              ry="120"
              fill="none"
              stroke={isFaceOk ? '#10B981' : '#9CA3AF'}
              strokeWidth="4"
              className="transition-all duration-300 pointer-events-none"
            />
          </svg>
        </div>

        {/* Real-time pose matching feedback overlay */}
        <div className="absolute bottom-4 left-4 right-4 text-center">
          <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-900/90 border border-slate-800 backdrop-blur-md shadow-lg max-w-xs mx-auto">
            <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${isFaceOk ? 'bg-emerald-500' : 'bg-yellow-500 animate-pulse'}`} />
            <span className="text-xs font-bold text-slate-200 truncate">{poseFeedback}</span>
          </div>
        </div>
      </main>

      {/* Footer controls */}
      <footer className="p-4 bg-slate-900 border-t border-slate-800/80 flex flex-col items-center gap-3 flex-none">
        {currentStep.id === 'GLASSES' ? (
          <div className="flex gap-3 w-full max-w-xs">
            <button
              onClick={handleSkipGlasses}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl transition-all text-xs border border-slate-700"
            >
              Bỏ qua bước này
            </button>
            <button
              onClick={handleManualCaptureGlasses}
              disabled={!isFaceOk}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold rounded-xl transition-all text-xs flex items-center justify-center gap-1.5 shadow-lg active:scale-95"
            >
              <RiCheckLine /> Chụp ảnh kính
            </button>
          </div>
        ) : (
          <div className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
            <RiInformationLine className="text-yellow-500 text-sm" />
            <span>Hệ thống tự động chụp khi bạn hoàn thành đúng tư thế.</span>
          </div>
        )}

        {/* Steps dots progress indicator */}
        <div className="flex gap-1.5 mt-1">
          {STEPS.map((step, idx) => (
            <div
              key={step.id}
              className={`h-2 w-2 rounded-full transition-all duration-300 ${
                idx === currentStepIndex
                  ? 'bg-emerald-500 w-4'
                  : idx < currentStepIndex
                  ? 'bg-emerald-500/50'
                  : 'bg-slate-700'
              }`}
            />
          ))}
        </div>
      </footer>
    </div>
  );
};

export default FaceRegisterPage;
