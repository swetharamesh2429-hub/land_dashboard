import React from 'react';

export const Card = ({
  children,
  className = '',
  hoverEffect = false,
  highlightTier = null, // 'DANGER', 'WARNING', etc.
  ...props
}) => {
  let tierBorder = 'border-slate-800/80';
  if (highlightTier === 'DANGER') tierBorder = 'border-l-4 border-l-red-500 border-slate-800 bg-red-950/10';
  if (highlightTier === 'WARNING') tierBorder = 'border-l-4 border-l-orange-500 border-slate-800 bg-orange-950/10';
  if (highlightTier === 'WATCH') tierBorder = 'border-l-4 border-l-yellow-500 border-slate-800';

  return (
    <div
      className={`bg-slate-800/60 backdrop-blur-sm border ${tierBorder} rounded-xl p-4 md:p-5 transition-all ${
        hoverEffect ? 'hover:bg-slate-800 hover:border-slate-700 hover:shadow-lg hover:shadow-slate-950/40' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ title, subtitle, action, icon: Icon }) => (
  <div className="flex items-start justify-between gap-3 mb-3 border-b border-slate-700/40 pb-3">
    <div className="flex items-center gap-2.5">
      {Icon && <Icon className="w-5 h-5 text-sky-400 shrink-0" />}
      <div>
        <h3 className="text-sm md:text-base font-semibold text-slate-100">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {action && <div>{action}</div>}
  </div>
);
