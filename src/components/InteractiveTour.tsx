import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  ChevronRight, 
  ChevronLeft, 
  X, 
  Search, 
  Zap, 
  Calculator, 
  ShoppingBag, 
  Truck, 
  Bot, 
  Sun, 
  ShieldCheck, 
  CreditCard,
  CheckCircle2
} from 'lucide-react';

export interface TourStep {
  id: string;
  targetId?: string;
  mobileTargetId?: string;
  title: string;
  description: string;
  tab: 'home' | 'shop' | 'quote' | 'ai' | 'tracker' | 'admin' | 'contact' | 'about' | 'blog' | 'owner';
  badge: string;
  icon: React.ElementType;
  noOverlay?: boolean;
  paymentOptions?: boolean;
}

interface InteractiveTourProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  onNavigateTab: (tab: 'home' | 'shop' | 'quote' | 'ai' | 'tracker' | 'admin' | 'contact' | 'about' | 'blog' | 'owner') => void;
  onExpandMobileSearch?: () => void;
  onCloseMobileSearch?: () => void;
}

export const InteractiveTour: React.FC<InteractiveTourProps> = ({
  isOpen,
  onClose,
  activeTab,
  onNavigateTab,
  onExpandMobileSearch,
  onCloseMobileSearch
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // 1. Screen size detection
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 2. Define tour steps dynamically based on screen size
  const steps: TourStep[] = useMemo(() => [
    {
      id: 'welcome',
      title: 'Welcome to SkyIT Ventures 🚀',
      description: 'Explore Nigeria’s premier engineering platform for tier-[#1] solar equipment, hybrid microgrids, smart CCTV security, and AI energy diagnostics. Take this guided 10-step tour to master our app.',
      tab: 'home',
      badge: '1. Welcome Guide',
      icon: Sparkles,
      noOverlay: true
    },
    {
      id: 'search',
      targetId: 'tour-search-bar',
      mobileTargetId: 'tour-search-bar-mobile',
      title: 'Instant Search & Smart Camera AI 🔍',
      description: isMobile 
        ? 'Tap the search bar or camera icon to perform AI Visual Equipment Recognition right on your phone.' 
        : 'Search solar panels, lithium batteries, and inverters by name or SKU. Click the camera icon for AI Visual Equipment Recognition.',
      tab: 'home',
      badge: '2. Search & Camera AI',
      icon: Search
    },
    {
      id: 'home-packages',
      targetId: 'tour-home-packages',
      title: 'System Sizing & Battery Selector ⚡',
      description: 'Compare Lithium-ion vs Tubular battery configurations. Inspect live system capacities, solar array requirements, and backup runtimes for 1.5kVA to 10kVA setups.',
      tab: 'home',
      badge: '3. Solar Capacity Sizer',
      icon: Zap
    },
    {
      id: 'home-audit',
      targetId: 'tour-home-audit',
      title: 'Precision Load Audit & PDF Export 🧮',
      description: 'Calculate household power loads by adjusting appliance counts (bulbs, fans, TV, fridge, AC). Get instant KVA recommendations and download official PDF audit specs.',
      tab: 'home',
      badge: '4. Energy Load Audit',
      icon: Calculator
    },
    {
      id: 'home-shop',
      targetId: 'tour-home-shop',
      title: 'Tier-1 Hardware Component Shop 🛍️',
      description: 'Browse industrial-grade monocrystalline solar panels, pure sine wave inverters, LFP lithium batteries, and 4K CCTV security kits with transparent pricing.',
      tab: 'home',
      badge: '5. Equipment Catalog',
      icon: ShoppingBag
    },
    {
      id: 'home-tracking',
      targetId: 'tour-home-tracking',
      title: 'Deployment Logistics Tracker 🚚',
      description: 'Check real-time hardware dispatch progress and field engineer installation schedules across all 36 Nigerian states directly from the homepage.',
      tab: 'home',
      badge: '6. Deployment Tracker',
      icon: Truck
    },
    {
      id: 'ai-advisor',
      targetId: 'tour-ai-advisor-target',
      title: 'AI Solar Engineering Specialist 🤖',
      description: 'Converse with our Gemini-powered AI energy consultant to design custom microgrid blueprints, estimate complex commercial loads, and receive equipment advice.',
      tab: 'ai',
      badge: '7. AI Engineer Chat',
      icon: Bot
    },
    {
      id: 'solar-packages',
      targetId: 'tour-solar-packages-target',
      title: 'Turnkey Solar Kits & Custom Mega-Quotes ☀️',
      description: 'Explore pre-engineered hybrid solar kits complete with installation and surge protection, or request a custom mega-quote for 15kVA to 100kVA+ installations.',
      tab: 'quote',
      badge: '8. Turnkey Solar Hub',
      icon: Sun
    },
    {
      id: 'order-tracking',
      targetId: 'tour-tracker-target',
      title: 'Logistics Dashboard & Verification 🛡️',
      description: 'Access the dedicated logistics hub to track active deployments, view engineer reports, and verify order delivery status using your reference ID.',
      tab: 'tracker',
      badge: '9. Logistics Hub',
      icon: ShieldCheck
    },
    {
      id: 'payment-methods',
      targetId: 'tour-cart-btn',
      title: 'Flutterwave & Pay on Delivery 💳',
      description: 'SkyIT Ventures supports instant online payment via Flutterwave (cards, bank transfer, USSD) and Pay on Delivery for most eligible items across Nigeria.',
      tab: 'shop',
      badge: '10. Website Payments',
      icon: CreditCard,
      paymentOptions: true
    }
  ], [isMobile]);

  // Reset to first step when tour is opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
    }
  }, [isOpen]);

  const currentStep = steps[currentStepIndex];

  // 3. Tab navigation trigger & mobile search expansion
  useEffect(() => {
    if (!isOpen || !currentStep) return;

    if (activeTab !== currentStep.tab) {
      onNavigateTab(currentStep.tab);
    }

    if (currentStep.id === 'search' && isMobile) {
      onExpandMobileSearch?.();
    } else {
      onCloseMobileSearch?.();
    }
  }, [isOpen, currentStepIndex, currentStep, activeTab, onNavigateTab, isMobile, onExpandMobileSearch, onCloseMobileSearch]);

  // 4. Coordinates tracking with 200ms polling loop (smooth position lock)
  const updateCoordinates = useCallback(() => {
    if (!isOpen || !currentStep || currentStep.noOverlay) {
      setTargetRect(null);
      return;
    }

    const preferredId = isMobile && currentStep.mobileTargetId ? currentStep.mobileTargetId : currentStep.targetId;
    let el = preferredId ? document.getElementById(preferredId) : null;
    
    // Fallback if preferred element is hidden or zero height
    if (!el || el.offsetWidth === 0 || el.offsetHeight === 0) {
      if (currentStep.targetId) {
        el = document.getElementById(currentStep.targetId);
      }
    }

    if (el && el.offsetWidth > 0 && el.offsetHeight > 0) {
      const rect = el.getBoundingClientRect();
      setTargetRect(prev => {
        if (
          prev &&
          Math.abs(prev.top - rect.top) < 1 &&
          Math.abs(prev.left - rect.left) < 1 &&
          Math.abs(prev.width - rect.width) < 1 &&
          Math.abs(prev.height - rect.height) < 1
        ) {
          return prev;
        }
        return rect;
      });
    } else {
      setTargetRect(null);
    }
  }, [isOpen, currentStep, isMobile]);

  // Smooth scroll target element into viewport on step change
  useEffect(() => {
    if (!isOpen || !currentStep || currentStep.noOverlay) return;

    const preferredId = isMobile && currentStep.mobileTargetId ? currentStep.mobileTargetId : currentStep.targetId;
    let el = preferredId ? document.getElementById(preferredId) : null;
    if (!el && currentStep.targetId) {
      el = document.getElementById(currentStep.targetId);
    }

    if (el) {
      // Calculate scroll position to place section top into view with sticky header clearance (90px)
      const headerOffset = 90;
      const elementPosition = el.getBoundingClientRect().top;
      const offsetPosition = window.scrollY + elementPosition - headerOffset;

      window.scrollTo({
        top: Math.max(0, offsetPosition),
        behavior: 'smooth'
      });
    }
  }, [isOpen, currentStepIndex, currentStep, isMobile]);

  // Register event listeners & 200ms polling for dynamic target tracking
  useEffect(() => {
    if (!isOpen) return;

    updateCoordinates();
    window.addEventListener('resize', updateCoordinates);
    window.addEventListener('scroll', updateCoordinates, true);
    const interval = setInterval(updateCoordinates, 200);

    return () => {
      window.removeEventListener('resize', updateCoordinates);
      window.removeEventListener('scroll', updateCoordinates, true);
      clearInterval(interval);
    };
  }, [isOpen, updateCoordinates]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handleBack();
      } else if (e.key === 'Escape') {
        handleComplete();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex, steps.length]);

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('hasCompletedSkyITInteractiveTour', 'true');
    onCloseMobileSearch?.();
    onClose();
  };

  if (!isOpen || !currentStep) return null;

  const StepIcon = currentStep.icon;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200000] pointer-events-none">
        {/* Full Dim / Click-catcher Overlay */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleComplete}
          className={`absolute inset-0 pointer-events-auto transition-colors ${
            targetRect && !currentStep.noOverlay 
              ? 'bg-transparent' 
              : 'bg-[#070b12]/70'
          }`}
        />

        {/* Dynamic Spotlight Ring Frame around Target Element */}
        {targetRect && !currentStep.noOverlay && (
          <motion.div
            className="fixed border-2 border-[#0066ff] rounded-2xl ring-[9999px] ring-[#070b12]/80 shadow-[0_0_35px_rgba(0,102,255,0.7)] z-[199998] pointer-events-none"
            style={{
              top: `${targetRect.top - 6}px`,
              left: `${targetRect.left - 6}px`,
              width: `${targetRect.width + 12}px`,
              height: `${targetRect.height + 12}px`,
              transition: 'top 0.35s ease-out, left 0.35s ease-out, width 0.35s ease-out, height 0.35s ease-out'
            }}
          />
        )}

        {/* Fixed Control Dock Panel */}
        <div className={`fixed z-[199999] pointer-events-auto flex justify-center ${
          currentStep.noOverlay 
            ? 'inset-0 items-center p-4' 
            : 'inset-x-4 bottom-5 md:inset-auto md:bottom-8 md:right-8'
        }`}>
          <motion.div
            key={currentStep.id}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="w-full max-w-[440px] bg-[#0e131e] border border-[#0066ff]/40 rounded-3xl p-6 shadow-2xl shadow-black/90 text-left relative overflow-hidden"
          >
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#0066ff]/15 rounded-full blur-2xl pointer-events-none" />

            {/* Header: Badge & Close */}
            <div className="flex items-center justify-between gap-3 mb-3.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0066ff]/20 border border-[#0066ff]/40 text-[#b3c5ff] text-[11px] font-bold uppercase tracking-wider">
                <StepIcon className="w-3.5 h-3.5 text-[#0066ff]" />
                <span>{currentStep.badge}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-slate-400">
                  {currentStepIndex + 1} of {steps.length}
                </span>
                <button
                  type="button"
                  onClick={handleComplete}
                  className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all cursor-pointer"
                  title="Close Tour"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Step Body */}
            <div className="space-y-2 mb-5">
              <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight font-display">
                {currentStep.title}
              </h3>
              <p className="text-xs sm:text-sm text-gray-300 leading-relaxed font-normal">
                {currentStep.description}
              </p>

              {/* Payment Feature Badges */}
              {currentStep.paymentOptions && (
                <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Flutterwave Secure Pay
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Pay on Delivery (COD)
                  </span>
                </div>
              )}
            </div>

            {/* Footer Row */}
            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <div className="flex items-center gap-1">
                {steps.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentStepIndex(idx)}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      idx === currentStepIndex 
                        ? 'w-5 bg-[#0066ff]' 
                        : idx < currentStepIndex
                        ? 'w-1.5 bg-[#b3c5ff]/40'
                        : 'w-1.5 bg-white/15'
                    }`}
                    title={`Go to step ${idx + 1}`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                {currentStepIndex > 0 && (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white font-bold text-xs transition-all cursor-pointer flex items-center gap-1 border border-white/10"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleNext}
                  className="px-4 py-1.5 rounded-xl bg-[#0066ff] hover:bg-[#0052cc] text-white font-bold text-xs transition-all cursor-pointer flex items-center gap-1 shadow-lg shadow-[#0066ff]/30 active:scale-95"
                >
                  <span>{currentStepIndex === steps.length - 1 ? 'Finish' : 'Next'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};
