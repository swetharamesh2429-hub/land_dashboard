import React from 'react';
import { Loader2 } from 'lucide-react';

export const Button = ({
  children,
  variant = 'primary', // primary, secondary, danger, success, ghost, outline
  size = 'md', // sm, md, lg, xl
  loading = false,
  disabled = false,
  className = '',
  icon: Icon = null,
  iconPosition = 'left',
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none';

  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-xs gap-1.5',
    md: 'px-3.5 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-base gap-2.5',
    xl: 'px-6 py-3.5 text-lg font-semibold gap-3',
  };

  const variantClasses = {
    primary: 'bg-sky-600 hover:bg-sky-500 text-white shadow-sm shadow-sky-900/40 focus:ring-sky-500 active:bg-sky-700',
    secondary: 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 focus:ring-slate-500',
    success: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-900/40 focus:ring-emerald-500',
    danger: 'bg-red-600 hover:bg-red-500 text-white shadow-sm shadow-red-900/40 focus:ring-red-500 active:bg-red-700',
    outlineDanger: 'bg-transparent border border-red-500/60 hover:bg-red-950/40 text-red-400 focus:ring-red-500',
    outline: 'bg-transparent border border-slate-700 hover:bg-slate-800 text-slate-300 focus:ring-slate-500',
    ghost: 'bg-transparent hover:bg-slate-800/60 text-slate-300 hover:text-white focus:ring-slate-600',
  };

  return (
    <button
      disabled={disabled || loading}
      className={`${baseClasses} ${sizeClasses[size] || sizeClasses.md} ${variantClasses[variant] || variantClasses.primary} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon className="w-4 h-4 shrink-0" />}
          <span>{children}</span>
          {Icon && iconPosition === 'right' && <Icon className="w-4 h-4 shrink-0" />}
        </>
      )}
    </button>
  );
};
