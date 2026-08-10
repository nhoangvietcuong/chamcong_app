/**
 * Appends current JWT access token to static image URLs (e.g., /uploads/...)
 * to ensure protected image rendering in standard <img> HTML elements on Mobile PWA.
 */
export const getProtectedImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  
  const token = localStorage.getItem('accessToken');
  if (!token) return url;
  
  if (url.includes('token=')) return url;
  
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}token=${token}`;
};

export const base64ToBlob = (base64, mime = 'image/jpeg') => {
  if (!base64) return null;
  try {
    const parts = base64.split(',');
    const rawData = parts.length > 1 ? parts[1] : parts[0];
    const byteString = atob(rawData.trim());
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mime });
  } catch (err) {
    console.error('base64ToBlob error:', err);
    return null;
  }
};

/**
 * Compresses an image file client-side using HTML Canvas.
 * Scales down large photos (e.g. 10MB phone camera shots) to lightweight JPEG Base64 & Blob.
 */
export const compressImageFile = (file, maxWidth = 1280, maxHeight = 1280, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error('Tệp không tồn tại'));
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không thể đọc tệp ảnh này'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Định dạng hình ảnh không hợp lệ hoặc tệp bị hỏng.'));
      img.onload = () => {
        try {
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            if (width / height > maxWidth / maxHeight) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const base64 = canvas.toDataURL('image/jpeg', quality);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve({ base64, blob });
              } else {
                const fallbackBlob = base64ToBlob(base64, 'image/jpeg');
                resolve({ base64, blob: fallbackBlob });
              }
            },
            'image/jpeg',
            quality
          );
        } catch (err) {
          reject(err);
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};

export default getProtectedImageUrl;


