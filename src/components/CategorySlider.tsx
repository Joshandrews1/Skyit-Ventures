import React, { useEffect, useRef } from 'react';
import { Bolt, Cpu, Battery, ChevronRight, ChevronLeft, Sparkles, Tag, Sun, Shield, Layers, Activity } from 'lucide-react';

interface CategorySliderProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

const categoriesList = [
  {
    id: 'solar-panels',
    label: 'Solar Panels',
    categoryName: 'Solar Panels',
    renderCard: () => (
      <div className="w-full h-full bg-slate-900 flex flex-col justify-between p-3 relative overflow-hidden select-none">
        <div className="absolute right-[-8px] bottom-[-8px] opacity-20">
          <Sun className="w-16 h-16 text-brand" strokeWidth={1} />
        </div>
        <div className="relative z-10 flex items-center justify-between">
          <span className="bg-brand text-white text-[7px] font-black px-1.5 py-0.5 rounded-sm uppercase tracking-widest">
            Monocrystalline
          </span>
          <Sun className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '8s' }} />
        </div>
        <div className="relative z-10 text-left mt-auto">
          <div className="text-[12px] font-black text-white uppercase tracking-tight leading-none">
            High Efficiency
          </div>
          <div className="text-[9px] font-bold text-brand uppercase tracking-wider mt-1">
            PV Panels
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'inverters',
    label: 'Inverters',
    categoryName: 'Inverters',
    renderCard: () => (
      <div className="w-full h-full bg-slate-950 border border-slate-800 flex flex-col justify-between p-3 relative overflow-hidden select-none">
        <div className="absolute right-[-6px] bottom-[-6px] opacity-15">
          <Cpu className="w-16 h-16 text-slate-400" strokeWidth={1} />
        </div>
        <div className="relative z-10">
          <span className="bg-slate-800 text-slate-300 text-[7px] font-black px-1.5 py-0.5 rounded-sm uppercase tracking-widest border border-slate-700">
            Pure Sine Wave
          </span>
        </div>
        <div className="relative z-10 text-left mt-auto">
          <div className="text-[12px] font-black text-white uppercase tracking-tight leading-none">
            Smart Inverters
          </div>
          <div className="text-[9px] font-bold text-orange-400 uppercase tracking-wider mt-1">
            Power Units
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'batteries',
    label: 'LFP Batteries',
    categoryName: 'Batteries',
    renderCard: () => (
      <div className="w-full h-full bg-zinc-900 flex flex-col justify-between p-3 relative overflow-hidden select-none">
        <div className="absolute right-[-6px] bottom-[-6px] opacity-15">
          <Battery className="w-16 h-16 text-emerald-500" strokeWidth={1} />
        </div>
        <div className="relative z-10 flex items-center justify-between">
          <span className="bg-emerald-500/10 text-emerald-400 text-[7px] font-black px-1.5 py-0.5 rounded-sm uppercase tracking-widest border border-emerald-500/20">
            LiFePO4 Cells
          </span>
          <div className="w-2.5 h-1 bg-emerald-500 rounded-xs animate-pulse" />
        </div>
        <div className="relative z-10 text-left mt-auto">
          <div className="text-[12px] font-black text-white uppercase tracking-tight leading-none">
            Deep Cycle
          </div>
          <div className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider mt-1">
            LFP Storage
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'security',
    label: 'Security Systems',
    categoryName: 'Security Systems',
    renderCard: () => (
      <div className="w-full h-full bg-slate-900 border border-slate-800/85 flex flex-col justify-between p-3 relative overflow-hidden select-none">
        <div className="absolute right-[-6px] bottom-[-6px] opacity-15">
          <Shield className="w-16 h-16 text-sky-400" strokeWidth={1} />
        </div>
        <div className="relative z-10 flex items-center justify-between">
          <span className="bg-sky-500/10 text-sky-400 text-[7px] font-black px-1.5 py-0.5 rounded-sm uppercase tracking-widest border border-sky-500/20">
            Starlight PoE
          </span>
          <span className="flex h-1.5 w-1.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-sky-500"></span>
          </span>
        </div>
        <div className="relative z-10 text-left mt-auto">
          <div className="text-[12px] font-black text-white uppercase tracking-tight leading-none">
            IP Surveillance
          </div>
          <div className="text-[9px] font-bold text-sky-400 uppercase tracking-wider mt-1">
            Security Kits
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'accessories',
    label: 'Accessories',
    categoryName: 'Accessories',
    renderCard: () => (
      <div className="w-full h-full bg-slate-50 flex flex-col justify-between p-3 relative overflow-hidden select-none">
        <div className="absolute right-[-8px] bottom-[-8px] opacity-10">
          <Bolt className="w-16 h-16 text-slate-900" strokeWidth={1} />
        </div>
        <div className="relative z-10">
          <span className="bg-slate-200 text-slate-700 text-[7px] font-black px-1.5 py-0.5 rounded-sm uppercase tracking-widest border border-slate-300">
            Industrial
          </span>
        </div>
        <div className="relative z-10 text-left mt-auto">
          <div className="text-[12px] font-black text-slate-900 uppercase tracking-tight leading-none">
            Cables & Mounts
          </div>
          <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-1">
            MC4 Connectors
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'packages',
    label: 'Solar Packages',
    categoryName: 'All', // Completes the criteria to view packages/All
    renderCard: () => (
      <div className="w-full h-full bg-gradient-to-br from-amber-500 to-yellow-600 flex flex-col justify-between p-3 relative overflow-hidden select-none">
        <div className="absolute right-[-8px] bottom-[-8px] opacity-20">
          <Layers className="w-16 h-16 text-white" strokeWidth={1} />
        </div>
        <div className="relative z-10">
          <span className="bg-white/20 text-white text-[7px] font-black px-1.5 py-0.5 rounded-sm uppercase tracking-widest">
            BEST VALUE
          </span>
        </div>
        <div className="relative z-10 text-left mt-auto">
          <div className="text-[12px] font-black text-white uppercase tracking-tight leading-none drop-shadow-xs">
            Complete Kits
          </div>
          <div className="text-[9px] font-bold text-amber-100 uppercase tracking-wider mt-1">
            Hybrid Packages
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'awoof',
    label: 'Awoof Deals',
    categoryName: 'All',
    renderCard: () => (
      <div className="w-full h-full bg-gradient-to-tr from-orange-600 to-red-650 flex flex-col justify-between p-3 relative overflow-hidden select-none">
        <div className="absolute right-[-8px] bottom-[-8px] opacity-20">
          <Tag className="w-16 h-16 text-white animate-pulse" strokeWidth={1} />
        </div>
        <div className="relative z-10">
          <span className="bg-red-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-sm uppercase tracking-widest border border-red-400/30">
            FLASH PROMO
          </span>
        </div>
        <div className="relative z-10 text-left mt-auto">
          <div className="text-[12px] font-black text-white uppercase tracking-tight leading-none">
            Awoof of Month
          </div>
          <div className="text-[9px] font-bold text-yellow-300 uppercase tracking-wider mt-1">
            Limited Stock
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'hybrid',
    label: 'Hybrid Systems',
    categoryName: 'Inverters',
    renderCard: () => (
      <div className="w-full h-full bg-gradient-to-br from-cyan-900 to-slate-900 flex flex-col justify-between p-3 relative overflow-hidden select-none">
        <div className="absolute right-[-8px] bottom-[-8px] opacity-20">
          <Activity className="w-16 h-16 text-cyan-400" strokeWidth={1} />
        </div>
        <div className="relative z-10">
          <span className="bg-cyan-500/25 text-cyan-300 text-[7px] font-black px-1.5 py-0.5 rounded-sm uppercase tracking-widest border border-cyan-500/20">
            Grid Sync
          </span>
        </div>
        <div className="relative z-10 text-left mt-auto">
          <div className="text-[12px] font-black text-white uppercase tracking-tight leading-none">
            Microgrid Kits
          </div>
          <div className="text-[9px] font-bold text-cyan-300 uppercase tracking-wider mt-1">
            Hybrid Ready
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'smart-monitoring',
    label: 'Smart Monitoring',
    categoryName: 'Accessories',
    renderCard: () => (
      <div className="w-full h-full bg-slate-950 border border-indigo-950 flex flex-col justify-between p-3 relative overflow-hidden select-none">
        <div className="absolute right-[-8px] bottom-[-8px] opacity-20">
          <Cpu className="w-16 h-16 text-indigo-400" strokeWidth={1} />
        </div>
        <div className="relative z-10">
          <span className="bg-indigo-500/20 text-indigo-300 text-[7px] font-black px-1.5 py-0.5 rounded-sm uppercase tracking-widest border border-indigo-500/30">
            Smart Home
          </span>
        </div>
        <div className="relative z-10 text-left mt-auto">
          <div className="text-[12px] font-black text-white uppercase tracking-tight leading-none">
            Power Tracking
          </div>
          <div className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider mt-1">
            IoT Hubs
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'new-arrivals',
    label: 'New Arrivals',
    categoryName: 'All',
    renderCard: () => (
      <div className="w-full h-full bg-gradient-to-tr from-purple-900 to-indigo-900 flex flex-col justify-between p-3 relative overflow-hidden select-none">
        <div className="absolute right-[-8px] bottom-[-8px] opacity-25">
          <Sparkles className="w-16 h-16 text-purple-400" strokeWidth={1} />
        </div>
        <div className="relative z-10">
          <span className="bg-purple-500/30 text-purple-200 text-[7px] font-black px-1.5 py-0.5 rounded-sm uppercase tracking-widest border border-purple-500/20 animate-pulse">
            NEW RELEASES
          </span>
        </div>
        <div className="relative z-10 text-left mt-auto">
          <div className="text-[12px] font-black text-white uppercase tracking-tight leading-none">
            Next-Gen Solar
          </div>
          <div className="text-[9px] font-bold text-purple-300 uppercase tracking-wider mt-1">
            Latest Tech
          </div>
        </div>
      </div>
    )
  }
];

export const CategorySlider: React.FC<CategorySliderProps> = ({ selectedCategory, onSelectCategory }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollAmount = clientWidth * 0.7;
      scrollRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Auto-sliding interval loop (pause on hover)
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    let intervalId: NodeJS.Timeout;

    const startAutoSlide = () => {
      intervalId = setInterval(() => {
        if (container) {
          const { scrollLeft, scrollWidth, clientWidth } = container;
          if (scrollLeft + clientWidth >= scrollWidth - 15) {
            container.scrollTo({ left: 0, behavior: 'smooth' });
          } else {
            container.scrollTo({ left: scrollLeft + 150, behavior: 'smooth' });
          }
        }
      }, 3500);
    };

    startAutoSlide();

    const handleMouseEnter = () => clearInterval(intervalId);
    const handleMouseLeave = () => startAutoSlide();

    container.addEventListener('mouseenter', handleMouseEnter);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      clearInterval(intervalId);
      if (container) {
        container.removeEventListener('mouseenter', handleMouseEnter);
        container.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, []);

  return (
    <section className="relative py-2 select-none">
      <div className="max-w-7xl mx-auto">
        {/* Jumia/E-commerce Style Card Container with Border */}
        <div className="relative bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs">
          
          {/* Left Overlapping Arrow Button (Vertically Centered) */}
          <button
            onClick={() => scroll('left')}
            className="absolute -left-5 top-1/2 -translate-y-1/2 z-20 size-10 rounded-full bg-slate-400/90 hover:bg-slate-500 text-white shadow-md flex items-center justify-center transition-all cursor-pointer select-none active:scale-90 border border-white/20"
            aria-label="Scroll left"
          >
            <ChevronLeft size={22} strokeWidth={3} />
          </button>

          {/* Right Overlapping Arrow Button (Vertically Centered) */}
          <button
            onClick={() => scroll('right')}
            className="absolute -right-5 top-1/2 -translate-y-1/2 z-20 size-10 rounded-full bg-slate-400/90 hover:bg-slate-500 text-white shadow-md flex items-center justify-center transition-all cursor-pointer select-none active:scale-90 border border-white/20"
            aria-label="Scroll right"
          >
            <ChevronRight size={22} strokeWidth={3} />
          </button>

          {/* Scrollable list */}
          <div
            ref={scrollRef}
            className="flex gap-4 sm:gap-5 overflow-x-auto pb-1 pt-1 snap-x scroll-smooth select-none"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {categoriesList.map((cat) => {
              const isSelected = selectedCategory === cat.categoryName;
              return (
                <div
                  key={cat.id}
                  onClick={() => onSelectCategory(cat.categoryName)}
                  className="flex-shrink-0 w-[120px] sm:w-[136px] snap-start group cursor-pointer"
                >
                  {/* Square graphic container with highlighted border if selected */}
                  <div className={`relative aspect-square w-full rounded-lg overflow-hidden bg-slate-50 border transition-all duration-300 ${
                    isSelected 
                      ? 'border-brand ring-2 ring-brand/10 shadow-sm' 
                      : 'border-slate-100/80 group-hover:shadow-sm group-hover:border-slate-300'
                  }`}>
                    {cat.renderCard()}
                    
                    {/* Dark gradient overlay for hover contrast */}
                    <div className="absolute inset-0 bg-black/5 opacity-100 group-hover:bg-black/0 transition-all duration-300" />
                  </div>

                  {/* Caption underneath - centered, grey color, text-xs */}
                  <div className="mt-2 text-center">
                    <span className={`font-sans text-xs transition-colors duration-200 ${
                      isSelected 
                        ? 'font-bold text-brand' 
                        : 'font-medium text-slate-700 group-hover:text-brand'
                    }`}>
                      {cat.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
