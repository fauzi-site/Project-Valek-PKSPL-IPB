import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * LoadingButton: Standard mutation/action button with built-in loading state.
 * - Prevents double-submit by automatically disabling when loading
 * - Preserves button dimensions to avoid layout shifting
 * - Shows subtle spinner while executing mutation
 */
export const LoadingButton = ({
  children,
  loading = false,
  loadingText = 'Memproses...',
  disabled = false,
  className = '',
  type = 'button',
  icon = null,
  variant = 'primary', // 'primary' | 'secondary' | 'danger' | 'ghost' | 'success'
  ...props
}) => {
  const isDisabled = disabled || loading;

  const variantStyles = {
    primary: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-xs',
    secondary: 'bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs',
    danger: 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-xs',
    success: 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-xs',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-700',
  };

  const currentVariant = variantStyles[variant] || variantStyles.primary;

  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) {
      return icon;
    }
    if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null)) {
      const IconComp = icon;
      return <IconComp className="w-3.5 h-3.5 shrink-0" />;
    }
    return null;
  };

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading}
      className={`
        relative inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg
        text-xs font-semibold transition-all duration-150 cursor-pointer
        disabled:opacity-60 disabled:cursor-not-allowed select-none
        ${currentVariant}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 text-current" />
          <span>{loadingText}</span>
        </>
      ) : (
        <>
          {renderIcon()}
          <span>{children}</span>
        </>
      )}
    </button>
  );
};

export default LoadingButton;
