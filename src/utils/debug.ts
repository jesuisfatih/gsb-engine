/**
 * Debug logging utilities
 * Only logs in development mode, errors always logged
 */

const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';

export const debugLog = (...args: unknown[]) => {
  if (isDev) {
    console.log(...args);
  }
};

export const debugWarn = (...args: unknown[]) => {
  if (isDev) {
    console.warn(...args);
  }
};

export const debugError = (...args: unknown[]) => {
  // Always log errors, even in production
  console.error(...args);
};

export const debugGroup = (label: string, fn: () => void) => {
  if (isDev) {
    console.group(label);
    fn();
    console.groupEnd();
  } else {
    fn();
  }
};

