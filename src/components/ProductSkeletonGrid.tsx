import React from 'react';

export const ProductSkeletonGrid: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 w-full animate-pulse">
      {Array.from({ length: count }).map((_, index) => (
        <div 
          key={index}
          className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4 flex flex-col space-y-3 shadow-xs"
        >
          {/* Skeleton Image Area */}
          <div className="relative aspect-square w-full rounded-xl bg-slate-200/80 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
          </div>

          {/* Skeleton Category & Shop */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="h-3 w-16 bg-slate-200 rounded-md" />
            <div className="h-3 w-20 bg-slate-200 rounded-md" />
          </div>

          {/* Skeleton Title */}
          <div className="space-y-1.5">
            <div className="h-4 w-full bg-slate-200 rounded-md" />
            <div className="h-4 w-3/4 bg-slate-200 rounded-md" />
          </div>

          {/* Skeleton Price & Button */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
            <div className="h-5 w-20 bg-slate-200 rounded-md" />
            <div className="h-8 w-16 bg-slate-200 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
};
