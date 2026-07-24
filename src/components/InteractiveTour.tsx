import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  X, 
  Check, 
  Compass, 
  Zap,
  CreditCard,
  Building2,
  Truck,
  ShieldCheck,
  Search,
  Cpu,
  Layers,
  ShoppingBag,
  Sun
} from 'lucide-react';

export interface TourStep {
  id: string;
  targetId?: string; // DOM ID of the element to highlight (optional for full-page steps)
  title: string;
  description: string;
  tab?: 'home' | 'shop' | 'quote' | 'ai' | 'tracker' | 'admin' | 'contact' | 'about' | 'blog' | 'owner';
  placement?: 'top' | 'bottom' | 'left' | 'right';
  badge?: string;
  paymentOptions?: boolean; // Special flag to render payment options
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to SkyIT Ventures',
    description: 'Nigeria’s premier platform for tier-1 solar equipment, hybrid microgrids, smart CCTV security, and enterprise IT hardware. Follow this quick interactive tour to explore load sizing, tracking, and seamless ordering.',
    tab: 'home',
    placement: 'bottom',
    badge: 'Welcome Guide'
  },
  {
    id: 'search',
    targetId: 'tour-search-bar',
    title: 'Instant Equipment Search',
    description: 'Quickly search tier-1 solar panels, LFP lithium batteries, pure sine wave inverters, and CCTV security hardware by name, KVA capacity, or SKU.',
    tab: 'shop',
    placement: 'bottom',
    badge: 'Search & Catalog'
  },
  {
    id: 'ai-advisor',
    targetId: 'tour-ai-advisor-header',
    title: 'AI Solar Sizing Advisor',
    description: 'Calculate your exact load requirement in seconds. Enter your household appliances to receive instant KVA sizing and custom equipment blueprints.',
    tab: 'ai',
    placement: 'bottom',
    badge: 'AI Diagnostic'
  },
  {
    id: 'solar-packages',
    targetId: 'tour-solar-packages-header',
    title: 'Turnkey Solar Kits',
    description: 'Explore pre-engineered hybrid solar packages complete with professional installation, heavy-duty cables, and surge protection for Nigerian homes and businesses.',
    tab: 'quote',
    placement: 'bottom',
    badge: 'Pre-Engineered Kits'
  },
  {
    id: 'order-tracking',
    targetId: 'tour-tracking-input',
    title: 'Live Order & Dispatch Tracking',
    description: 'Monitor your equipment delivery status and field engineer installation schedule in real-time across all 36 Nigerian states using your reference number.',
    tab: 'tracker',
    placement: 'bottom',
    badge: 'Logistics'
  },
  {
    id: 'payment-methods',
    targetId: 'tour-cart-btn',
    title: 'Flexible & Secure Payment Options',
    description: 'SkyIT Ventures offers two secure and flexible payment methods to suit your preferences:',
    tab: 'shop',
    placement: 'bottom',
    badge: 'Payment Options',
    paymentOptions: true
  }
];

interface InteractiveTourProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: 'home' | 'shop' | 'quote' | 'ai' | 'tracker' | 'admin' | 'contact' | 'about' | 'blog' | 'owner') => void;
  onExpandMobileSearch?: () => void;
}

export const InteractiveTour: React.FC<InteractiveTourProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onExpandMobileSearch
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const currentStep = TOUR_STEPS[currentStepIndex];

  // Reset to first step whenever tour is opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
    }
  }, [isOpen]);

  // Measure target element position without forcing re-scrolling
  const measureTarget = useCallback(() => {
    if (!isOpen || !currentStep || !currentStep.targetId) {
      setTargetRect(null);
      return;
    }

    let element = document.getElementById(currentStep.targetId);
    // Fallback for mobile if desktop element is hidden (width/height 0) or missing
    if (!element || element.offsetWidth === 0 || element.offsetHeight === 0) {
      element = document.getElementById(currentStep.targetId + '-mobile');
    }

    if (element && element.offsetWidth > 0 && element.offsetHeight > 0) {
      setTargetRect(element.getBoundingClientRect());
    } else {
      setTargetRect(null);
    }
  }, [isOpen, currentStep]);

  // Handle step changes: navigate tab and scroll target into view
  useEffect(() => {
    if (!isOpen || !currentStep) return;

    if (currentStep.tab) {
      onNavigateTab(currentStep.tab);
    }

    if (currentStep.id === 'search') {
      onExpandMobileSearch?.();
    }

    // Function to attempt finding, scrolling to, and measuring the target element
    const attemptScrollAndMeasure = () => {
      if (!currentStep.targetId) {
        setTargetRect(null);
        return;
      }

      let element = document.getElementById(currentStep.targetId);
      // Fallback for mobile if desktop element is hidden or missing
      if (!element || element.offsetWidth === 0 || element.offsetHeight === 0) {
        element = document.getElementById(currentStep.targetId + '-mobile');
      }

      if (element && element.offsetWidth > 0 && element.offsetHeight > 0) {
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
        const headerOffset = isMobile ? 80 : 120;
        const rect = element.getBoundingClientRect();
        const absoluteTop = window.pageYOffset + rect.top;
        const targetScroll = Math.max(0, absoluteTop - headerOffset);

        window.scrollTo({
          top: targetScroll,
          behavior: 'smooth'
        });
        setTargetRect(element.getBoundingClientRect());
      }
    };

    // Staggered timers to handle tab switching DOM mount delays & smooth scroll completion
    const t1 = setTimeout(attemptScrollAndMeasure, 50);
    const t2 = setTimeout(attemptScrollAndMeasure, 200);
    const t3 = setTimeout(attemptScrollAndMeasure, 450);
    const t4 = setTimeout(attemptScrollAndMeasure, 750);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [isOpen, currentStepIndex, currentStep, onNavigateTab, onExpandMobileSearch]);

  // Update bounding rect on window resize & scroll WITHOUT re-triggering scrollIntoView
  useEffect(() => {
    if (!isOpen) return;

    window.addEventListener('resize', measureTarget);
    window.addEventListener('scroll', measureTarget, true);

    return () => {
      window.removeEventListener('resize', measureTarget);
      window.removeEventListener('scroll', measureTarget, true);
    };
  }, [isOpen, measureTarget]);

  if (!isOpen) return null;

  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === TOUR_STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('hasCompletedSkyITInteractiveTour', 'true');
    onClose();
  };

  // Calculate position for floating tooltip box relative to target Rect
  const getTooltipStyle = () => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

    // Mobile Viewport (< 640px): Clean bottom sheet card
    if (isMobile) {
      return {
        bottom: '12px',
        left: '12px',
        right: '12px',
        margin: '0 auto',
        maxWidth: '420px',
        maxHeight: currentStep.paymentOptions ? '90vh' : '52vh',
      };
    }

    // Tablet & Desktop: Step 1 (Welcome) - Centered dialog
    if (currentStep.id === 'welcome' || !targetRect) {
      return {
        top: '0px',
        bottom: '0px',
        left: '0px',
        right: '0px',
        margin: 'auto',
        width: '440px',
        maxWidth: 'calc(100vw - 32px)',
        height: 'fit-content',
        maxHeight: 'calc(85vh - 24px)',
      };
    }

    // Tablet & Desktop: Top Header Items (Search & Cart)
    if (currentStep.id === 'search') {
      const cardWidth = 420;
      let left = targetRect.left;
      if (left + cardWidth > window.innerWidth - 20) {
        left = window.innerWidth - cardWidth - 20;
      }
      return {
        top: `${Math.max(76, targetRect.bottom + 12)}px`,
        left: `${Math.max(20, left)}px`,
        width: `${cardWidth}px`,
        maxWidth: 'calc(100vw - 32px)',
        maxHeight: 'calc(100vh - 100px)',
      };
    }

    if (currentStep.id === 'cart') {
      const cardWidth = 400;
      return {
        top: `${Math.max(76, targetRect.bottom + 12)}px`,
        right: '20px',
        width: `${cardWidth}px`,
        maxWidth: 'calc(100vw - 32px)',
        maxHeight: 'calc(100vh - 100px)',
      };
    }

    // Tablet & Desktop: Content Section Steps (AI Sizing, Solar Kits, Logistics, Payment)
    // Position guide card floating centered at bottom with margin auto (no transform conflict)
    const cardWidth = currentStep.paymentOptions ? 460 : 440;
    return {
      bottom: '24px',
      left: '0px',
      right: '0px',
      marginLeft: 'auto',
      marginRight: 'auto',
      width: `${cardWidth}px`,
      maxWidth: 'calc(100vw - 32px)',
      maxHeight: 'calc(85vh - 32px)',
    };
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] pointer-events-none">
        {/* Dark Backdrop Overlay with Spotlight Cutout Hole over targetRect */}
        {targetRect ? (
          <svg className="fixed inset-0 z-[100] w-full h-full pointer-events-none">
            <defs>
              <mask id="skyit-tour-spotlight-mask">
                {/* White covers entire screen -> overlay visible */}
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                {/* Black cutout hole at targetRect -> component completely clear & un-obscured */}
                <rect
                  x={Math.max(0, targetRect.left - 6)}
                  y={Math.max(0, targetRect.top - 6)}
                  width={targetRect.width + 12}
                  height={targetRect.height + 12}
                  rx="16"
                  fill="black"
                />
              </mask>
            </defs>
            <rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="rgba(15, 23, 42, 0.65)"
              mask="url(#skyit-tour-spotlight-mask)"
            />
          </svg>
        ) : (
          <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-[2px] pointer-events-none" />
        )}

        {/* Highlight Frame around Target Element */}
        {targetRect && (
          <motion.div
            initial={false}
            animate={{
              top: targetRect.top - 6,
              left: targetRect.left - 6,
              width: targetRect.width + 12,
              height: targetRect.height + 12,
            }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className="fixed z-[101] rounded-2xl border-2 border-brand bg-brand/10 ring-4 ring-brand/30 shadow-[0_0_25px_rgba(16,185,129,0.4)] pointer-events-none"
          >
            {/* Pulsing Beacon Icon */}
            <div className="absolute -top-3.5 -right-3.5 w-7 h-7 bg-brand rounded-full flex items-center justify-center text-white shadow-lg animate-bounce border-2 border-white">
              <Sparkles size={14} />
            </div>
          </motion.div>
        )}

        {/* Floating Interactive Guide Card (pointer-events-auto so controls work) */}
        <motion.div
          key={currentStep.id}
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.2 }}
          style={getTooltipStyle()}
          className={`fixed z-[102] pointer-events-auto bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col justify-between ${
            currentStep.paymentOptions
              ? 'p-3 sm:p-5 space-y-2 sm:space-y-3 max-h-[92vh] overflow-y-auto sm:overflow-visible'
              : 'p-4 sm:p-6 space-y-3 sm:space-y-4 max-h-[85vh] overflow-y-auto'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 sm:pb-3 shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-brand text-white flex items-center justify-center text-xs font-black shadow-xs">
                {currentStepIndex + 1}
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-brand bg-brand-light px-2.5 py-1 rounded-md border border-brand/20 flex items-center gap-1">
                {currentStep.id === 'welcome' && <Sun size={12} className="text-brand" />}
                <span>{currentStep.badge}</span>
              </span>
            </div>
            <button
              onClick={handleComplete}
              className="p-1.5 sm:p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition-colors touch-manipulation"
              title="Close tour"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="space-y-1.5 sm:space-y-2 grow overflow-y-auto">
            <h3 className="font-display font-black text-base sm:text-lg text-slate-900 leading-snug">
              {currentStep.title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
              {currentStep.description}
            </p>

            {/* Special Section: Show Both Payment Options */}
            {currentStep.paymentOptions && (
              <div className="pt-1 space-y-1.5 sm:space-y-2">
                {/* Option 1: Flutterwave Online */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl sm:rounded-2xl p-2 sm:p-2.5 flex items-start gap-2 sm:gap-2.5">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <CreditCard size={14} />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                      <span className="text-xs font-bold text-slate-900">1. Flutterwave Online Checkout</span>
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded uppercase">Instant</span>
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-slate-500 leading-normal">
                      Card, USSD, or Bank App transfer. Instant payment confirmation & receipt.
                    </p>
                  </div>
                </div>

                {/* Option 2: Payment on Delivery */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl sm:rounded-2xl p-2 sm:p-2.5 flex items-start gap-2 sm:gap-2.5">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Truck size={14} />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                      <span className="text-xs font-bold text-slate-900">2. Payment on Delivery (POD)</span>
                      <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded uppercase">Pay at Door</span>
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-slate-500 leading-normal">
                      Pay upon equipment delivery or certified installation arrival by SkyIT field engineers.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer & Controls */}
          <div className="flex items-center justify-between gap-2 pt-2.5 sm:pt-3 border-t border-slate-100 shrink-0">
            {/* Step Dots */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              {TOUR_STEPS.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentStepIndex(idx)}
                  className="p-1 touch-manipulation"
                  title={`Step ${idx + 1}`}
                >
                  <div
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      idx === currentStepIndex ? 'w-4 sm:w-5 bg-brand' : 'w-1.5 bg-slate-200 hover:bg-slate-300'
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* Next / Back Action Buttons */}
            <div className="flex items-center gap-2">
              {!isFirstStep && (
                <button
                  onClick={handlePrev}
                  className="px-3 py-2 sm:py-1.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 active:bg-slate-100 transition-colors flex items-center gap-1 touch-manipulation"
                >
                  <ArrowLeft size={13} />
                  <span>Back</span>
                </button>
              )}

              <button
                onClick={handleNext}
                className="px-4 py-2 sm:py-1.5 rounded-xl bg-brand hover:bg-brand-hover active:bg-brand-hover text-white text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer touch-manipulation min-h-[36px]"
              >
                <span>{isLastStep ? 'Complete' : 'Next'}</span>
                {isLastStep ? <Check size={14} /> : <ArrowRight size={14} />}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};


