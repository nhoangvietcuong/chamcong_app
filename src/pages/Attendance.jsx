import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAttendance } from '../hooks/useAttendance';
import { useOffline } from '../hooks/useOffline';
import { useNotification } from '../hooks/useNotification';
import { useAssignment } from '../hooks/useAssignment';
import { useAuth } from '../hooks/useAuth';
import { useFaceProfile } from '../hooks/useFaceProfile';
import { useFaceProfileStore } from '../store/faceProfileStore';
import apiClient, { getDeviceFingerprint } from '../api/apiClient';
import { FaceBiometricsManager } from '../utils/faceBiometrics';
import { computeEmbeddingFromBlob, preloadFaceModels } from '../utils/faceRecognition';
import { addToOfflineQueue, getAllQueueItems } from '../indexeddb/db';
import * as faceapi from '@vladmandic/face-api';
import dayjs from 'dayjs';
import faceProfileService from '../services/faceProfileService';
import { getProtectedImageUrl, compressImageFile } from '../utils/imageUtils';
import {
  RiCameraLine,
  RiMapPinLine,
  RiHistoryLine,
  RiSearchLine,
  RiFilter3Line,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiAlertLine,
  RiTimeLine,
  RiCompassLine,
  RiUser3Line,
  RiArrowLeftRightLine,
  RiShieldCheckLine,
  RiRefreshLine,
  RiCloseLine,
  RiRadarLine
} from 'react-icons/ri';

import AttendanceCameraPage from './AttendanceCameraPage';
import Dashboard from './Dashboard';

const faceBiometrics = FaceBiometricsManager.getInstance();

export const Attendance = () => {
  const { user } = useAuth();
  const { todayAssignment, fetchTodayAssignment } = useAssignment();
  const {
    todayState,
    attendanceHistory,
    totalHistory,
    currentAttendanceDetail,
    isLoading,
    error: attendanceError,
    fetchTodayState,
    fetchAttendanceHistory,
    selectAttendanceDetail,
    checkIn,
    checkOut,
    checkInOt,
    checkOutOt,
    setTodayState
  } = useAttendance();

  const { isOffline, refreshPendingCount, autoSyncQueueFIFO } = useOffline();
  const { fetchNotifications } = useNotification();
  const { isFaceRegistered, fetchFaceProfileStatus } = useFaceProfile();

  // Active Flow: 'idle' | 'check-in' | 'check-out' | 'ot-check-in' | 'ot-check-out'
  const [activeFlow, setActiveFlow] = useState('idle');
  const [selectedOtRequestId, setSelectedOtRequestId] = useState(null);
  const [flowStep, setFlowStep] = useState(''); // 'gps', 'camera', 'face', 'biometric', 'uploading', 'success', 'failed'
  const [flowStatusText, setFlowStatusText] = useState('');
  const [flowError, setFlowError] = useState(null);
  const [faceOverlayState, setFaceOverlayState] = useState('IDLE'); // 'IDLE' | 'ADJUST' | 'ERROR' | 'READY'
  const [firstPhotoBlob, setFirstPhotoBlob] = useState(null);
  const [secondPhotoBlob, setSecondPhotoBlob] = useState(null);
  const firstPhotoBlobRef = useRef(null);
  const secondPhotoBlobRef = useRef(null);
  const [faceRetryCount, setFaceRetryCount] = useState(0);
  const [faceVerifyFailed, setFaceVerifyFailed] = useState(false);
  const [pendingDeviceAuth, setPendingDeviceAuth] = useState(null);
  const [pendingEmbedding, setPendingEmbedding] = useState(null);
  const [checkInResult, setCheckInResult] = useState(null);
  const [isNoGpsMode, setIsNoGpsMode] = useState(false);

  // Camera states
  const [cameraFacing, setCameraFacing] = useState('user'); // 'user' | 'environment'
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [showEarlyCheckoutModal, setShowEarlyCheckoutModal] = useState(false);
  const [earlyCheckoutModalData, setEarlyCheckoutModalData] = useState(null);
  const [showFaceFailModal, setShowFaceFailModal] = useState(false);
  const [faceFailModalData, setFaceFailModalData] = useState({ title: '', message: '', buttonText: '', isFinal: false });
  const [successModalData, setSuccessModalData] = useState(null);
  const [pendingOfflineItems, setPendingOfflineItems] = useState([]);

  const loadOfflineQueue = async () => {
    try {
      const items = await getAllQueueItems();
      setPendingOfflineItems(items || []);
    } catch (e) {
      console.warn('Failed to read offline queue:', e);
    }
  };

  useEffect(() => {
    loadOfflineQueue();
  }, [isOffline]);


  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const canvasRef = useRef(null);
  const pendingStreamRef = useRef(null); // stream waiting to be attached after DOM renders
  const abortControllerRef = useRef(null);
  const galleryInputRef = useRef(null);

  const triggerOfflineUpload = (type) => {
    if (galleryInputRef.current) {
      galleryInputRef.current.dataset.type = type;
      galleryInputRef.current.value = '';
      galleryInputRef.current.click();
    }
  };

  const handleGalleryFileSelect = async (e) => {
    const files = e.target.files;
    if (!files || files.length !== 1) {
      alert('Vui lòng chọn duy nhất 01 ảnh từ thư viện.');
      return;
    }
    const file = files[0];
    const isImageFormat = (file.type && file.type.startsWith('image/')) ||
      /\.(jpg|jpeg|png|heic|heif|webp|bmp|gif)$/i.test(file.name);

    if (!isImageFormat) {
      alert('Chỉ cho phép chọn tệp ảnh (JPG, PNG, HEIC...). Vui lòng không chọn video hoặc tệp khác.');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      alert('Dung lượng ảnh ban đầu vượt quá 25MB.');
      return;
    }

    const capturedAtClient = new Date().toISOString();
    const nowLocal = new Date();
    const hours = String(nowLocal.getHours()).padStart(2, '0');
    const minutes = String(nowLocal.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${hours}:${minutes}`;
    const deadlineConfig = '22:00';
    const isAfterDeadline = currentTimeStr > deadlineConfig;



    try {
      // 1. Nén ảnh phía Client thành định dạng JPEG nhẹ (1280px max, quality 0.8 => ~150-300KB)
      const { base64: base64Data, blob: compressedBlob } = await compressImageFile(file, 1280, 1280, 0.8);
      const offlineActionType = galleryInputRef.current?.dataset?.type || activeFlow || 'check-in';

      // 2. Nếu thiết bị đang Online: Thử gửi trực tiếp lên Server để xử lý tức thì
      if (navigator.onLine) {
        try {
          const formData = new FormData();
          formData.append('type', offlineActionType);
          if (todayAssignment?.assignmentId) {
            formData.append('assignmentId', todayAssignment.assignmentId);
          }
          formData.append('capturedAtClient', capturedAtClient);
          formData.append('isNoGps', 'true');
          formData.append('isOfflineSync', 'true');
          if (compressedBlob) {
            formData.append('photo', compressedBlob, `offline_attendance_${offlineActionType}_${Date.now()}.jpg`);
          }

          const res = await apiClient.post('/attendance/offline-sync', formData);
          if (res && res.success) {
            setSuccessModalData({
              title: 'Thành công!',
              message: isAfterDeadline
                ? 'Đã ghi nhận Chấm công thành công! (Chuyển trạng thái chờ duyệt do quá hạn nộp)'
                : 'Đã ghi nhận Chấm công ngoại tuyến!'
            });
            fetchTodayState();
            return;
          }
        } catch (directErr) {
          console.warn('Gửi trực tiếp không thành công, tự động chuyển lưu hàng chờ ngoại tuyến:', directErr);
        }
      }

      // 3. Nếu đang Offline hoặc trực tuyến bị lỗi mạng: Lưu ảnh đã nén vào IndexedDB
      await addToOfflineQueue({
        type: offlineActionType,
        photoBase64: base64Data,
        imageName: file.name,
        imageSize: compressedBlob ? compressedBlob.size : file.size,
        mimeType: 'image/jpeg',
        capturedAtClient,
        submittedAfterDeadline: isAfterDeadline,
        assignmentId: todayAssignment?.assignmentId,
        isNoGps: isNoGpsMode || !gpsCoords
      });
      await refreshPendingCount();
      await loadOfflineQueue();

      if (navigator.onLine && autoSyncQueueFIFO) {
        autoSyncQueueFIFO();
      }

      setSuccessModalData({
        title: 'Thành công!',
        message: isAfterDeadline
          ? 'Đã lưu Chấm công ngoại tuyến vào hàng chờ! (Chuyển trạng thái chờ duyệt do quá hạn nộp)'
          : 'Đã ghi nhận Chấm công ngoại tuyến!'
      });
      fetchTodayState();
    } catch (err) {
      console.error('Lỗi nộp ảnh chấm công:', err);
      alert(err.response?.data?.message || err.message || 'Có lỗi xảy ra khi xử lý ảnh chấm công.');
    } finally {
      isStartingFlowRef.current = false;
      setActiveFlow('idle');
    }
  };

  // Attach stream directly to the video element and play
  const attachStream = (stream) => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');
    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }
    video.onloadedmetadata = () => {
      video.play().catch((err) => {
        console.warn("video.play() failed on loadedmetadata:", err);
      });
    };
    video.play().catch((err) => {
      console.warn("video.play() direct fail:", err);
    });
    setTimeout(() => {
      if (video && video.paused) {
        video.play().catch(() => { });
      }
    }, 100);
  };

  // Ensure stream is attached whenever videoRef or flowStep changes
  useEffect(() => {
    if (cameraStreamRef.current && videoRef.current) {
      attachStream(cameraStreamRef.current);
    }
  }, [flowStep]);

  // GPS states & State Machine
  const [gpsCoords, setGpsCoords] = useState(null);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('prompt'); // 'prompt' | 'granted' | 'denied' | 'unavailable'
  const [gpsState, setGpsState] = useState('IDLE'); // 'IDLE' | 'FETCHING_GPS' | 'GPS_READY' | 'GPS_TIMEOUT' | 'NO_GPS'
  const gpsPromiseRef = useRef(null);

  // NO_GPS Warning Modal state
  const [showNoGpsWarningModal, setShowNoGpsWarningModal] = useState(false);
  const [pendingFlowParams, setPendingFlowParams] = useState(null);

  // History filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [reviewFilter, setReviewFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedDetail, setSelectedDetail] = useState(null);

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const flowParam = searchParams.get('flow');
  const lastTriggeredFlowRef = useRef(null);
  const isStartingFlowRef = useRef(false);

  const isFlowBusy = activeFlow !== 'idle' ||
    isStartingFlowRef.current ||
    Boolean(pendingFlowParams) ||
    showEarlyCheckoutModal ||
    showNoGpsWarningModal ||
    showFaceFailModal ||
    Boolean(successModalData);

  useEffect(() => {
    if (flowParam === 'check-in' || flowParam === 'check-out') {
      startFlow(flowParam);
      setSearchParams({}, { replace: true });
    }
  }, [flowParam]);

  // Initialize page data & pre-fetch GPS
  useEffect(() => {
    const loadData = () => {
      fetchTodayAssignment();
      fetchTodayState();
      fetchAttendanceHistory({ page, limit: 10 });
      fetchFaceProfileStatus();
    };

    loadData();
    // Preload face models in background
    preloadFaceModels();

    // Pre-fetch GPS coordinates in background on component mount
    if (!isOffline && navigator.onLine) {
      initiateGpsFetch({ timeoutMs: 15000, highAccuracy: true });
    }

    window.addEventListener('online', loadData);
    return () => {
      window.removeEventListener('online', loadData);
      if (cameraStreamRef.current) {
        try { cameraStreamRef.current.getTracks().forEach(t => t.stop()); } catch (e) { }
        cameraStreamRef.current = null;
      }
    };
  }, [fetchTodayAssignment, fetchTodayState, fetchAttendanceHistory, fetchFaceProfileStatus, page]);

  // Refs to prevent redundant React re-renders during detection ticks
  const lastOverlayStateRef = useRef('IDLE');
  const lastStatusTextRef = useRef('');

  // Real-time face detection loop for overlay guidance (non-blocking, manual capture remains)
  useEffect(() => {
    if (flowStep !== 'face') {
      if (lastOverlayStateRef.current !== 'IDLE') {
        lastOverlayStateRef.current = 'IDLE';
        setFaceOverlayState('IDLE');
      }
      return;
    }

    let active = true;
    let intervalId = null;
    let timerId = null;
    let isDetecting = false; // Concurrency guard to prevent overlapping AI runs on mobile GPUs

    const updateOverlay = (state, text) => {
      if (lastOverlayStateRef.current !== state) {
        lastOverlayStateRef.current = state;
        setFaceOverlayState(state);
      }
      if (text && lastStatusTextRef.current !== text) {
        lastStatusTextRef.current = text;
        setFlowStatusText(text);
      }
    };

    const runDetection = async () => {
      if (isDetecting) return;
      isDetecting = true;

      try {
        const video = videoRef.current;
        // Ensure video is actively playing and decoded (readyState >= 3, currentTime >= 0.3s)
        if (
          !video ||
          video.paused ||
          video.ended ||
          video.readyState < 3 ||
          !video.videoWidth ||
          video.videoWidth === 0 ||
          video.currentTime < 0.3
        ) {
          return;
        }

        // Run faceapi detectAllFaces for real-time overlay tracking
        const detections = await faceapi
          .detectAllFaces(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.35 }))
          .withFaceLandmarks();

        if (!active) return;

        if (detections.length === 0) {
          updateOverlay('IDLE', 'Đã đặt đúng và chụp ảnh');
          return;
        }

        if (detections.length > 1) {
          updateOverlay('ERROR', 'Chỉ một người trong khung');
          return;
        }

        const detection = detections[0];
        const { x, y, width, height } = detection.detection.box;
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;

        // Calculate ratios
        const normW = width / videoWidth;
        const normH = height / videoHeight;
        const normX = x / videoWidth;
        const normY = y / videoHeight;

        // 1. Check Distance (Face width ratio)
        if (normW < 0.16) {
          updateOverlay('ADJUST', 'Lại gần hơn');
          return;
        }
        if (normW > 0.75) {
          updateOverlay('ADJUST', 'Lùi ra một chút');
          return;
        }

        // 2. Check Centering (Mirror mode awareness)
        const faceCenterX = normX + normW / 2;
        if (faceCenterX < 0.28) {
          updateOverlay('ADJUST', cameraFacing === 'user' ? 'Di chuyển sang trái' : 'Di chuyển sang phải');
          return;
        }
        if (faceCenterX > 0.72) {
          updateOverlay('ADJUST', cameraFacing === 'user' ? 'Di chuyển sang phải' : 'Di chuyển sang trái');
          return;
        }

        // 3. Check Alignment with Silhouette bounds
        const boxMinX = normX;
        const boxMaxX = normX + normW;
        const boxMinY = normY;
        const boxMaxY = normY + normH;

        if (boxMinX < 0.10 || boxMaxX > 0.90 || boxMinY < 0.04 || boxMaxY > 0.85) {
          updateOverlay('ERROR', 'Căn giữa khuôn mặt');
          return;
        }

        // 4. Quality checks (Brightness and Contrast)
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          canvas.width = 64;
          canvas.height = 64;
          const cropX = Math.max(0, Math.round(x));
          const cropY = Math.max(0, Math.round(y));
          const cropW = Math.min(videoWidth - cropX, Math.round(width));
          const cropH = Math.min(videoHeight - cropY, Math.round(height));
          ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, 64, 64);

          const imgData = ctx.getImageData(0, 0, 64, 64);
          const data = imgData.data;
          let totalLuminance = 0;
          let minL = 255;
          let maxL = 0;
          for (let i = 0; i < data.length; i += 4) {
            const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
            totalLuminance += lum;
            if (lum < minL) minL = lum;
            if (lum > maxL) maxL = lum;
          }
          const avgL = totalLuminance / (64 * 64);
          const contrast = maxL - minL;

          if (avgL < 30) {
            updateOverlay('ADJUST', 'Tìm nơi sáng hơn');
            return;
          }
          if (contrast < 35) {
            updateOverlay('ADJUST', 'Giữ thiết bị ổn định');
            return;
          }
        }

        // Everything passes
        updateOverlay('READY', 'Sẵn sàng chụp');
      } catch (err) {
        console.warn('[FaceOverlayDetect] error:', err);
      } finally {
        isDetecting = false;
      }
    };

    // 600ms grace period after stream switch to allow GPU decoder to initialize smoothly
    timerId = setTimeout(() => {
      if (active) {
        intervalId = setInterval(runDetection, 750);
      }
    }, 600);

    return () => {
      active = false;
      if (timerId) clearTimeout(timerId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [flowStep, cameraFacing]);

  // Handle history filters
  const handleApplyFilters = () => {
    setPage(1);
    fetchAttendanceHistory({
      page: 1,
      limit: 10,
      attendanceStatus: statusFilter || undefined,
      reviewStatus: reviewFilter || undefined,
    });
  };

  // Base64 to Blob helper
  const base64ToBlob = (base64, mime = 'image/jpeg') => {
    const byteString = atob(base64.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mime });
  };

  // Production GPS Fetcher with State Machine & Promise Locking
  // Production GPS Fetcher with State Machine & Promise Locking
  const initiateGpsFetch = (options = {}) => {
    const { timeoutMs = 4000, highAccuracy = true } = options;

    if (gpsState === 'GPS_READY' && gpsCoords) {
      return Promise.resolve(gpsCoords);
    }

    if (isOffline || !navigator.onLine || !navigator.geolocation) {
      setGpsState('NO_GPS');
      setIsNoGpsMode(true);
      return Promise.resolve(null);
    }

    let fetchPromise = gpsPromiseRef.current;
    if (!fetchPromise || gpsState !== 'FETCHING_GPS') {
      setGpsState('FETCHING_GPS');
      setFlowStatusText('Đang xác định vị trí GPS...');

      fetchPromise = new Promise((resolve) => {
        let resolved = false;

        const timer = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            console.warn('[GPS State Machine] Timeout reached. Falling back to NO_GPS state.');
            setGpsState((prev) => (prev === 'GPS_READY' ? 'GPS_READY' : 'GPS_TIMEOUT'));
            setIsNoGpsMode(true);
            resolve(null);
          }
        }, timeoutMs);

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const coords = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              altitude: pos.coords.altitude,
              heading: pos.coords.heading,
              speed: pos.coords.speed,
            };
            setGpsCoords(coords);
            setGpsAccuracy(Math.round(pos.coords.accuracy));
            setGpsStatus('granted');
            setGpsState('GPS_READY');
            setIsNoGpsMode(false);

            if (!resolved) {
              resolved = true;
              clearTimeout(timer);
              resolve(coords);
            }
          },
          (err) => {
            console.warn('[GPS State Machine] Geolocation error:', err.code, err.message);
            setGpsStatus(err.code === 1 ? 'denied' : 'unavailable');
            if (!resolved) {
              resolved = true;
              clearTimeout(timer);
              setGpsState('NO_GPS');
              setIsNoGpsMode(true);
              resolve(null);
            }
          },
          { enableHighAccuracy: highAccuracy, timeout: timeoutMs, maximumAge: 30000 }
        );
      });
      gpsPromiseRef.current = fetchPromise;
    }

    return Promise.race([
      fetchPromise,
      new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs))
    ]);
  };

  const getGpsPosition = () => initiateGpsFetch({ timeoutMs: 4000, highAccuracy: true });

  // Start check-in/out process with warning checks
  const startFlow = async (type, otRequestId = null) => {
    if (isOffline) {
      triggerOfflineUpload(type);
      return;
    }

    const isRetry = activeFlow !== 'idle';

    if (type === 'ot-check-in' || type === 'ot-check-out') {
      if (otRequestId !== null && otRequestId !== undefined) {
        setSelectedOtRequestId(otRequestId);
      }
    } else {
      setSelectedOtRequestId(null);
    }

    let activeAssignment = todayAssignment;
    if (!activeAssignment) {
      activeAssignment = await fetchTodayAssignment();
    }

    // Kiểm tra đã hết ca làm việc đối với Check-in
    if (type === 'check-in' && !isRetry && activeAssignment?.shift) {
      const endTimeStr = activeAssignment.shift.endTime || activeAssignment.shift.end_time;
      const startTimeStr = activeAssignment.shift.startTime || activeAssignment.shift.start_time;
      if (endTimeStr) {
        const todayStr = dayjs().format('YYYY-MM-DD');
        let scheduledEnd = dayjs(`${todayStr}T${endTimeStr}`);
        const now = dayjs();

        if (startTimeStr && endTimeStr < startTimeStr) {
          const startToday = dayjs(`${todayStr}T${startTimeStr}`);
          if (now.isAfter(startToday)) {
            scheduledEnd = scheduledEnd.add(1, 'day');
          }
        }

        if (now.isAfter(scheduledEnd)) {
          alert(`Đã hết ca chấm công. Ca làm việc đã kết thúc lúc ${endTimeStr.substring(0, 5)}. Không thể Check-in.`);
          return;
        }
      }
    }

    // Cảnh báo check-out sớm
    if (type === 'check-out' && !isRetry && activeAssignment?.shift) {
      const endTimeStr = activeAssignment.shift.endTime || activeAssignment.shift.end_time;
      const startTimeStr = activeAssignment.shift.startTime || activeAssignment.shift.start_time;
      if (endTimeStr && startTimeStr) {
        const todayStr = dayjs().format('YYYY-MM-DD');
        let scheduledEnd = dayjs(`${todayStr}T${endTimeStr}`);
        const now = dayjs();

        // Xử lý ca qua đêm (End < Start)
        if (endTimeStr < startTimeStr) {
          const startToday = dayjs(`${todayStr}T${startTimeStr}`);
          if (now.isBefore(startToday) && now.isBefore(scheduledEnd)) {
            // Đang ở sáng hôm sau
          } else if (now.isAfter(startToday)) {
            // Đang ở tối hôm trước
            scheduledEnd = scheduledEnd.add(1, 'day');
          }
        }

        const diffMinutes = scheduledEnd.diff(now, 'minute');
        const graceMinutes = parseInt(activeAssignment.shift.earlyLeaveGraceMinutes !== undefined ? activeAssignment.shift.earlyLeaveGraceMinutes : (activeAssignment.shift.early_leave_grace_minutes || 0), 10);

        if (diffMinutes > graceMinutes) {
          setEarlyCheckoutModalData({ diffMinutes, endTimeStr, type, otRequestId });
          setShowEarlyCheckoutModal(true);
          return;
        }
      }
    }

    proceedStartFlow(type, otRequestId, false);
  };

  // Perform camera initialization & GPS detection on check-in/out
  const proceedStartFlow = async (type, otRequestId = null, forceNoGps = false) => {
    const isRetry = activeFlow !== 'idle';
    if (!isRetry) {
      setFirstPhotoBlob(null);
      setSecondPhotoBlob(null);
      firstPhotoBlobRef.current = null;
      secondPhotoBlobRef.current = null;
      setFaceRetryCount(0);
      setFaceVerifyFailed(false);
    }

    if (isOffline && (type === 'ot-check-in' || type === 'ot-check-out')) {
      setFlowStep('failed');
      setFlowError('Chấm công tăng ca yêu cầu kết nối mạng để xác thực điều kiện.');
      return;
    }

    // Bypass face scanning/recognition for Offline - open gallery photo picker directly
    if (isOffline) {
      if (galleryInputRef.current) {
        galleryInputRef.current.dataset.type = type;
        galleryInputRef.current.value = '';
        galleryInputRef.current.click();
      }
      return;
    }

    setActiveFlow(type);

    if (type === 'ot-check-in' || type === 'ot-check-out') {
      if (otRequestId !== null && otRequestId !== undefined) {
        setSelectedOtRequestId(otRequestId);
      }
    }
    setFlowError(null);
    setCapturedPhoto(null);

    if (!forceNoGps) {
      setIsNoGpsMode(false);
    } else {
      setIsNoGpsMode(true);
      setGpsState('NO_GPS');
    }

    setFlowStep('face');

    if (!isFaceRegistered) {
      await fetchFaceProfileStatus();
    }

    const currentFaceStatus = useFaceProfileStore.getState().isFaceRegistered;
    if (!currentFaceStatus) {
      setFlowStep('failed');
      setFlowError('Bạn chưa được đăng ký khuôn mặt. Vui lòng liên hệ quản trị viên để được đăng ký.');
      return;
    }
    if (cameraStreamRef.current) {
      try { cameraStreamRef.current.getTracks().forEach(t => t.stop()); } catch (e) { }
      cameraStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    await new Promise(r => setTimeout(r, 300));

    setFlowStatusText('Đang khởi tạo camera quét khuôn mặt...');

    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Trình duyệt không hỗ trợ truy cập camera hoặc kết nối không an toàn (Yêu cầu HTTPS).');
      }

      // Step 1: Start with front camera ('user') for Face Scan
      const targetFacing = 'user';
      setCameraFacing('user');

      let stream;
      try {
        let videoConstraints = { facingMode: 'user' };
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter(d => d.kind === 'videoinput');
          const frontCamera = videoDevices.find(d =>
            d.label.toLowerCase().includes('front') ||
            d.label.toLowerCase().includes('user') ||
            d.label.toLowerCase().includes('trước')
          );
          if (frontCamera) {
            videoConstraints = { deviceId: { exact: frontCamera.deviceId } };
          } else if (videoDevices.length > 1) {
            videoConstraints = { facingMode: { exact: 'user' } };
          }
        } catch (e) {
          console.warn("Failed to enumerate devices:", e);
        }

        stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints });
      } catch (e1) {
        console.warn("Failed first camera attempt, waiting for hardware release:", e1);
        await new Promise(r => setTimeout(r, 400));
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        } catch (e2) {
          console.warn("Failed second camera attempt:", e2);
          await new Promise(r => setTimeout(r, 400));
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }
      }
      cameraStreamRef.current = stream;
      attachStream(stream);

      // Get GPS Position in background without kicking user out if slow
      let fetchedCoords = null;
      if (!forceNoGps) {
        if (gpsState === 'GPS_READY' && gpsCoords) {
          fetchedCoords = gpsCoords;
        } else if (gpsState === 'FETCHING_GPS' && gpsPromiseRef.current) {
          fetchedCoords = await Promise.race([
            gpsPromiseRef.current,
            new Promise(r => setTimeout(() => r(null), 2500))
          ]);
        } else if (gpsState !== 'GPS_READY') {
          fetchedCoords = await initiateGpsFetch({ timeoutMs: 2500, highAccuracy: true });
        } else {
          fetchedCoords = gpsCoords;
        }

        if (!fetchedCoords && !isOffline) {
          console.warn('[Attendance] GPS lock not acquired, enabling No-GPS mode in camera view.');
          setIsNoGpsMode(true);
          setGpsState('NO_GPS');
        }
      }

      if (isOffline) {
        setFlowStep('evidence_capture');
        switchCameraFacing('environment');
        setFlowStatusText('Chụp ảnh xác thực vị trí (Ngoại tuyến)');
      } else {
        setFlowStep('face');
        setFlowStatusText('Quét khuôn mặt (Lần 1/2)');
      }
    } catch (err) {
      console.error('startFlow error:', err);
      if (cameraStreamRef.current) {
        try { cameraStreamRef.current.getTracks().forEach(t => t.stop()); } catch (e) { }
        cameraStreamRef.current = null;
      }
      setFlowStep('failed');
      let msg = err.message || 'Khởi tạo quy trình chấm công thất bại.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Quyền truy cập Camera đã bị từ chối. Vui lòng bấm vào biểu tượng Khóa 🔒 hoặc Camera 🎥 trên thanh địa chỉ trình duyệt để BẬT QUYỀN CAMERA, sau đó nhấn Thử lại.';
      } else if (err.name === 'NotFoundError') {
        msg = 'Không tìm thấy thiết bị Camera trên máy.';
      } else if (err.name === 'NotReadableError') {
        msg = 'Camera đang bị ứng dụng khác sử dụng. Vui lòng đóng các ứng dụng khác đang dùng camera và thử lại.';
      }
      setFlowError(msg);
    }
  };

  // Switch front/back camera
  const toggleCamera = async () => {
    const nextFacing = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(nextFacing);
    setFlowStatusText('Đang chuyển camera...');

    if (cameraStreamRef.current) {
      try { cameraStreamRef.current.getTracks().forEach(t => t.stop()); } catch (e) { }
      cameraStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    await new Promise(r => setTimeout(r, 600));

    let stream = null;
    let videoConstraints = { facingMode: nextFacing };

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      const targetLabels = nextFacing === 'user'
        ? ['front', 'user', 'trước']
        : ['back', 'environment', 'rear', 'sau'];

      const matchedCamera = videoDevices.find(d =>
        targetLabels.some(label => d.label.toLowerCase().includes(label))
      );

      if (matchedCamera) {
        videoConstraints = { deviceId: { exact: matchedCamera.deviceId } };
      } else if (videoDevices.length > 1) {
        videoConstraints = { facingMode: { exact: nextFacing } };
      }
    } catch (e) {
      console.warn("Enumerate devices failed:", e);
    }

    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints });
    } catch (e1) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: nextFacing } });
      } catch (e2) {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
    }

    try {
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      cameraStreamRef.current = stream;
      attachStream(stream);

      setFlowStatusText(flowStep === 'evidence_capture' ? 'Chụp ảnh xác thực vị trí' : 'Đặt khuôn mặt vào khung');
    } catch (err) {
      console.error('Failed to toggle camera:', err);
      setFlowStatusText(flowStep === 'evidence_capture' ? 'Chụp ảnh xác thực vị trí (Lỗi)' : 'Đặt khuôn mặt vào khung (Lỗi)');
    }
  };

  // Capture photo (using native video + canvas with optimization)
  const captureFrame = () => {
    const canvas = canvasRef.current;
    if (!canvas || !videoRef.current) return null;

    if (videoRef.current.readyState < 2 || videoRef.current.videoWidth === 0) {
      return { error: 'NOT_READY' };
    }

    const maxDim = 480;
    let width = videoRef.current.videoWidth || 640;
    let height = videoRef.current.videoHeight || 480;
    if (width > maxDim || height > maxDim) {
      if (width > height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.8));
  };

  // Helper to switch camera facing dynamically
  const switchCameraFacing = async (targetFacing) => {
    setCameraFacing(targetFacing);
    if (cameraStreamRef.current) {
      try { cameraStreamRef.current.getTracks().forEach(t => t.stop()); } catch (e) { }
      cameraStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    await new Promise(r => setTimeout(r, 400));
    let stream = null;
    let videoConstraints = { facingMode: targetFacing };

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      const targetLabels = targetFacing === 'user'
        ? ['front', 'user', 'trước']
        : ['back', 'environment', 'rear', 'sau'];

      const matchedCamera = videoDevices.find(d =>
        targetLabels.some(label => d.label.toLowerCase().includes(label))
      );

      if (matchedCamera) {
        videoConstraints = { deviceId: { exact: matchedCamera.deviceId } };
      } else if (videoDevices.length > 1) {
        videoConstraints = { facingMode: { exact: targetFacing } };
      }
    } catch (e) {
      console.warn("Enumerate devices failed in switchCameraFacing:", e);
    }

    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints });
    } catch (e1) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: targetFacing }
        });
      } catch (e2) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        } catch (e3) { }
      }
    }
    if (stream) {
      cameraStreamRef.current = stream;
      attachStream(stream);
    }
  };

  const handleCapture = async () => {
    if (!videoRef.current) return;

    // Step 1: Quét khuôn mặt (Camera trước)
    setFlowStep('verifying_face');
    setFlowStatusText('Đang phân tích khuôn mặt (AI)...');

    const capturedFacePhotoBlob = await captureFrame();
    if (capturedFacePhotoBlob && capturedFacePhotoBlob.error === 'NOT_READY') {
      setFlowStep('face');
      alert('Thiết bị chưa xử lý kịp luồng Camera. Vui lòng chờ 1-2 giây rồi bấm thử lại!');
      return;
    }
    if (!capturedFacePhotoBlob) {
      setFlowStep('face');
      setFlowError('Không thể dựng ảnh khuôn mặt. Vui lòng thử lại.');
      return;
    }

    let deviceAuth = null;

    if (isOffline) {
      setFirstPhotoBlob(capturedFacePhotoBlob);
      setFlowStep('evidence_capture');
      switchCameraFacing('environment');
      setFlowStatusText('Chụp ảnh xác thực vị trí (Ngoại tuyến)');
      return;
    }

    setFlowStatusText('Đang phân tích khuôn mặt (AI)...');

    let computedEmbeddingData = null;
    let isVerifySuccess = false;

    try {
      // Chèn trễ nhỏ để tránh nghẽn luồng Main Thread trên thiết bị yếu
      await new Promise(r => setTimeout(r, 150));

      const embeddingResult = await Promise.race([
        computeEmbeddingFromBlob(capturedFacePhotoBlob),
        new Promise((resolve) => setTimeout(() => resolve({ embedding: null, detected: false, error: 'Client AI timeout' }), 3500))
      ]);

      if (embeddingResult.errorCode === 'MULTIPLE_FACES_DETECTED' || (embeddingResult.error && embeddingResult.error.includes('nhiều khuôn mặt'))) {
        throw new Error('Phát hiện thấy nhiều khuôn mặt trong ảnh. Vui lòng chỉ chụp 1 khuôn mặt trong khung hình.');
      }

      if (!embeddingResult.detected || !embeddingResult.embedding) {
        console.warn('[FaceVerify] Client-side detection failed, falling back to server-side:', embeddingResult.error);
        setFlowStatusText('Đang xác thực khuôn mặt (server)...');
        const verifyFormData = new FormData();
        verifyFormData.append('photo', capturedFacePhotoBlob, `verify_face_${Date.now()}.jpg`);
        try {
          const verifyRes = await Promise.race([
            faceProfileService.verifyFace(verifyFormData),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Hệ thống phản hồi chậm')), 4000))
          ]);
          if (verifyRes && verifyRes.success) {
            isVerifySuccess = true;
          } else {
            throw new Error(verifyRes?.message || 'Xác thực khuôn mặt thất bại.');
          }
        } catch (err) {
          console.warn('[FaceVerify] Server fallback failed:', err);
          isVerifySuccess = false;
        }
      } else {
        setFlowStatusText('Đang xác thực danh tính...');
        try {
          const verifyRes = await Promise.race([
            faceProfileService.verifyFaceEmbedding(embeddingResult.embedding),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Hệ thống phản hồi chậm')), 4000))
          ]);
          if (verifyRes && verifyRes.success) {
            isVerifySuccess = true;
            computedEmbeddingData = {
              embedding: embeddingResult.embedding,
              embeddingVersion: 'face-api-v1',
              modelVersion: 'face-api'
            };
          } else {
            throw new Error(verifyRes?.message || 'Xác thực khuôn mặt thất bại.');
          }
        } catch (err) {
          console.warn('[FaceVerify] Embedding verify failed:', err);
          isVerifySuccess = false;
        }
      }
    } catch (err) {
      isVerifySuccess = false;
    }

    if (isVerifySuccess) {
      // Quét mặt thành công -> Lưu ảnh mặt, chuyển sang Chụp ảnh xác thực vị trí (camera sau)
      setFirstPhotoBlob(capturedFacePhotoBlob);
      firstPhotoBlobRef.current = capturedFacePhotoBlob;
      setFaceVerifyFailed(false);
      setPendingEmbedding(computedEmbeddingData);
      setPendingDeviceAuth(deviceAuth);

      setFlowStep('evidence_capture');
      switchCameraFacing('environment');
      setFlowStatusText('Xác thực khuôn mặt thành công! Chụp ảnh xác thực vị trí.');
    } else {
      // Quét mặt thất bại -> Tắt ngay loading spinner ('verifying_face') về lại 'face'
      setFlowStep('face');
      if (faceRetryCount < 1) {
        setFaceRetryCount(1);
        setFlowStatusText('Xác thực khuôn mặt Lần 1 không thành công. Thử lại Lần 2.');
        setFaceFailModalData({
          title: '⚠️ Khuôn mặt không khớp (Lần 1)',
          message: 'Nhận diện khuôn mặt Lần 1 chưa trùng khớp với dữ liệu nhân viên. Vui lòng căn chỉnh góc mặt và bấm "THỬ LẠI LẦN 2".',
          buttonText: 'THỬ LẠI LẦN 2',
          isFinal: false
        });
        setShowFaceFailModal(true);
      } else {
        // Đã thất bại 2 lần -> Tự động chuyển sang Chụp ảnh vị trí để gửi Admin duyệt
        setFaceRetryCount(2);
        setFaceVerifyFailed(true);
        setFirstPhotoBlob(capturedFacePhotoBlob);
        firstPhotoBlobRef.current = capturedFacePhotoBlob;
        setPendingEmbedding(computedEmbeddingData);
        setPendingDeviceAuth(deviceAuth);

        setFlowStatusText('Nhận diện thất bại 2 lần. Bấm nút để chuyển sang chụp vị trí.');
        setFaceFailModalData({
          title: '❌ Nhận diện thất bại 2 lần',
          message: 'Nhận diện khuôn mặt 2 lần không thành công. Hệ thống chuyển sang camera sau để chụp ảnh vị trí gửi Admin phê duyệt.',
          buttonText: 'CHỤP ẢNH VỊ TRÍ (GỬI ADMIN DUYỆT)',
          isFinal: true
        });
        setShowFaceFailModal(true);
      }
    }
  };

  const handleCaptureEvidence = async () => {
    if (!videoRef.current || flowStep === 'uploading') return;

    // Instant 0ms visual feedback for touch response
    setFlowStep('uploading');
    setFlowStatusText('Đang chụp ảnh vị trí và xử lý...');

    const capturedLocationPhotoBlob = await captureFrame();
    if (capturedLocationPhotoBlob && capturedLocationPhotoBlob.error === 'NOT_READY') {
      setFlowStep('evidence_capture');
      alert('Thiết bị chưa tải xong Camera sau. Vui lòng chờ 1-2 giây rồi bấm thử lại!');
      return;
    }
    if (!capturedLocationPhotoBlob) {
      setFlowStep('evidence_capture');
      setFlowError('Không thể chụp ảnh xác thực vị trí. Vui lòng thử lại.');
      return;
    }

    setSecondPhotoBlob(capturedLocationPhotoBlob);
    secondPhotoBlobRef.current = capturedLocationPhotoBlob;
    try {
      const photoUrl = URL.createObjectURL(capturedLocationPhotoBlob);
      setCapturedPhoto(photoUrl);
    } catch (e) { }

    // Tự động dừng camera và gửi bài ngay lập tức không cần bấm nút Xác nhận
    if (cameraStreamRef.current) {
      try { cameraStreamRef.current.getTracks().forEach(t => t.stop()); } catch (e) { }
      cameraStreamRef.current = null;
    }

    const finalFacePhoto = firstPhotoBlob || firstPhotoBlobRef.current;
    submitAttendance(finalFacePhoto, capturedLocationPhotoBlob, pendingEmbedding, pendingDeviceAuth, faceVerifyFailed);
  };

  const handleRetakeEvidence = () => {
    setCapturedPhoto(null);
    setSecondPhotoBlob(null);
    setFlowStep('evidence_capture');
    switchCameraFacing('environment');
  };

  const handleConfirmAttendance = () => {
    if (cameraStreamRef.current) {
      try { cameraStreamRef.current.getTracks().forEach(t => t.stop()); } catch (e) { }
      cameraStreamRef.current = null;
    }
    submitAttendance(firstPhotoBlob, secondPhotoBlob, pendingEmbedding, pendingDeviceAuth, faceVerifyFailed);
  };

  // Submit to server or save offline
  const submitAttendance = async (photoBlob, verificationPhotoBlob, embeddingData, deviceAuth, isFailedFace = faceVerifyFailed) => {
    setFlowStep('uploading');

    let statusText = 'Đang gửi...';
    if (activeFlow === 'check-in') statusText = 'Đang gửi Check-in...';
    else if (activeFlow === 'check-out') statusText = 'Đang gửi Check-out...';
    else if (activeFlow === 'ot-check-in') statusText = 'Đang gửi Check-in Tăng ca...';
    else if (activeFlow === 'ot-check-out') statusText = 'Đang gửi Check-out Tăng ca...';
    setFlowStatusText(statusText);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    // Ensure GPS acquisition finishes or times out before proceeding to submission
    if (gpsState === 'FETCHING_GPS' && gpsPromiseRef.current) {
      setFlowStatusText('Đang chờ vị trí GPS...');
      await gpsPromiseRef.current;
    }

    const clientRequestId = self.crypto.randomUUID ? self.crypto.randomUUID() : 'req_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    const queueId = self.crypto.randomUUID ? self.crypto.randomUUID() : 'queue_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
    const capturedAtClient = new Date().toISOString();
    const assignmentId = todayAssignment?.assignmentId;
    const hasValidCoords = gpsCoords &&
      typeof gpsCoords.latitude === 'number' && !isNaN(gpsCoords.latitude) &&
      typeof gpsCoords.longitude === 'number' && !isNaN(gpsCoords.longitude);
    const isNoGps = isNoGpsMode || !hasValidCoords;

    // Helper to convert blob to base64 for reliable IndexedDB storage on iOS Safari
    const blobToBase64 = (blob) => new Promise((resolve) => {
      if (!blob) return resolve(null);
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });

    const photoBase64 = await blobToBase64(photoBlob);
    const verificationPhotoBase64 = await blobToBase64(verificationPhotoBlob);

    const attendanceData = {
      queueId,
      assignmentId,
      otRequestId: selectedOtRequestId,
      latitude: hasValidCoords ? gpsCoords.latitude : null,
      longitude: hasValidCoords ? gpsCoords.longitude : null,
      gpsAccuracy: (gpsAccuracy && !isNaN(gpsAccuracy)) ? gpsAccuracy : null,
      capturedAtClient,
      clientRequestId,
      isNoGps,
      isPwaStandalone: window.matchMedia('(display-mode: standalone)').matches ? 1 : 0,
      embedding: embeddingData ? JSON.stringify(embeddingData.embedding) : null,
      embeddingVersion: embeddingData ? embeddingData.embeddingVersion : null,
      modelVersion: embeddingData ? embeddingData.modelVersion : null,
      deviceFingerprint: getDeviceFingerprint(),
      photoBase64,
      verificationPhotoBase64,
      faceVerifyFailed: isFailedFace ? 'true' : 'false'
    };

    // If device is offline, add to Dexie queue using Base64 string
    if (isOffline || !navigator.onLine) {
      try {
        await addToOfflineQueue({
          type: activeFlow,
          ...attendanceData
        });
        await refreshPendingCount();
        setFlowStep('success');
        setFlowStatusText(activeFlow === 'check-in' ? 'Đã ghi nhận Check-in ngoại tuyến thành công!' : 'Đã ghi nhận Check-out ngoại tuyến thành công!');
      } catch (err) {
        setFlowStep('failed');
        setFlowError('Không thể lưu trữ chấm công ngoại tuyến: ' + err.message);
      }
      return;
    }

    // Direct online upload with 3-second network timeout for fast offline fallback
    const timeoutId = setTimeout(() => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort('network_timeout');
      }
    }, 3000);

    try {
      const formData = new FormData();
      formData.append('queueId', queueId);
      if (assignmentId) formData.append('assignmentId', assignmentId);
      if (selectedOtRequestId) formData.append('otRequestId', selectedOtRequestId);
      if (hasValidCoords) {
        formData.append('latitude', gpsCoords.latitude.toString());
        formData.append('longitude', gpsCoords.longitude.toString());
      }
      if (gpsAccuracy && !isNaN(gpsAccuracy)) {
        formData.append('gpsAccuracy', gpsAccuracy.toString());
      }
      formData.append('capturedAtClient', capturedAtClient);
      formData.append('clientRequestId', clientRequestId);
      formData.append('isNoGps', isNoGps ? 'true' : 'false');
      formData.append('isPwaStandalone', attendanceData.isPwaStandalone);
      if (isFailedFace) {
        formData.append('faceVerifyFailed', 'true');
      }
      if (attendanceData.embedding) formData.append('embedding', attendanceData.embedding);
      if (attendanceData.embeddingVersion) formData.append('embeddingVersion', attendanceData.embeddingVersion);
      if (attendanceData.modelVersion) formData.append('modelVersion', attendanceData.modelVersion);

      // Photo upload directly as Blob (< 150KB)
      formData.append('photo', photoBlob, `attendance_${activeFlow}_${Date.now()}.jpg`);

      if (verificationPhotoBlob) {
        formData.append('verificationPhoto', verificationPhotoBlob, `verification_${activeFlow}_${Date.now()}.jpg`);
      }

      // Device Passkey Auth
      if (deviceAuth) {
        formData.append('deviceAuth[id]', deviceAuth.id);
        formData.append('deviceAuth[type]', deviceAuth.type);
        formData.append('deviceAuth[response][clientDataJSON]', deviceAuth.response.clientDataJSON);
        formData.append('deviceAuth[response][authenticatorData]', deviceAuth.response.authenticatorData);
        formData.append('deviceAuth[response][signature]', deviceAuth.response.signature);
        if (deviceAuth.response.userHandle) {
          formData.append('deviceAuth[response][userHandle]', deviceAuth.response.userHandle);
        }
      }

      let actionFn;
      if (activeFlow === 'ot-check-in') actionFn = checkInOt;
      else if (activeFlow === 'ot-check-out') actionFn = checkOutOt;
      else actionFn = activeFlow === 'check-in' ? checkIn : checkOut;

      const res = await actionFn(formData, { signal: abortControllerRef.current.signal });
      clearTimeout(timeoutId);

      if (res && res.isCanceled) {
        return;
      }

      if (res && res.success) {
        setFlowStep('success');
        setCheckInResult(res.data);

        let msg = 'Chấm công thành công!';
        if (res.data?.riskLevel === 'NO_GPS' || isNoGpsMode || res.data?.reviewStatus === 'PENDING') {
          if (res.data?.riskLevel === 'NO_GPS' || isNoGpsMode) {
            msg = 'Đã gửi lượt chấm công lên Admin phê duyệt do KHÔNG LẤY ĐƯỢC VỊ TRÍ GPS!';
          } else if (isFailedFace) {
            msg = 'Đã gửi lượt chấm công lên Admin phê duyệt do nhận diện khuôn mặt thất bại 2 lần!';
          } else {
            msg = 'Đã gửi lượt chấm công lên Admin phê duyệt!';
          }
        } else if (activeFlow === 'check-in') {
          msg = 'Check-in thành công!';
          if (res.data && res.data.checkInStatus === 'LATE') {
            msg = `Check-in thành công! Bạn đi trễ ${res.data.lateMinutes || 0} phút.`;
          }
        } else if (activeFlow === 'check-out') {
          msg = 'Check-out thành công!';
          if (res.data && res.data.checkOutStatus === 'LEFT_EARLY') {
            msg = `Check-out thành công! Bạn đã về sớm ${res.data.earlyLeaveMinutes || 0} phút.`;
          }
        } else if (activeFlow === 'ot-check-in') {
          msg = 'Check-in tăng ca thành công!';
        } else if (activeFlow === 'ot-check-out') {
          msg = `Check-out tăng ca thành công! (${res.data?.approvedMinutes || 0} phút được duyệt)`;
        }
        setFlowStatusText(msg);

        // Auto-refresh lists and counters
        fetchTodayState();
        fetchAttendanceHistory({ page: 1, limit: 10 });
        fetchNotifications();
      } else {
        setFlowStep('failed');
        setFlowError(res ? res.message : 'Chấm công thất bại.');
      }
    } catch (err) {
      clearTimeout(timeoutId);
      // Fallback immediately to IndexedDB queue if network drops, times out, or fails during submission
      if (!navigator.onLine || err.message === 'Network Error' || err.code === 'ERR_NETWORK' || err.name === 'CanceledError' || err.code === 'ERR_CANCELED' || err === 'network_timeout') {
        try {
          await addToOfflineQueue({
            type: activeFlow,
            ...attendanceData
          });
          await refreshPendingCount();
          setFlowStep('success');
          setFlowStatusText(activeFlow === 'check-in' ? 'Đã ghi nhận Check-in ngoại tuyến thành công!' : 'Đã ghi nhận Check-out ngoại tuyến thành công!');

          if (activeFlow === 'check-in' && todayState) {
            setTodayState({
              ...todayState,
              actions: {
                ...todayState.actions,
                canCheckIn: false,
                canCheckOut: true
              },
              attendance: {
                ...todayState.attendance,
                checkInTime: new Date().toISOString()
              }
            });
          } else if (activeFlow === 'check-out' && todayState) {
            setTodayState({
              ...todayState,
              actions: {
                ...todayState.actions,
                canCheckOut: false
              },
              attendance: {
                ...todayState.attendance,
                checkOutTime: new Date().toISOString()
              }
            });
          }

          return;
        } catch (queueErr) {
          console.error('Failed to add to offline queue:', queueErr);
        }
      }

      setFlowStep('failed');
      setFlowError(err.message || 'Lỗi kết nối máy chủ.');
    }
  };

  // Close Flow modal
  const closeFlow = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (cameraStreamRef.current) {
      try { cameraStreamRef.current.getTracks().forEach(t => t.stop()); } catch (e) { }
      cameraStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    isStartingFlowRef.current = false;
    setActiveFlow('idle');
    setFlowStep('');
    setFlowError(null);
    setCapturedPhoto(null);
    setFirstPhotoBlob(null);
    setPendingDeviceAuth(null);
    setCheckInResult(null);
  }, []);

  const handleResetCooldown = () => {
    localStorage.removeItem('last_notify_time_GPS_CHECK_IN');
    localStorage.removeItem('last_notify_time_GPS_CHECK_OUT');
    alert('Đã reset thành công bộ nhớ tạm cảnh báo! Điện thoại sẽ thông báo ngay khi nhận được tín hiệu định vị nằm trong bán kính.');
  };

  const handleRequestPermission = async () => {
    if (!('Notification' in window)) {
      alert('Trình duyệt hoặc thiết bị của bạn không hỗ trợ thông báo đẩy.');
      return;
    }
    try {
      const res = await window.Notification.requestPermission();
      setNotifyAllowed(res === 'granted');
      if (res === 'granted') {
        alert('Đã cấp quyền thông báo thành công! Hệ thống đang kích hoạt đăng ký đẩy...');
        window.location.reload();
      } else if (res === 'denied') {
        alert('Quyền thông báo bị từ chối. Vui lòng vào Cài đặt của iOS -> chọn app CHAMCONG -> bật Quyền thông báo.');
      }
    } catch (err) {
      console.warn('Request notification permission failed:', err);
    }
  };

  const getHistoryStatusBadge = (status) => {
    switch (status) {
      case 'IN_PROGRESS':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FEF9C3] text-[#CA8A04] border border-[#FDE047]">In Progress</span>;
      case 'COMPLETED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]">Completed</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-[#6B7280]">{status}</span>;
    }
  };

  const getHistoryReviewBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#DCFCE7] text-[#16A34A] border border-[#BBF7D0]">Đã duyệt</span>;
      case 'REJECTED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-[#EF4444] border border-red-200">Từ chối</span>;
      case 'PENDING':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-[#F59E0B] border border-amber-200">Chờ duyệt</span>;
      case 'NOT_REQUIRED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-[#6B7280]">Không cần duyệt</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-[#6B7280]">{status}</span>;
    }
  };

  const handleConfirmFailModal = () => {
    setShowFaceFailModal(false);
    if (faceFailModalData?.isFinal) {
      setFlowStep('evidence_capture');
      switchCameraFacing('environment');
      setFlowStatusText('Nhận diện thất bại 2 lần. Chụp ảnh vị trí để gửi Admin duyệt.');
    } else {
      setFlowStep('face');
      setFlowStatusText('Vui lòng căn chỉnh khuôn mặt và bấm nút Chụp (Lần 2).');
    }
  };

  // Render standalone camera screen when activeFlow is active
  if (activeFlow !== 'idle') {
    return (
      <AttendanceCameraPage
        activeFlow={activeFlow}
        flowStep={flowStep}
        flowStatusText={flowStatusText}
        flowError={flowError}
        cameraFacing={cameraFacing}
        capturedPhoto={capturedPhoto}
        toggleCamera={toggleCamera}
        handleCapture={handleCapture}
        handleCaptureEvidence={handleCaptureEvidence}
        handleRetakeEvidence={handleRetakeEvidence}
        handleConfirmAttendance={handleConfirmAttendance}
        closeFlow={closeFlow}
        startFlow={startFlow}
        videoRef={videoRef}
        canvasRef={canvasRef}
        faceOverlayState={faceOverlayState}
        checkInResult={checkInResult}
        showFaceFailModal={showFaceFailModal}
        faceFailModalData={faceFailModalData}
        onConfirmFailModal={handleConfirmFailModal}
      />
    );
  }

  return (
    <>
      <Dashboard
        onStartCheckIn={() => startFlow('check-in')}
        onStartCheckOut={() => startFlow('check-out')}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleGalleryFileSelect}
      />
      {showEarlyCheckoutModal && earlyCheckoutModalData && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in pointer-events-auto">
          <div
            className="bg-white shadow-2xl w-full p-6 animate-scale-up"
            style={{
              maxWidth: '310px',
              borderRadius: '24px',
              border: '1px solid #F1F5F9',
              boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
              transform: 'translateY(-70px)'
            }}
          >
            {/* Header with Icon & Title */}
            <div className="flex items-center gap-3" style={{ marginBottom: '18px' }}>
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#FEE2E2', color: '#EF4444' }}
              >
                <RiAlertLine style={{ fontSize: '20px' }} />
              </div>
              <h3
                style={{
                  fontSize: '15px',
                  fontWeight: '800',
                  color: '#1E293B',
                  margin: 0
                }}
              >
                Thông báo
              </h3>
            </div>

            {/* Body Message */}
            <div
              style={{
                fontSize: '12.5px',
                lineHeight: '1.6',
                color: '#475569',
                fontWeight: '600',
                marginBottom: '20px'
              }}
            >
              <p style={{ margin: '0 0 10px 0' }}>
                Bạn đang thực hiện check-out sớm <span style={{ color: '#EF4444', fontWeight: '850' }}>{earlyCheckoutModalData.diffMinutes} phút</span> so với giờ quy định <strong>({earlyCheckoutModalData.endTimeStr ? earlyCheckoutModalData.endTimeStr.substring(0, 5) : ''})</strong>.
              </p>
              <p style={{ margin: 0 }}>Bạn có chắc chắn muốn check-out sớm không?</p>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  const targetType = earlyCheckoutModalData?.type || 'check-out';
                  const otId = earlyCheckoutModalData?.otRequestId || null;
                  setShowEarlyCheckoutModal(false);
                  proceedStartFlow(targetType, otId);
                }}
                style={{
                  backgroundColor: '#046A38',
                  color: '#ffffff',
                  paddingTop: '12px',
                  paddingBottom: '12px',
                  borderRadius: '16px',
                  fontSize: '12px',
                  fontWeight: '850',
                  width: '100%',
                  textAlign: 'center',
                  display: 'block',
                  border: 'none',
                  letterSpacing: '0.05em',
                  cursor: 'pointer'
                }}
              >
                ĐỒNG Ý
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowEarlyCheckoutModal(false);
                  setEarlyCheckoutModalData(null);
                  closeFlow();
                  navigate('/', { replace: true });
                }}
                style={{
                  backgroundColor: '#ffffff',
                  color: '#6B7280',
                  paddingTop: '12px',
                  paddingBottom: '12px',
                  borderRadius: '16px',
                  fontSize: '12px',
                  fontWeight: '850',
                  width: '100%',
                  textAlign: 'center',
                  display: 'block',
                  border: '1px solid #E5E7EB',
                  letterSpacing: '0.05em',
                  cursor: 'pointer'
                }}
              >
                HỦY
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Modal Cảnh báo Quét mặt Thất bại (Lần 1 / Lần 2) */}
      {showFaceFailModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            backdropFilter: 'blur(4px)'
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '24px',
              maxWidth: '380px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: faceFailModalData.isFinal ? '#FEF2F2' : '#FFFBEB',
                color: faceFailModalData.isFinal ? '#DC2626' : '#D97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
                fontSize: '28px'
              }}
            >
              {faceFailModalData.isFinal ? '❌' : '⚠️'}
            </div>

            <h3
              style={{
                fontSize: '17px',
                fontWeight: '700',
                color: '#111827',
                marginBottom: '8px'
              }}
            >
              {faceFailModalData.title}
            </h3>

            <p
              style={{
                fontSize: '13px',
                color: '#4B5563',
                lineHeight: '1.5',
                marginBottom: '20px'
              }}
            >
              {faceFailModalData.message}
            </p>

            <button
              type="button"
              onClick={() => {
                setShowFaceFailModal(false);
                if (faceFailModalData.isFinal) {
                  setFlowStep('evidence_capture');
                  switchCameraFacing('environment');
                  setFlowStatusText('Nhận diện thất bại 2 lần. Chụp ảnh vị trí để gửi Admin duyệt.');
                } else {
                  setFlowStep('face');
                }
              }}
              style={{
                backgroundColor: faceFailModalData.isFinal ? '#DC2626' : '#046A38',
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
              {faceFailModalData.buttonText}
            </button>
          </div>
        </div>
      )}
      {/* Hidden File Input for Offline Gallery Upload */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        style={{ display: 'none' }}
        onChange={handleGalleryFileSelect}
      />
      {/* Custom Offline Success Popup Modal (Image 2 style) */}
      {successModalData && (
        <div
          onClick={() => setSuccessModalData(null)}
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-5 animate-fade-in pointer-events-auto"
        >
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
              {successModalData.title || 'Thành công!'}
            </h3>
            <p className="text-xs text-slate-600 font-semibold leading-relaxed max-w-[240px]">
              {successModalData.message}
            </p>

            {/* Action Button */}
            <button
              type="button"
              onClick={() => setSuccessModalData(null)}
              className="w-full py-3.5 font-bold text-sm tracking-wider uppercase rounded-xl transition-all shadow-md cursor-pointer mt-2 active:scale-95 border-0"
              style={{ backgroundColor: '#006837', color: '#FFFFFF' }}
            >
              ĐÓNG
            </button>
          </div>
        </div>
      )}

      {/* Pop-up Cảnh báo Không lấy được GPS */}
      {showNoGpsWarningModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in pointer-events-auto">
          <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/40 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-left animate-slide-up">
            <div className="flex items-center gap-3 border-b border-amber-100 dark:border-amber-900/30 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 text-xl font-bold flex-shrink-0">
                ⚠️
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">
                  Không lấy được GPS
                </h3>
                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
                  Cảnh báo tín hiệu vị trí
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                Lượt chấm công này vẫn có thể thực hiện.
              </p>

              <div className="p-3 bg-amber-50/80 dark:bg-amber-950/30 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 space-y-2">
                <p className="font-bold text-amber-900 dark:text-amber-300 text-[11px] uppercase tracking-wider">
                  Tuy nhiên hệ thống sẽ:
                </p>
                <ul className="space-y-1.5 font-medium text-slate-800 dark:text-slate-200">
                  <li className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold">
                    <span>✓</span> Chụp ảnh xác thực
                  </li>
                  <li className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold">
                    <span>✓</span> Gửi Admin duyệt
                  </li>
                  <li className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold">
                    <span>✓</span> Không tự động tính công
                  </li>
                </ul>
              </div>

              <p className="font-bold text-slate-900 dark:text-slate-100 text-center pt-1 text-xs">
                Bạn có muốn tiếp tục?
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="button"
                onClick={async () => {
                  setShowNoGpsWarningModal(false);
                  setFlowStatusText('Đang thử kết nối lại GPS...');
                  const pos = await initiateGpsFetch({ timeoutMs: 15000, highAccuracy: true });
                  if (pos && pendingFlowParams) {
                    setIsNoGpsMode(false);
                    proceedStartFlow(pendingFlowParams.type, pendingFlowParams.otRequestId);
                  } else if (!pos && pendingFlowParams) {
                    setShowNoGpsWarningModal(true); // Hiển thị lại nếu vẫn thất bại
                  }
                }}
                className="flex-1 py-3 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer text-center"
              >
                🔄 Thử lại GPS
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowNoGpsWarningModal(false);
                  setIsNoGpsMode(true);
                  if (pendingFlowParams) {
                    proceedStartFlow(pendingFlowParams.type, pendingFlowParams.otRequestId, true);
                  }
                }}
                className="flex-1 py-3 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold shadow-sm transition-colors cursor-pointer text-center"
              >
                📸 Tiếp tục chấm công
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Attendance;
