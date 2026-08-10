import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';

// Mock face-api and mediapipe
vi.mock('@vladmandic/face-api', () => ({
  default: {},
  nets: {},
}));

vi.mock('@mediapipe/tasks-vision', () => ({
  FilesetResolver: {
    forVisionTasks: vi.fn(),
  },
  FaceLandmarker: {
    createFromOptions: vi.fn(),
  },
}));

vi.mock('@mediapipe/face_mesh', () => ({
  FaceMesh: vi.fn(),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock indexedDB
const indexedDBMock = {
  open: vi.fn(),
};
Object.defineProperty(window, 'indexedDB', {
  value: indexedDBMock,
  writable: true,
});

afterEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});
