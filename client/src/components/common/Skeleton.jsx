import React from 'react';

export const Skeleton = ({ className = '', variant = 'rect' }) => {
  const base = 'animate-pulse bg-slate-800/80 rounded';
  const variants = {
    rect: '',
    circle: 'rounded-full',
    text: 'h-4 w-full',
  };
  return <div className={`${base} ${variants[variant] || ''} ${className}`} />;
};

export const CardSkeleton = () => (
  <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-5 space-y-3">
    <div className="flex items-center justify-between">
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-5 w-16" />
    </div>
    <Skeleton className="h-8 w-2/3" />
    <Skeleton className="h-4 w-full" />
    <div className="flex gap-2 pt-2">
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-8 w-1/2" />
    </div>
  </div>
);

export const TableSkeleton = ({ rows = 5 }) => (
  <div className="space-y-2">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-4 p-3 bg-slate-800/30 rounded border border-slate-800/50">
        <Skeleton className="h-4 w-1/6" />
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/6" />
        <Skeleton className="h-4 w-1/6" />
        <Skeleton className="h-4 w-1/5" />
      </div>
    ))}
  </div>
);
