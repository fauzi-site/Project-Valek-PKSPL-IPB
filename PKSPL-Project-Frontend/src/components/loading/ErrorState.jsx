import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

/**
 * Sanitizes raw error payloads to ensure sensitive backend details (SQL, traces, tokens) are never shown.
 */
export const sanitizeErrorMessage = (error, defaultMsg = 'Terjadi kendala saat memuat data dari server.') => {
  if (!error) return defaultMsg;
  if (typeof error === 'string') {
    if (/sql|select|insert|update|delete|table|column|token|bearer|stack/i.test(error)) {
      return defaultMsg;
    }
    return error;
  }
  const msg = error?.response?.data?.message || error?.message;
  if (typeof msg === 'string' && !/sql|select|stack|pdoexception/i.test(msg)) {
    return msg;
  }
  return defaultMsg;
};

/**
 * Standardized Error State with Retry Button.
 */
export const ErrorState = ({
  error = null,
  title = 'Gagal Memuat Data',
  message = '',
  onRetry = null,
  retryLabel = 'Coba Lagi',
  className = '',
}) => {
  const displayMessage = message || sanitizeErrorMessage(error);

  return (
    <div
      role="alert"
      className={`py-8 px-4 text-center max-w-md mx-auto space-y-3 ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100 shadow-2xs">
        <AlertCircle className="w-6 h-6" />
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        <p className="text-xs text-slate-500 leading-relaxed">{displayMessage}</p>
      </div>
      {onRetry && (
        <div className="pt-2">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-slate-50 text-blue-600 hover:text-blue-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{retryLabel}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ErrorState;
