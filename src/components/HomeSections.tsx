import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Bolt, Home as HomeIcon, Globe, Leaf, ArrowRight, MapPin, Cpu, Battery, Briefcase, ChevronRight, ChevronLeft, Sparkles, Tag, Percent, Sun, Shield, Layers, Activity } from 'lucide-react';

// Using high-quality, lightweight, and reliable Unsplash CDN images for the home sections bento grid.
// This completely resolves Git sync size/existence issues and significantly accelerates page loading.
const imgCatalog = 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&w=800&q=80';
const imgAdvisor = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80';
const imgTracker = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80';
const imgPackages = 'https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=800&q=80';

interface HomeSectionsProps {
  onSelectCategory: (category: string) => void;
  onNavigate: (tab: string) => void;
}

// Custom performant 60fps animated counting component that triggers on scroll view
const AnimatedCounter: React.FC<{
  target: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
}> = ({ target, duration = 1500, suffix = '', prefix = '', decimals = 0 }) => {
  const [count, setCount] = useState(0);
  const elementRef = React.useRef<HTMLSpanElement>(null);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!hasStarted) return;

    let startTime: number | null = null;
    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // Easing out quadratic function for beautiful deceleration
      const easeProgress = progress * (2 - progress);
      setCount(easeProgress * target);
      
      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      }
    };

    animationFrameId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animationFrameId);
  }, [hasStarted, target, duration]);

  return (
    <span ref={elementRef} className="tabular-nums">
      {prefix}
      {count.toFixed(decimals)}
      {suffix}
    </span>
  );
};

export const HomeSections: React.FC<HomeSectionsProps> = ({ onSelectCategory, onNavigate }) => {
  const handleCategoryClick = (category: string) => {
    onSelectCategory(category);
    onNavigate('shop');
    setTimeout(() => {
      const el = document.getElementById('catalog-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 120);
  };

  return (
    <div className="space-y-16 py-10">
      
      {/* 1. Brand Impact Stats (Nigeria focused) */}
      <section className="relative z-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            
            <div className="bg-white border border-slate-200/80 shadow-3xs p-6 rounded-2xl flex flex-col items-center text-center group hover:border-brand/40 hover:shadow-xs transition-all duration-350">
              <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-4 text-brand group-hover:bg-brand/5 group-hover:text-brand transition-colors">
                <Bolt size={24} className="fill-brand/10 text-brand" />
              </div>
              <h3 className="font-display font-black text-2xl sm:text-3xl text-slate-900 mb-1">
                <AnimatedCounter target={8.4} decimals={1} suffix=" MW" />
              </h3>
              <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">
                Clean Energy Capacity
              </p>
            </div>

            <div className="bg-white border border-slate-200/80 shadow-3xs p-6 rounded-2xl flex flex-col items-center text-center group hover:border-brand/40 hover:shadow-xs transition-all duration-350">
              <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-4 text-brand group-hover:bg-brand/5 group-hover:text-brand transition-colors">
                <HomeIcon size={24} className="fill-brand/10 text-brand" />
              </div>
              <h3 className="font-display font-black text-2xl sm:text-3xl text-slate-900 mb-1">
                <AnimatedCounter target={2.4} decimals={1} suffix="K+" />
              </h3>
              <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">
                Nigerian Homes Powered
              </p>
            </div>

            <div className="bg-white border border-slate-200/80 shadow-3xs p-6 rounded-2xl flex flex-col items-center text-center group hover:border-brand/40 hover:shadow-xs transition-all duration-350">
              <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-4 text-brand group-hover:bg-brand/5 group-hover:text-brand transition-colors">
                <Globe size={24} className="text-brand" />
              </div>
              <h3 className="font-display font-black text-2xl sm:text-3xl text-slate-900 mb-1">
                <AnimatedCounter target={36} suffix=" States" />
              </h3>
              <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">
                Nationwide Coverage
              </p>
            </div>

            <div className="bg-white border border-slate-200/80 shadow-3xs p-6 rounded-2xl flex flex-col items-center text-center group hover:border-brand/40 hover:shadow-xs transition-all duration-350">
              <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-4 text-brand group-hover:bg-brand/5 group-hover:text-brand transition-colors">
                <Leaf size={24} className="fill-brand/10 text-brand" />
              </div>
              <h3 className="font-display font-black text-2xl sm:text-3xl text-slate-900 mb-1">
                <AnimatedCounter target={1.2} decimals={1} suffix="K T" />
              </h3>
              <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">
                Carbon Offset
              </p>
            </div>

          </div>
        </div>
      </section>



      {/* 2. Product Ecosystem (Bento Grid) */}
      <section className="bg-slate-50/70 border border-slate-200/60 rounded-3xl py-12 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 max-w-2xl mx-auto space-y-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-brand bg-brand-light px-2.5 py-1 rounded-md border border-brand/10">
              Connected Product Ecosystem
            </span>
            <h2 className="font-display font-black text-2xl sm:text-3xl text-slate-900 tracking-tight leading-tight mt-2">
              Discover Energy Freedom in All Forms
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Precision-engineered hardware working in perfect synergy with intelligent OIDC security protocols and AI-assisted diagnostics.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Bento Block 1: Product Catalog (8 columns wide) */}
            <motion.div 
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
              whileHover={{ y: -4, transition: { duration: 0.2, ease: "easeOut" } }}
              className="md:col-span-8 bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 relative overflow-hidden group hover:shadow-sm transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent pointer-events-none" />
              <div className="relative z-10 flex-1 space-y-4">
                <span className="inline-block px-2.5 py-1 bg-brand-light rounded-full text-[9px] font-extrabold text-brand border border-brand/10 uppercase tracking-wide">
                  Complete Catalog
                </span>
                <h3 className="font-display font-black text-xl sm:text-2xl text-slate-900">
                  Product Catalog
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Explore our comprehensive database of premium clean energy hardware, monocrystalline solar modules, pure sine wave intelligent inverters, deep cycle LFP storage cells, and premium industrial accessories.
                </p>
                <button
                  onClick={() => onNavigate('shop')}
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-brand hover:text-brand-hover transition-colors group/btn cursor-pointer uppercase tracking-wider"
                >
                  <span>Browse Product Catalog</span>
                  <ArrowRight size={13} className="transition-transform group-hover/btn:translate-x-1" />
                </button>
              </div>
              <div className="relative z-10 flex-1 h-44 sm:h-52 w-full rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center">
                <img 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  src={imgCatalog}
                  alt="SkyIT Premium Clean Energy Product Catalog solar array"
                  referrerPolicy="no-referrer"
                />
              </div>
            </motion.div>

            {/* Bento Block 2: AI Advisor (4 columns wide) */}
            <motion.div 
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
              whileHover={{ y: -4, transition: { duration: 0.2, ease: "easeOut" } }}
              className="md:col-span-4 bg-white border border-slate-200/80 rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden group hover:shadow-sm transition-all duration-300"
            >
              <div className="h-40 w-full rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center relative mb-4">
                <img 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  src={imgAdvisor}
                  alt="SkyIT AI Solar Advisor assistant dashboard"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-brand">
                  <Cpu size={14} />
                  <span className="text-[9px] font-black uppercase tracking-wider">Intelligent Assistant</span>
                </div>
                <h3 className="font-display font-black text-base text-slate-900">
                  AI Solar Advisor
                </h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Get tailored clean energy recommendations, instant solar quotes, and technical blueprints from our AI support expert.
                </p>
                <button
                  onClick={() => onNavigate('ai')}
                  className="text-[10px] font-bold text-brand hover:underline mt-2 inline-flex items-center gap-0.5"
                >
                  <span>Talk to AI Advisor</span>
                  <ChevronRight size={11} />
                </button>
              </div>
            </motion.div>

            {/* Bento Block 3: Track My Order (4 columns wide) */}
            <motion.div 
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
              whileHover={{ y: -4, transition: { duration: 0.2, ease: "easeOut" } }}
              className="md:col-span-4 bg-white border border-slate-200/80 rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden group hover:shadow-sm transition-all duration-300"
            >
              <div className="h-40 w-full rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center relative mb-4">
                <img 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  src={imgTracker}
                  alt="Track My Order parcel tracking dispatch and logistics"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-brand">
                  <MapPin size={14} />
                  <span className="text-[9px] font-black uppercase tracking-wider">Real-time Logistics</span>
                </div>
                <h3 className="font-display font-black text-base text-slate-900">
                  Track My Order
                </h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Check your clean energy hardware shipment status, custom installation scheduling progress, and real-time field-testing dispatch.
                </p>
                <button
                  onClick={() => onNavigate('tracker')}
                  className="text-[10px] font-bold text-brand hover:underline mt-2 inline-flex items-center gap-0.5"
                >
                  <span>Track Live Order Status</span>
                  <ChevronRight size={11} />
                </button>
              </div>
            </motion.div>

            {/* Bento Block 4: Solar Packages (8 columns wide) */}
            <motion.div 
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: 0.4, ease: "easeOut" }}
              whileHover={{ y: -4, transition: { duration: 0.2, ease: "easeOut" } }}
              className="md:col-span-8 bg-brand text-white border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 relative overflow-hidden group hover:shadow-lg transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-brand/20 to-transparent pointer-events-none" />
              <div className="relative z-10 flex-1 space-y-4">
                <div className="flex items-center gap-1.5 text-brand-light bg-brand-hover/60 w-fit px-2 py-0.5 rounded border border-white/10">
                  <Layers size={12} />
                  <span className="text-[8px] font-black uppercase tracking-widest leading-none">Hybrid Solar Kits</span>
                </div>
                <h3 className="font-display font-black text-xl sm:text-2xl text-white">
                  Solar Packages
                </h3>
                <p className="text-xs text-slate-200 leading-relaxed">
                  Discover pre-engineered and optimized hybrid clean energy packages. High-density LFP storage paired with smart panels and custom OIDC surveillance systems ready for immediate shipping and deployment.
                </p>
                <button
                  onClick={() => onNavigate('quote')}
                  className="bg-white hover:bg-slate-100 text-brand text-[10px] font-extrabold px-4 py-2 rounded-lg inline-flex items-center gap-1.5 uppercase tracking-wider cursor-pointer shadow-xs transition-colors"
                >
                  <span>Explore Solar Packages</span>
                  <ArrowRight size={12} />
                </button>
              </div>
              <div className="relative z-10 flex-1 h-44 sm:h-52 w-full rounded-2xl overflow-hidden bg-brand-hover border border-white/10 flex items-center justify-center">
                <img 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90" 
                  src={imgPackages}
                  alt="SkyIT Premium Home Solar Package smart installation"
                  referrerPolicy="no-referrer"
                />
              </div>
            </motion.div>

          </div>
        </div>
      </section>



    </div>
  );
};

