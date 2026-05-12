'use client';

import React, { useEffect } from 'react';

interface LoginErrorToastProps {
  message: string;
  onDismiss: () => void;
  /**
   * Auto-dismiss delay in milliseconds. Defaults to 4000ms. Set to 0 to
   * disable auto-dismiss.
   */
  autoDismissMs?: number;
}

/**
 * Pure-React, state-driven error toast for the login page. Replaces the
 * previous DOM-mutation implementation that built nodes with `innerHTML`
 * and injected `<style>` tags at runtime (XSS surface).
 *
 * The slide-in/jiggle animation is defined as `login-error-toast` in
 * `globals.css` so the keyframes can correctly preserve the centering
 * translateX(-50%) on every step.
 */
export const LoginErrorToast: React.FC<LoginErrorToastProps> = ({
  message,
  onDismiss,
  autoDismissMs = 4000,
}) => {
  useEffect(() => {
    if (autoDismissMs <= 0) return;
    const timer = window.setTimeout(onDismiss, autoDismissMs);
    return () => window.clearTimeout(timer);
  }, [autoDismissMs, onDismiss]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="login-error-toast fixed top-5 left-1/2 z-[9999] max-w-md w-[90%] sm:w-full p-4 rounded-xl shadow-2xl backdrop-blur-md border border-red-500/50 bg-gradient-to-br from-red-500/20 to-pink-500/20 text-red-100"
      style={{ transform: 'translateX(-50%)' }}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden="true">
          🚨
        </span>
        <div className="flex-1">
          <h4 className="m-0 mb-2 font-semibold text-red-50">
            Houston, We Have a Problem!
          </h4>
          <p className="m-0 text-sm leading-snug">{message}</p>
          <button
            type="button"
            onClick={onDismiss}
            className="mt-3 bg-transparent border-0 text-red-300 hover:text-red-100 cursor-pointer text-xs underline"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginErrorToast;
