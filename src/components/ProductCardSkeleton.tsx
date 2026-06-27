import React from 'react';

export const ProductCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-xl border border-slate-200/70 overflow-hidden flex flex-col h-full animate-pulse select-none">
      {/* Upper image block skeleton */}
      <div className="relative bg-slate-100 aspect-square w-full flex items-center justify-center p-4 border-b border-slate-100">
        {/* Placeholder graphic/glow */}
        <div className="w-1/2 h-1/2 bg-slate-200/60 rounded-lg"></div>
        {/* Category tag badge placeholder */}
        <div className="absolute top-2.5 left-2.5 bg-slate-200/70 h-3.5 w-16 rounded-xs"></div>
      </div>

      {/* Content wrapper skeleton */}
      <div className="p-2.5 sm:p-4 flex flex-col flex-grow justify-between gap-3 bg-white">
        <div className="space-y-2">
          {/* Title lines */}
          <div className="h-3.5 bg-slate-200/70 rounded-md w-full"></div>
          <div className="h-3.5 bg-slate-200/70 rounded-md w-3/4"></div>

          {/* Rating stars placeholder */}
          <div className="flex items-center gap-1.5 pt-1">
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-slate-200/70 rounded-full"></div>
              ))}
            </div>
            <div className="w-6 h-3 bg-slate-200/70 rounded-md"></div>
          </div>
        </div>

        {/* Price & Actions block skeleton */}
        <div className="flex flex-col gap-2 pt-2 border-t border-slate-50">
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex flex-col gap-1 min-h-[34px] justify-center w-2/3">
              <div className="h-3 bg-slate-100 rounded-sm w-12"></div>
              <div className="h-4 bg-slate-200/70 rounded-md w-24"></div>
            </div>

            {/* Cart Button placeholder */}
            <div className="h-7 sm:h-8 w-14 sm:w-20 bg-slate-205 rounded-lg shrink-0"></div>
          </div>
        </div>
      </div>
    </div>
  );
};
