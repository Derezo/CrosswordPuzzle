// Tiny haptic-feedback helper. Wraps navigator.vibrate so callers don't have
// to guard against the (many) environments where it isn't available — SSR,
// iOS Safari, prefers-reduced-motion. Calls become no-ops there.

const supported =
  typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

const vibrate = (pattern: number | number[]): void => {
  if (!supported || prefersReducedMotion()) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Some browsers throw if vibrate is called outside a user gesture.
    // Silently ignore — haptics are non-critical.
  }
};

export const haptics = {
  tap: () => vibrate(8),
  toggle: () => vibrate([6, 30, 6]),
  success: () => vibrate([20, 40, 20]),
  error: () => vibrate([60, 30, 60]),
};
