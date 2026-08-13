import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Zap,
  Shield,
  Truck,
  ChevronRight,
  ChevronLeft,
  Battery,
  Video,
  Sun,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Layers,
  Activity,
  Calculator,
  MessageSquare,
  Award,
  Globe,
  ShoppingCart,
  Eye,
  Star,
  Check
} from 'lucide-react';
import { Product } from '../types';
import { SOLAR_PACKAGES, SolarPackage } from '../data/quote-data';

interface HeroSectionProps {
  onNavigate: (tab: string) => void;
  onSelectCategory: (category: string) => void;
  onViewProduct: (product: Product) => void;
  products: Product[];
  isLoadingProducts: boolean;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onNavigate,
  onSelectCategory,
  onViewProduct,
  products,
  isLoadingProducts,
}) => {
  // Highlight Carousel State
  const [highlightIndex, setHighlightIndex] = useState(0);

  // Combine featured products with official solar system packages for spotlight
  const spotlightItems = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      subtitle: string;
      badge: string;
      price: number;
      originalPrice?: number;
      image: string;
      specs: string[];
      isPackage: boolean;
      rawItem: any;
    }> = [];

    // Add top 3 solar packages
    const topPackages = [...SOLAR_PACKAGES.lithium.slice(0, 2), ...SOLAR_PACKAGES.tubular.slice(0, 1)];
    topPackages.forEach((pkg) => {
      list.push({
        id: pkg.id,
        title: pkg.name,
        subtitle: `${pkg.kva} • ${pkg.batteryInfo}`,
        badge: pkg.tech === 'lithium' ? 'LFP Lithium Package' : 'Tubular Solar Package',
        price: pkg.price,
        image: 'https://firebasestorage.googleapis.com/v0/b/gen-lang-client-0122140096.firebasestorage.app/o/skyit%20logo.png?alt=media&token=639a434a-2fc0-4063-ac43-4ca872cb99ae',
        specs: [pkg.acSupport, `${pkg.panels} x 550W Panels`, pkg.cableSize],
        isPackage: true,
        rawItem: pkg,
      });
    });

    // Add top discounted products
    if (products && products.length > 0) {
      const topProds = [...products]
        .sort((a, b) => (b.discountPercent || 0) - (a.discountPercent || 0))
        .slice(0, 3);

      topProds.forEach((prod) => {
        list.push({
          id: prod.id,
          title: prod.name,
          subtitle: prod.category,
          badge: prod.discountPercent > 0 ? `-${prod.discountPercent}% OFF` : 'Best Seller',
          price: prod.price,
          originalPrice: prod.originalPrice,
          image: prod.image,
          specs: [prod.description, ...(prod.features?.slice(0, 2) || [])],
          isPackage: false,
          rawItem: prod,
        });
      });
    }

    return list;
  }, [products]);

  // Auto-rotate spotlight every 5s
  useEffect(() => {
    if (spotlightItems.length <= 1) return;
    const interval = setInterval(() => {
      setHighlightIndex((prev) => (prev + 1) % spotlightItems.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [spotlightItems]);

  // Quick load preset state
  const [selectedLoadPreset, setSelectedLoadPreset] = useState<'basic' | 'home' | 'commercial' | 'cctv'>('home');

  const loadPresetDetails = {
    basic: {
      title: 'Starter Power System (1.5 - 2.5 KVA)',
      loadText: '10x LED Bulbs, Smart TV, Laptops, Ceiling Fans & Decoder',
      recPackage: '1.5 KVA / 2.5 KVA Solar Backup System',
      estPrice: '₦948,000 - ₦1,850,000',
      actionTab: 'quote',
      category: 'Inverters',
      icon: '⚡',
    },
    home: {
      title: 'Standard Residence (3.5 - 5.0 KVA)',
      loadText: '1-2 Inverter ACs, Deep Freezer, Fridge, TV, Fans & Water Pump',
      recPackage: '3.5 KVA / 5.0 KVA LFP Lithium PowerWall Package',
      estPrice: '₦2,450,000 - ₦4,548,000',
      actionTab: 'quote',
      category: 'Inverters',
      icon: '🏡',
    },
    commercial: {
      title: 'Commercial Microgrid (6.0 - 10.0+ KVA)',
      loadText: '3+ Heavy AC Units, Commercial Freezers, Servers & Offices',
      recPackage: '6.0 KVA / 10.0 KVA High Capacity Solar Array',
      estPrice: '₦4,548,000 - ₦6,150,000+',
      actionTab: 'quote',
      category: 'Inverters',
      icon: '🏢',
    },
    cctv: {
      title: 'Starlight Security & AI Surveillance',
      loadText: '24/7 Starlight Color Night Vision Cameras, NVR & Gate Automation',
      recPackage: 'Smart PoE CCTV Array + Solar Power Backing',
      estPrice: 'Custom Site Quotation',
      actionTab: 'contact',
      category: 'Security Systems',
      icon: '📹',
    },
  };

  const currentPreset = loadPresetDetails[selectedLoadPreset];

  return (
    <div className="w-full relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white rounded-3xl border border-slate-800 shadow-2xl">
      {/* Background Decorative Ambient Gradients */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-brand/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.03] pointer-events-none" />

      {/* Main Hero Container */}
      <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 py-8 sm:py-12 lg:py-16 space-y-10">
        
        {/* Top Status Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5 bg-slate-800/80 border border-slate-700/60 px-3 py-1.5 rounded-full shadow-inner">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-emerald-400 font-mono text-[11px] font-bold uppercase tracking-wider">
              SkyIT Grid Active • 36 States Certified Installers
            </span>
          </div>

          <div className="flex items-center gap-5 text-xs font-medium text-slate-300">
            <span className="flex items-center gap-1.5">
              <Globe size={14} className="text-amber-400" />
              <span>Nationwide Logistics</span>
            </span>
            <span className="hidden sm:inline text-slate-700">•</span>
            <span className="hidden sm:flex items-center gap-1.5">
              <Award size={14} className="text-amber-400" />
              <span>Grade-A LFP & MPPT</span>
            </span>
            <span className="hidden md:inline text-slate-700">•</span>
            <span className="hidden md:flex items-center gap-1.5 text-emerald-400 font-bold">
              <CheckCircle2 size={14} />
              <span>24/7 Technical Desk</span>
            </span>
          </div>
        </div>

        {/* Hero Main Grid Layout */}
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* LEFT COLUMN: Headline & Quick Load Sizer */}
          <div className="lg:col-span-7 space-y-6 sm:space-y-8">
            
            {/* Tagline Badge */}
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500/20 to-amber-500/5 border border-amber-500/30 px-3.5 py-1.5 rounded-full text-amber-300 text-xs font-bold uppercase tracking-wider shadow-sm">
              <Sparkles size={14} className="fill-amber-400 text-amber-400 animate-pulse" />
              <span>Next-Gen Solar Microgrids & Security Systems</span>
            </div>

            {/* Main Title */}
            <h1 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl xl:text-6xl text-white tracking-tight leading-[1.12]">
              Uninterrupted Power &{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500">
                24/7 Smart Security
              </span>
            </h1>

            {/* Description */}
            <p className="text-xs sm:text-sm lg:text-base text-slate-300 leading-relaxed max-w-2xl font-normal">
              SkyIT Ventures engineers and deploys high-efficiency Monocrystalline solar panels, pure sine wave MPPT hybrid inverters, grade-A LFP lithium storage walls, and 24/7 Starlight PoE surveillance arrays for homes, estates, and commercial sites across Nigeria.
            </p>

            {/* Interactive Sizing Widget */}
            <div className="bg-slate-800/80 border border-slate-700/80 p-4 sm:p-5 rounded-2xl space-y-3.5 shadow-xl backdrop-blur-md">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Calculator size={15} className="text-amber-400" />
                  <span>Instant System Sizer: Select Your Load</span>
                </span>
                <span className="text-[10px] text-amber-300 font-mono font-extrabold bg-amber-500/20 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
                  AI Matched
                </span>
              </div>

              {/* Preset Selector Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(Object.keys(loadPresetDetails) as Array<keyof typeof loadPresetDetails>).map((key) => {
                  const item = loadPresetDetails[key];
                  const isSelected = selectedLoadPreset === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedLoadPreset(key)}
                      className={`px-3 py-2.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 text-center ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20 scale-[1.02]'
                          : 'bg-slate-900/90 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <span>{item.icon}</span>
                      <span className="capitalize">{key === 'basic' ? 'Basic Load' : key === 'home' ? 'Home (ACs)' : key === 'commercial' ? 'Commercial' : 'Starlight CCTV'}</span>
                    </button>
                  );
                })}
              </div>

              {/* Selected Preset Details Box */}
              <div className="bg-slate-900/90 border border-amber-500/20 p-3.5 sm:p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 shadow-inner">
                <div className="space-y-1 min-w-0">
                  <h4 className="font-bold text-white text-xs sm:text-sm flex items-center gap-1.5">
                    <span>{currentPreset.title}</span>
                  </h4>
                  <p className="text-[11px] text-slate-300 line-clamp-2">
                    {currentPreset.loadText}
                  </p>
                  <p className="text-[11.5px] text-amber-400 font-mono font-bold pt-0.5">
                    Est. Investment: {currentPreset.estPrice}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (currentPreset.actionTab === 'quote') {
                      onNavigate('quote');
                    } else if (currentPreset.actionTab === 'contact') {
                      onNavigate('contact');
                    } else {
                      onSelectCategory(currentPreset.category);
                      onNavigate('shop');
                    }
                  }}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer shadow-md transition-all active:scale-95"
                >
                  <span>Explore Solution</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>

            {/* Main Primary Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-1">
              <button
                type="button"
                onClick={() => onNavigate('quote')}
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-98 text-slate-950 text-xs sm:text-sm font-black py-3.5 px-6 rounded-xl flex items-center gap-2 uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
              >
                <Zap size={17} className="fill-slate-950" />
                <span>Turnkey Solar Packages</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('ai')}
                className="bg-slate-800 hover:bg-slate-700 border border-amber-500/30 text-white text-xs sm:text-sm font-bold py-3.5 px-5 rounded-xl flex items-center gap-2 uppercase tracking-wider shadow-sm transition-all cursor-pointer"
              >
                <Sparkles size={17} className="text-amber-400 fill-amber-400/20" />
                <span>Consult AI Advisor</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('shop')}
                className="bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 text-xs sm:text-sm font-semibold py-3.5 px-5 rounded-xl flex items-center gap-2 transition-all cursor-pointer"
              >
                <Layers size={17} className="text-amber-400" />
                <span>Shop Hardware</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('tracker')}
                className="bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 text-xs sm:text-sm font-semibold py-3.5 px-5 rounded-xl flex items-center gap-2 transition-all cursor-pointer"
              >
                <Truck size={17} className="text-emerald-400" />
                <span>Track Logistics</span>
              </button>
            </div>

          </div>

          {/* RIGHT COLUMN: Live Carousel & Core Technical Pillars */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Live Featured Spotlight Card */}
            <div className="bg-slate-800/90 border border-slate-700/90 p-5 rounded-2xl shadow-xl relative overflow-hidden space-y-4 backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-300">
                    Live System Spotlight
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('quote')}
                  className="text-[10px] font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer border border-amber-500/20"
                >
                  <span>All Systems</span>
                  <ChevronRight size={12} />
                </button>
              </div>

              {isLoadingProducts ? (
                <div className="p-8 text-center space-y-3 animate-pulse">
                  <div className="w-20 h-20 bg-slate-700 rounded-xl mx-auto" />
                  <div className="h-4 bg-slate-700 rounded w-2/3 mx-auto" />
                  <div className="h-3 bg-slate-700 rounded w-1/2 mx-auto" />
                </div>
              ) : spotlightItems.length > 0 ? (
                <div className="relative min-h-[170px] flex flex-col justify-between space-y-4">
                  <AnimatePresence mode="wait">
                    {spotlightItems.map((item, idx) => {
                      if (idx !== highlightIndex) return null;
                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.3 }}
                          className="flex gap-4 items-center"
                        >
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-2xl bg-white border border-slate-700 shrink-0 shadow-md"
                          />
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md font-extrabold uppercase tracking-wider inline-block">
                                {item.badge}
                              </span>
                            </div>
                            <h4
                              className="text-sm font-display font-extrabold text-white line-clamp-2 leading-snug cursor-pointer hover:text-amber-300 transition-colors"
                              onClick={() => {
                                if (!item.isPackage) {
                                  onViewProduct(item.rawItem);
                                } else {
                                  onNavigate('quote');
                                }
                              }}
                              title={item.title}
                            >
                              {item.title}
                            </h4>

                            <p className="text-xs text-slate-300 line-clamp-1">
                              {item.subtitle}
                            </p>

                            <div className="flex items-baseline gap-2 pt-1 font-sans">
                              <span className="text-base font-black text-amber-300 tracking-tight">
                                ₦{item.price.toLocaleString('en-US').replace(/[\s\u00A0\u202F]+/g, '')}
                              </span>
                              {item.originalPrice && item.originalPrice > item.price && (
                                <span className="text-xs text-slate-500 line-through">
                                  ₦{item.originalPrice.toLocaleString('en-US').replace(/[\s\u00A0\u202F]+/g, '')}
                                </span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  {/* Carousel Controls */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-700/80">
                    <button
                      type="button"
                      onClick={() => {
                        const item = spotlightItems[highlightIndex];
                        if (item) {
                          if (item.isPackage) {
                            onNavigate('quote');
                          } else {
                            onViewProduct(item.rawItem);
                          }
                        }
                      }}
                      className="bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Inspect Item
                    </button>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {spotlightItems.map((_, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setHighlightIndex(idx)}
                            className={`h-1.5 rounded-full transition-all cursor-pointer ${
                              idx === highlightIndex ? 'w-5 bg-amber-400' : 'w-1.5 bg-slate-600'
                            }`}
                          />
                        ))}
                      </div>

                      <div className="flex items-center gap-1 ml-2">
                        <button
                          type="button"
                          onClick={() =>
                            setHighlightIndex(
                              (prev) => (prev - 1 + spotlightItems.length) % spotlightItems.length
                            )
                          }
                          className="p-1 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-all cursor-pointer"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setHighlightIndex((prev) => (prev + 1) % spotlightItems.length)
                          }
                          className="p-1 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-all cursor-pointer"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Technical Pillars Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-800/60 border border-slate-700/80 p-3.5 rounded-2xl flex items-start gap-3 shadow-inner">
                <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl shrink-0 border border-amber-500/20">
                  <Zap size={18} />
                </div>
                <div>
                  <h5 className="font-bold text-white text-xs">MPPT Hybrid Inverters</h5>
                  <p className="text-[11px] text-slate-400 mt-0.5">98.5% Conversion Efficiency</p>
                </div>
              </div>

              <div className="bg-slate-800/60 border border-slate-700/80 p-3.5 rounded-2xl flex items-start gap-3 shadow-inner">
                <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl shrink-0 border border-purple-500/20">
                  <Battery size={18} />
                </div>
                <div>
                  <h5 className="font-bold text-white text-xs">Grade-A LFP Storage</h5>
                  <p className="text-[11px] text-slate-400 mt-0.5">6,000+ Cycles (10+ Yrs)</p>
                </div>
              </div>

              <div className="bg-slate-800/60 border border-slate-700/80 p-3.5 rounded-2xl flex items-start gap-3 shadow-inner">
                <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl shrink-0 border border-blue-500/20">
                  <Video size={18} />
                </div>
                <div>
                  <h5 className="font-bold text-white text-xs">Starlight PoE CCTV</h5>
                  <p className="text-[11px] text-slate-400 mt-0.5">24/7 Full-Color Night Vision</p>
                </div>
              </div>

              <div className="bg-slate-800/60 border border-slate-700/80 p-3.5 rounded-2xl flex items-start gap-3 shadow-inner">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl shrink-0 border border-emerald-500/20">
                  <Shield size={18} />
                </div>
                <div>
                  <h5 className="font-bold text-white text-xs">Certified Warranty</h5>
                  <p className="text-[11px] text-slate-400 mt-0.5">Full On-Site Physical Support</p>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Bottom Metrics Counter Bar */}
        <div className="pt-8 border-t border-slate-800/80 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="bg-slate-800/50 border border-slate-700/60 p-4 rounded-2xl">
            <span className="font-display font-black text-2xl sm:text-3xl text-amber-300 block">
              8.4 MW+
            </span>
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block mt-0.5">
              Clean Power Deployed
            </span>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/60 p-4 rounded-2xl">
            <span className="font-display font-black text-2xl sm:text-3xl text-white block">
              12,500+
            </span>
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block mt-0.5">
              Installed Solar Modules
            </span>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/60 p-4 rounded-2xl">
            <span className="font-display font-black text-2xl sm:text-3xl text-white block">
              3,200+
            </span>
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block mt-0.5">
              Active Microgrids
            </span>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/60 p-4 rounded-2xl">
            <span className="font-display font-black text-2xl sm:text-3xl text-emerald-400 block">
              36 States
            </span>
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block mt-0.5">
              Nationwide Coverage
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
