/**
 * Client-side Face Recognition & Pose Estimation Service
 * Sử dụng @vladmandic/face-api với WebGL backend (browser) để tính toán embedding chính xác.
 * Sử dụng MediaPipe Facial Transformation Matrix để ước lượng tư thế đầu (Yaw/Pitch/Roll).
 */

const MODELS_URL = '/models';

let faceapi = null;
let isLoaded = false;
let loadPromise = null;

// Cấu hình động lấy từ biến môi trường (Vite sử dụng import.meta.env)
export const CONFIG = {
  confidenceMin: parseFloat(import.meta.env.VITE_FQA_CONFIDENCE_MIN || '0.95'),
  faceWidthMin: parseInt(import.meta.env.VITE_FQA_FACE_WIDTH_MIN || '80', 10),
  brightnessMin: parseFloat(import.meta.env.VITE_FQA_BRIGHTNESS_MIN || '50'),
  brightnessMax: parseFloat(import.meta.env.VITE_FQA_BRIGHTNESS_MAX || '220'),
  contrastMin: parseFloat(import.meta.env.VITE_FQA_CONTRAST_MIN || '65'),
  yawTarget: parseFloat(import.meta.env.VITE_POSE_YAW_TARGET || '20.0'),
  yawTolerance: parseFloat(import.meta.env.VITE_POSE_YAW_TOLERANCE || '5.0'),
  pitchTarget: parseFloat(import.meta.env.VITE_POSE_PITCH_TARGET || '15.0'),
  pitchTolerance: parseFloat(import.meta.env.VITE_POSE_PITCH_TOLERANCE || '5.0'),
  similarityThreshold: parseFloat(import.meta.env.VITE_FACE_SIMILARITY_THRESHOLD || '0.82')
};

/**
 * Load face-api models (chỉ load 1 lần, cache lại)
 */
export async function loadFaceModels() {
  if (isLoaded) return faceapi;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const faceApiModule = await import('@vladmandic/face-api');
      faceapi = faceApiModule.default || faceApiModule;

      console.log('[FaceRecognition] Loading models from', MODELS_URL);

      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODELS_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL),
      ]);

      isLoaded = true;
      console.log('[FaceRecognition] ✅ Models loaded successfully (WebGL backend)');
      return faceapi;
    } catch (err) {
      loadPromise = null;
      console.error('[FaceRecognition] ❌ Failed to load models:', err);
      throw err;
    }
  })();

  return loadPromise;
}

/**
 * Tạo face embedding 128D từ HTMLImageElement hoặc HTMLCanvasElement
 * @param {HTMLImageElement|HTMLCanvasElement|HTMLVideoElement} imageElement
 * @returns {Promise<Float32Array|null>} embedding 128D hoặc null nếu không detect được mặt
 */
export async function computeFaceEmbedding(imageElement) {
  const api = await loadFaceModels();

  const detections = await api
    .detectAllFaces(imageElement, new api.SsdMobilenetv1Options({ minConfidence: 0.35 }))
    .withFaceLandmarks()
    .withFaceDescriptors();

  if (!detections || detections.length === 0) {
    return { descriptor: null, faceCount: 0, reason: 'NO_FACE_DETECTED' };
  }
  if (detections.length > 1) {
    return { descriptor: null, faceCount: detections.length, reason: 'MULTIPLE_FACES_DETECTED' };
  }

  return { descriptor: detections[0].descriptor, faceCount: 1, reason: null };
}

/**
 * Tạo embedding từ Blob ảnh
 * @param {Blob} imageBlob
 * @returns {Promise<{embedding: number[], detected: boolean, error?: string, errorCode?: string}>}
 */
export async function computeEmbeddingFromBlob(imageBlob) {
  try {
    await loadFaceModels();

    const imgUrl = URL.createObjectURL(imageBlob);
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = imgUrl;
    });

    const result = await computeFaceEmbedding(img);
    URL.revokeObjectURL(imgUrl);

    if (result.reason === 'MULTIPLE_FACES_DETECTED') {
      return {
        embedding: null,
        detected: true,
        faceCount: result.faceCount,
        error: 'Phát hiện thấy nhiều khuôn mặt trong ảnh (yêu cầu chỉ có 1 khuôn mặt)',
        errorCode: 'MULTIPLE_FACES_DETECTED'
      };
    }

    if (!result.descriptor) {
      return {
        embedding: null,
        detected: false,
        faceCount: 0,
        error: 'Không phát hiện khuôn mặt trong ảnh',
        errorCode: 'NO_FACE_DETECTED'
      };
    }

    return {
      embedding: Array.from(result.descriptor), // chuyển Float32Array → Array để JSON.stringify
      detected: true,
      faceCount: 1,
      error: null,
    };
  } catch (err) {
    console.error('[FaceRecognition] computeEmbeddingFromBlob error:', err);
    return { embedding: null, detected: false, error: err.message };
  }
}

/**
 * Tính Cosine Similarity giữa 2 embedding vector
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number} 0.0 – 1.0
 */
export function cosineSimilarity(a, b) {
  let dot = 0, n1 = 0, n2 = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    n1 += a[i] * a[i];
    n2 += b[i] * b[i];
  }
  if (n1 === 0 || n2 === 0) return 0;
  return Math.max(0, dot / (Math.sqrt(n1) * Math.sqrt(n2)));
}

/**
 * Preload models khi app khởi động (background)
 */
export function preloadFaceModels() {
  loadFaceModels().catch((err) => {
    console.warn('[FaceRecognition] Preload failed:', err.message);
  });
}

/**
 * Bộ đánh giá tư thế khuôn mặt sử dụng ma trận transformation của MediaPipe
 */
export class FacePoseAssessor {
  /**
   * Phân tích ảnh và ước lượng tư thế sử dụng ma trận biến đổi 4x4 của MediaPipe
   * @param {HTMLCanvasElement} canvas
   * @param {Object} mediaPipeFaceResult Kết quả đầu ra từ MediaPipe Face Landmarker
   */
  static analyze(canvas, mediaPipeFaceResult) {
    if (!canvas || !mediaPipeFaceResult || !mediaPipeFaceResult.facialTransformationMatrixes?.[0]) {
      return { passed: false, reason: 'Không phát hiện ma trận tư thế khuôn mặt' };
    }

    // 1. Trích xuất ma trận biến đổi 4x4 (column-major) từ MediaPipe
    const matrix = mediaPipeFaceResult.facialTransformationMatrixes[0].data;

    // 2. Tính toán chính xác góc Euler (đơn vị: Độ)
    const pitch = Math.asin(-matrix[6]) * (180 / Math.PI);
    const yaw = Math.atan2(matrix[2], matrix[10]) * (180 / Math.PI);
    const roll = Math.atan2(matrix[4], matrix[5]) * (180 / Math.PI);

    // Phân loại tư thế đầu dựa trên cấu hình động
    let currentYawPose = 'STRAIGHT';
    if (yaw < -(CONFIG.yawTarget - CONFIG.yawTolerance)) {
      currentYawPose = 'LEFT';
    } else if (yaw > (CONFIG.yawTarget - CONFIG.yawTolerance)) {
      currentYawPose = 'RIGHT';
    }

    let currentPitchPose = 'LEVEL';
    if (pitch < -(CONFIG.pitchTarget - CONFIG.pitchTolerance)) {
      currentPitchPose = 'DOWN';
    } else if (pitch > (CONFIG.pitchTarget - CONFIG.pitchTolerance)) {
      currentPitchPose = 'UP';
    }

    // 3. Phân tích độ sáng & độ tương phản khuôn mặt
    const keypoints = mediaPipeFaceResult.faceLandmarks[0];
    if (!keypoints || keypoints.length === 0) {
      return { passed: false, reason: 'Không tìm thấy điểm mốc khuôn mặt' };
    }

    let minX = canvas.width, maxX = 0, minY = canvas.height, maxY = 0;
    for (const lm of keypoints) {
      const px = lm.x * canvas.width;
      const py = lm.y * canvas.height;
      if (px < minX) minX = px;
      if (px > maxX) maxX = px;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
    }

    const box = {
      originX: Math.max(0, Math.round(minX)),
      originY: Math.max(0, Math.round(minY)),
      width: Math.min(canvas.width - Math.max(0, Math.round(minX)), Math.round(maxX - minX)),
      height: Math.min(canvas.height - Math.max(0, Math.round(minY)), Math.round(maxY - minY))
    };

    if (box.width < CONFIG.faceWidthMin || box.height < CONFIG.faceWidthMin) {
      return { passed: false, reason: 'Khuôn mặt ở quá xa camera' };
    }

    const ctx = canvas.getContext('2d');
    const faceImgData = ctx.getImageData(
      box.originX,
      box.originY,
      box.width,
      box.height
    );
    const data = faceImgData.data;

    let totalLuminance = 0;
    let minLuminance = 255;
    let maxLuminance = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      totalLuminance += luminance;
      if (luminance < minLuminance) minLuminance = luminance;
      if (luminance > maxLuminance) maxLuminance = luminance;
    }

    const avgLuminance = totalLuminance / (data.length / 4);
    const contrast = maxLuminance - minLuminance;

    if (avgLuminance < CONFIG.brightnessMin) {
      return { passed: false, reason: 'Không đủ ánh sáng. Vui lòng di chuyển đến nơi sáng hơn.' };
    }
    if (avgLuminance > CONFIG.brightnessMax) {
      return { passed: false, reason: 'Khuôn mặt bị lóa sáng. Vui lòng tránh nguồn sáng mạnh.' };
    }
    if (contrast < CONFIG.contrastMin) {
      return { passed: false, reason: 'Hình ảnh bị mờ. Vui lòng giữ yên thiết bị.' };
    }

    // 4. Ước lượng nụ cười qua khoảng cách khóe môi
    const mouthLeft = keypoints[61];
    const mouthRight = keypoints[291];
    const leftEye = keypoints[33];
    const rightEye = keypoints[263];

    const mouthWidth = Math.sqrt((mouthRight.x - mouthLeft.x) ** 2 + (mouthRight.y - mouthLeft.y) ** 2);
    const eyeDist = Math.sqrt((rightEye.x - leftEye.x) ** 2 + (rightEye.y - leftEye.y) ** 2);
    const smileScore = mouthWidth / eyeDist;
    const isSmiling = smileScore > 0.83;

    return {
      passed: true,
      pose: { yaw, pitch, roll, currentYawPose, currentPitchPose, isSmiling },
      qualityScore: parseFloat((0.98 * (contrast / 255)).toFixed(2))
    };
  }
}

/**
 * FaceTracker tracks face box coordinates and smoothes landmarks across video frames.
 */
export class FaceTracker {
  constructor() {
    this.lastBox = null;
    this.consecutiveMisses = 0;
  }

  update(detections) {
    if (!detections || detections.length === 0) {
      this.consecutiveMisses++;
      if (this.consecutiveMisses > 4) {
        this.lastBox = null;
      }
      return null;
    }

    this.consecutiveMisses = 0;
    const det = detections[0];
    const box = det.detection?.box || det.box;

    if (!box) {
      return null;
    }

    if (!this.lastBox) {
      this.lastBox = {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height
      };
      return {
        detection: {
          box: this.lastBox,
          score: det.detection?.score || 0.95
        }
      };
    }

    // Exponential Moving Average smoothing
    const alpha = 0.55;
    this.lastBox = {
      x: this.lastBox.x + alpha * (box.x - this.lastBox.x),
      y: this.lastBox.y + alpha * (box.y - this.lastBox.y),
      width: this.lastBox.width + alpha * (box.width - this.lastBox.width),
      height: this.lastBox.height + alpha * (box.height - this.lastBox.height),
    };

    return {
      detection: {
        box: this.lastBox,
        score: det.detection?.score || 0.95
      }
    };
  }

  shouldDetect(frameCount) {
    return true; // Run detection on every frame for instant response, use tracker for EMA smoothing
  }
}

