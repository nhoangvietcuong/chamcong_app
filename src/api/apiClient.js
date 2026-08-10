import axios from 'axios';

// Get or generate a persistent device fingerprint
export const getDeviceFingerprint = () => {
  let fingerprint = localStorage.getItem('deviceFingerprint');
  if (!fingerprint) {
    fingerprint = 'fp_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem('deviceFingerprint', fingerprint);
  }
  return fingerprint;
};

// Get a human-readable device name from User-Agent
export const getDeviceName = () => {
  const ua = navigator.userAgent;
  let os = 'Unknown OS';
  if (ua.indexOf('Win') !== -1) os = 'Windows';
  if (ua.indexOf('Mac') !== -1) os = 'macOS';
  if (ua.indexOf('Linux') !== -1) os = 'Linux';
  if (ua.indexOf('Android') !== -1) os = 'Android';
  if (ua.indexOf('like Mac') !== -1) os = 'iOS';

  let browser = 'Unknown Browser';
  if (ua.indexOf('Chrome') !== -1) browser = 'Chrome';
  else if (ua.indexOf('Safari') !== -1) browser = 'Safari';
  else if (ua.indexOf('Firefox') !== -1) browser = 'Firefox';
  else if (ua.indexOf('Edge') !== -1) browser = 'Edge';

  return `${browser} on ${os}`;
};

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request Interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Attach device fingerprint header
    config.headers['X-Device-Fingerprint'] = getDeviceFingerprint();
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor
apiClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle Network errors or Server Down
    if (!error.response) {
      return Promise.reject({
        message: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối mạng.',
        code: 'NETWORK_ERROR',
        errorCode: 'NETWORK_ERROR'
      });
    }

    const { status, data } = error.response;

    // Check if error is due to expired token (usually 401)
    const isTokenExpiredError = status === 401 && !originalRequest._retry;

    if (isTokenExpiredError) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');
      const deviceFingerprint = getDeviceFingerprint();

      if (!refreshToken) {
        isRefreshing = false;
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        return Promise.reject({
          message: 'Tên đăng nhập hoặc mật khẩu không đúng.',
          code: 'NO_REFRESH_TOKEN',
          errorCode: 'NO_REFRESH_TOKEN'
        });
      }

      try {
        // Direct call to refresh-token API to avoid interceptor recursion
        const refreshResponse = await axios.post('/api/auth/refresh-token', {
          refreshToken,
          deviceFingerprint
        });

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = refreshResponse.data.data;

        localStorage.setItem('accessToken', newAccessToken);
        if (newRefreshToken) {
          localStorage.setItem('refreshToken', newRefreshToken);
        }

        apiClient.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);
        isRefreshing = false;

        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;

        // Clear auth details and redirect
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        return Promise.reject({
          message: 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.',
          code: 'REFRESH_TOKEN_EXPIRED',
          errorCode: 'REFRESH_TOKEN_EXPIRED'
        });
      }
    }

    // Convert backend specific error code to unified structure
    const appError = {
      status,
      message: data?.message || error.message || 'Đã có lỗi xảy ra',
      errorCode: data?.errorCode || 'INTERNAL_SERVER_ERROR',
      data: data?.data || null
    };

    return Promise.reject(appError);
  }
);

export default apiClient;
