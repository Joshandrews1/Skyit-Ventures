import React, { useState } from 'react';
import { SolarPackage, getPackageUsageModes, UsageModeDetails } from '../data/quote-data';

interface Props {
  pkg: SolarPackage;
  theme?: 'dark' | 'light';
}

export const PackageUsageModeSelector: React.FC<Props> = ({ pkg, theme = 'dark' }) => {
  const [activeModeKey, setActiveModeKey] = useState<'max' | 'average' | 'day' | 'night'>('average');
  
  const usageModes = getPackageUsageModes(pkg);
  const currentModeDetails: UsageModeDetails = usageModes[activeModeKey];

  const isDark = theme === 'dark';

  const modesConfig = [
    {
      key: 'average' as const,
      label: 'Average Load',
      shortLabel: 'Average',
      icon: 'balance',
      tag: 'Recommended',
      activeBgDark: 'bg-[#0066ff] text-white border-[#0066ff]',
      activeBgLight: 'bg-blue-600 text-white border-blue-600',
    },
    {
      key: 'max' as const,
      label: 'Max Peak Load',
      shortLabel: 'Max Peak',
      icon: 'bolt',
      tag: 'Peak Capacity',
      activeBgDark: 'bg-rose-600 text-white border-rose-600',
      activeBgLight: 'bg-rose-600 text-white border-rose-600',
    },
    {
      key: 'day' as const,
      label: 'Daytime Solar',
      shortLabel: 'Day Solar',
      icon: 'wb_sunny',
      tag: 'Sunlight Hours',
      activeBgDark: 'bg-amber-500 text-slate-950 border-amber-500',
      activeBgLight: 'bg-amber-500 text-slate-950 border-amber-500',
    },
    {
      key: 'night' as const,
      label: 'Night Battery',
      shortLabel: 'Night Mode',
      icon: 'bedtime',
      tag: 'Overnight',
      activeBgDark: 'bg-indigo-600 text-white border-indigo-600',
      activeBgLight: 'bg-indigo-600 text-white border-indigo-600',
    },
  ];

  return (
    <div className={`space-y-3 p-3.5 rounded-2xl border transition-all ${
      isDark 
        ? 'bg-[#171b27]/90 border-white/10 text-white' 
        : 'bg-slate-50/90 border-slate-200 text-slate-900 shadow-sm'
    }`}>
      {/* Header Title */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b pb-3 border-white/10">
        <div className="flex items-center gap-2 min-w-0">
          <span className="material-symbols-outlined text-amber-400 text-lg shrink-0">tune</span>
          <span className="text-xs sm:text-sm font-black uppercase tracking-wider leading-snug">
            Appliance Load & Duration Modes
          </span>
        </div>
        <span className="shrink-0 text-[10px] font-extrabold px-3 py-1 rounded-full whitespace-nowrap bg-blue-500/20 text-blue-300 border border-blue-500/30 shadow-xs">
          Select Usage Profile
        </span>
      </div>

      {/* Mode Switches / Tabs */}
      <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100/90 dark:bg-black/40 border border-slate-200/80 dark:border-white/5">
        {modesConfig.map((item) => {
          const isActive = activeModeKey === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveModeKey(item.key)}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-center transition-all cursor-pointer border text-xs font-bold ${
                isActive
                  ? isDark ? item.activeBgDark : item.activeBgLight
                  : isDark
                    ? 'bg-transparent text-slate-300 border-transparent hover:bg-white/5'
                    : 'bg-transparent text-slate-600 border-transparent hover:bg-slate-200/60'
              }`}
            >
              <span className="material-symbols-outlined text-base shrink-0">{item.icon}</span>
              <span className="truncate text-[11px] sm:text-xs font-bold">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Mode Details Display */}
      <div className={`p-3 rounded-xl border space-y-3 animate-in fade-in duration-200 overflow-hidden ${
        isDark ? 'bg-[#0e131e] border-white/5' : 'bg-white border-slate-200 shadow-2xs'
      }`}>
        {/* Header & Runtime Banner */}
        <div className="space-y-2 border-b pb-2.5 border-slate-100 dark:border-white/5">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <span className={`text-[10px] uppercase tracking-wider font-extrabold block truncate ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}>
              {currentModeDetails.title}
            </span>

            <span className={`inline-flex items-center text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tight shadow-2xs shrink-0 ${
              activeModeKey === 'max'
                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/30'
                : activeModeKey === 'average'
                ? 'bg-blue-500/15 text-blue-600 dark:text-blue-300 border border-blue-500/30'
                : activeModeKey === 'day'
                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30'
            }`}>
              {currentModeDetails.badge}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-black text-amber-600 dark:text-amber-300 bg-amber-500/10 dark:bg-amber-500/15 px-2.5 py-1.5 rounded-lg border border-amber-500/20">
            <span className="material-symbols-outlined text-sm shrink-0">schedule</span>
            <span>Estimated Runtime: {currentModeDetails.runtime}</span>
          </div>
        </div>

        {/* Appliances List for this mode */}
        <div className="space-y-1.5">
          <span className={`text-[11px] font-extrabold uppercase tracking-wider block ${
            isDark ? 'text-[#b3c5ff]' : 'text-slate-700'
          }`}>
            ⚡ Appliances Powered Simultaneously:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs font-semibold">
            {currentModeDetails.loadItems.map((item, idx) => (
              <div 
                key={idx} 
                className={`p-2 rounded-lg flex items-start gap-2 ${
                  isDark ? 'bg-[#171b27] text-slate-200' : 'bg-slate-50 text-slate-800'
                }`}
              >
                <span className="material-symbols-outlined text-green-400 text-sm shrink-0 mt-0.5">check_circle</span>
                <span className="leading-tight">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Operational Advice Tip */}
        <div className={`p-2.5 rounded-lg text-xs leading-relaxed flex items-start gap-2 ${
          isDark ? 'bg-amber-950/30 text-amber-200/90 border border-amber-500/20' : 'bg-amber-50 text-amber-900 border border-amber-200'
        }`}>
          <span className="material-symbols-outlined text-amber-400 text-base shrink-0 mt-0.5">lightbulb</span>
          <div>
            <span className="font-bold block mb-0.5">Efficiency Tip:</span>
            <span>{currentModeDetails.advice}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
