import apiClient from '../api/apiClient';

// base64url encoders/decoders
export const b64url = (arrayBuffer) => {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

export const b64urlDecode = (base64url) => {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

// Request authentication options and prompt passkey
export const getWebAuthnAssertion = async () => {
  if (!window.PublicKeyCredential) {
    throw new Error('Thiết bị hoặc trình duyệt không hỗ trợ xác thực Passkey sinh trắc học.');
  }

  // Step 1: Request options from server
  const response = await apiClient.post('/device-biometric/authentication/options');
  if (!response || !response.success || !response.data) {
    throw new Error(response?.message || 'Không thể tạo WebAuthn challenge từ máy chủ.');
  }

  const getOpts = response.data;
  
  // Decode challenge from base64url to ArrayBuffer
  getOpts.challenge = b64urlDecode(getOpts.challenge);
  
  // Decode allowed credentials ids
  if (getOpts.allowCredentials) {
    getOpts.allowCredentials = getOpts.allowCredentials.map((c) => ({
      ...c,
      id: b64urlDecode(c.id),
    }));
  }

  // Step 2: Prompt biometrics in browser
  const assertion = await navigator.credentials.get({ publicKey: getOpts });
  if (!assertion) {
    throw new Error('Không nhận được dữ liệu xác thực từ thiết bị.');
  }

  // Step 3: Encode assertion response to base64url strings
  return {
    id: assertion.id,
    rawId: b64url(assertion.rawId),
    type: assertion.type,
    response: {
      clientDataJSON: b64url(assertion.response.clientDataJSON),
      authenticatorData: b64url(assertion.response.authenticatorData),
      signature: b64url(assertion.response.signature),
      userHandle: assertion.response.userHandle ? b64url(assertion.response.userHandle) : null,
    },
  };
};

// Request registration options and enroll passkey
export const registerWebAuthnCredential = async (deviceName) => {
  if (!window.PublicKeyCredential) {
    throw new Error('Thiết bị hoặc trình duyệt không hỗ trợ đăng ký Passkey.');
  }

  // Step 1: Request registration options
  const response = await apiClient.post('/device-biometric/registration/options', {
    attachment: 'platform', // Platform means built-in biometric sensor like FaceID/Fingerprint
  });

  if (!response || !response.success || !response.data) {
    throw new Error(response?.message || 'Không thể tạo đăng ký challenge.');
  }

  const createOpts = response.data;
  createOpts.challenge = b64urlDecode(createOpts.challenge);
  createOpts.user.id = b64urlDecode(createOpts.user.id);
  
  if (createOpts.excludeCredentials) {
    createOpts.excludeCredentials = createOpts.excludeCredentials.map((c) => ({
      ...c,
      id: b64urlDecode(c.id),
    }));
  }

  // Step 2: Create credential in browser
  const credential = await navigator.credentials.create({ publicKey: createOpts });
  if (!credential) {
    throw new Error('Không tạo được thông tin bảo mật trên thiết bị.');
  }

  // Step 3: Encode response
  const regResponse = {
    id: credential.id,
    rawId: b64url(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: b64url(credential.response.clientDataJSON),
      attestationObject: b64url(credential.response.attestationObject),
    },
    clientExtensionResults: credential.getClientExtensionResults ? credential.getClientExtensionResults() : {},
  };

  // Step 4: Verify with server
  const verifyResult = await apiClient.post('/device-biometric/registration/verification', {
    registrationResponse: regResponse,
    deviceName,
  });

  return verifyResult;
};
