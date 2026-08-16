import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  ChevronRight, 
  ChevronLeft, 
  X, 
  Truck, 
  TrendingUp, 
  Zap, 
  Package, 
  BookOpen, 
  Users, 
  ShieldCheck, 
  Tag, 
  CheckCircle2,
  FileText,
  AlertTriangle,
  Lock
} from 'lucide-react';

export interface AdminTourStep {
  id: string;
  targetId?: string;
  title: string;
  description: string;
  adminView: 'logistics' | 'analytics' | 'quote' | 'packages' | 'products' | 'blog' | 'roles';
  badge: string;
  icon: React.ElementType;
  noOverlay?: boolean;
}

interface AdminInteractiveTourProps {
  isOpen: boolean;
  onClose: () => void;
  adminView: 'logistics' | 'analytics' | 'quote' | 'packages' | 'products' | 'blog' | 'roles';
  onNavigateAdminView: (view: 'logistics' | 'analytics' | 'quote' | 'packages' | 'products' | 'blog' | 'roles') => void;
}

interface RectState {
  top: number;
  left: number;
  width: number;
  height: number;
}

export const AdminInteractiveTour: React.FC<AdminInteractiveTourProps> = ({
  isOpen,
  onClose,
  adminView,
  onNavigateAdminView
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<RectState | null>(null);

  // Define steps for Admin Tools
  const steps: AdminTourStep[] = useMemo(() => [
    {
      id: 'welcome-admin',
      title: 'Welcome to SkyIT Admin Suite 🎓',
      description: 'This exclusive guided tour introduces you to all administrative tools available in the SkyIT Admin Management Suite. Learn how to track deliveries, view sales analytics, generate AI quotes, manage catalog prices, publish blog articles, and assign staff roles.',
      adminView: 'logistics',
      badge: '1. Admin Suite Overview',
      icon: ShieldCheck,
      noOverlay: true
    },
    {
      id: 'logistics',
      targetId: 'admin-tab-logistics',
      title: '📦 Deliveries & Order Management',
      description: 'Track live customer orders across all 36 states. Search orders by ID or customer name, update tracking milestones (Processing, Shipped, Installed), edit customer details, and download official A4 PDF invoices or receipts.',
      adminView: 'logistics',
      badge: '2. Deliveries & Orders Hub',
      icon: Truck
    },
    {
      id: 'analytics',
      targetId: 'admin-tab-analytics',
      title: '📊 Sales & Traffic Analytics',
      description: 'Inspect total revenue, average order values, visit conversion rates, traffic channels, and geographical order heatmaps across daily, weekly, or custom date ranges.',
      adminView: 'analytics',
      badge: '3. Sales Analytics',
      icon: TrendingUp
    },
    {
      id: 'quote',
      targetId: 'admin-tab-quote',
      title: '✍️ AI Proposal & Mega-Quote Engine',
      description: 'Formulate custom 5kVA to 100kVA+ engineering proposals in seconds! Simply paste narrative notes or load lists; AI calculates component specs, battery sizing, and exports printable A4 PDF quotes.',
      adminView: 'quote',
      badge: '4. AI Proposals Engine',
      icon: Sparkles
    },
    {
      id: 'packages',
      targetId: 'admin-tab-packages',
      title: '⚡ Solar Packages Catalog',
      description: 'Manage standard 1.5kVA–10kVA turnkey package pricing, toggle battery technology options (Tubular vs Lithium), edit package features, and restore default pricing whenever needed.',
      adminView: 'packages',
      badge: '5. Turnkey Packages',
      icon: Zap
    },
    {
      id: 'products',
      targetId: 'admin-tab-products',
      title: '🛍️ Product Catalog & AI Bulk Price Updater',
      description: 'Create new products with single entries OR paste supplier pricelists into the AI Bulk Price Updater! AI auto-detects price changes and alerts you if any item in your text is NOT found in our catalog.',
      adminView: 'products',
      badge: '6. Catalog & AI Bulk Prices',
      icon: Tag
    },
    {
      id: 'blog',
      targetId: 'admin-tab-blog',
      title: '📰 Solar Engineering Blog CMS',
      description: 'Publish, edit, and feature educational guides, solar maintenance tips, and technical news articles for your customers.',
      adminView: 'blog',
      badge: '7. Blog CMS',
      icon: BookOpen
    },
    {
      id: 'roles',
      targetId: 'admin-tab-roles',
      title: '🛡️ Staff Roles & Security Audit Logs',
      description: 'Assign Admin or Editor access privileges to store team members and monitor immutable security audit logs to review every admin action across the platform.',
      adminView: 'roles',
      badge: '8. Roles & Audit Logs',
      icon: Users
    }
  ], []);

  const currentStep = steps[currentStepIndex];

  // Auto-switch Admin Tab when step changes
  useEffect(() => {
    if (isOpen && currentStep) {
      if (adminView !== currentStep.adminView) {
        onNavigateAdminView(currentStep.adminView);
      }
    }
  }, [currentStepIndex, isOpen, currentStep, adminView, onNavigateAdminView]);

  // Helper to locate the visible target element whether on desktop sidebar or mobile horizontal scroller
  const getVisibleTargetElement = useCallback((targetId?: string) => {
    if (!targetId) return null;
    const tabKey = targetId.replace('admin-tab-', '');
    const candidates = [
      document.getElementById(targetId),
      document.getElementById(`${targetId}-mobile`),
      document.getElementById(`admin-tab-${tabKey}-mobile`),
      document.getElementById(`admin-tab-${tabKey}`),
      document.querySelector(`[data-tour-tab="${tabKey}"]`)
    ];

    for (const el of candidates) {
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          return el as HTMLElement;
        }
      }
    }
    return null;
  }, []);

  // Scroll target into view on step change
  useEffect(() => {
    if (!isOpen || !currentStep || currentStep.noOverlay) return;

    const targetId = currentStep.targetId;
    if (targetId) {
      const scrollToTarget = () => {
        const el = getVisibleTargetElement(targetId);
        if (el) {
          // 1. Scroll horizontal scrollable tabs container if present (Mobile scroller)
          const scrollableXParent = el.closest('.overflow-x-auto');
          if (scrollableXParent) {
            const elRect = el.getBoundingClientRect();
            const parentRect = scrollableXParent.getBoundingClientRect();
            const targetLeft = el.offsetLeft - (parentRect.width / 2) + (elRect.width / 2);
            scrollableXParent.scrollTo({ left: targetLeft, behavior: 'smooth' });
          }
          // 2. Scroll vertical sidebar container if present (Desktop sidebar)
          const scrollableYParent = el.closest('.overflow-y-auto');
          if (scrollableYParent) {
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          } else {
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
          }
        }
      };

      scrollToTarget();
      const timer1 = setTimeout(scrollToTarget, 60);
      const timer2 = setTimeout(scrollToTarget, 180);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [isOpen, currentStepIndex, currentStep, adminView, getVisibleTargetElement]);

  // Highlight spotlight target location calculation
  const updateSpotlight = useCallback(() => {
    if (!isOpen || !currentStep || currentStep.noOverlay) {
      setTargetRect(null);
      return;
    }

    const targetId = currentStep.targetId;
    if (!targetId) {
      setTargetRect(null);
      return;
    }

    const el = getVisibleTargetElement(targetId);
    if (el) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const nextRect = {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        };
        setTargetRect(prev => {
          if (
            prev &&
            Math.abs(prev.top - nextRect.top) < 0.5 &&
            Math.abs(prev.left - nextRect.left) < 0.5 &&
            Math.abs(prev.width - nextRect.width) < 0.5 &&
            Math.abs(prev.height - nextRect.height) < 0.5
          ) {
            return prev;
          }
          return nextRect;
        });
        return;
      }
    }
    setTargetRect(null);
  }, [isOpen, currentStep, getVisibleTargetElement]);

  // Continuous animation frame loop for real-time spotlight tracking during scroll/resize
  useEffect(() => {
    if (!isOpen) return;

    let animId: number;
    const loop = () => {
      updateSpotlight();
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    window.addEventListener('resize', updateSpotlight);
    window.addEventListener('scroll', updateSpotlight, { capture: true, passive: true });

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', updateSpotlight);
      window.removeEventListener('scroll', updateSpotlight);
    };
  }, [isOpen, updateSpotlight]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        if (currentStepIndex < steps.length - 1) {
          setCurrentStepIndex(prev => prev + 1);
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentStepIndex > 0) {
          setCurrentStepIndex(prev => prev - 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex, steps.length, onClose]);

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      handleCompleteTour();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleCompleteTour = () => {
    localStorage.setItem('hasCompletedSkyITAdminTour', 'true');
    onClose();
  };

  if (!isOpen) return null;

  const StepIcon = currentStep.icon;

  // Determine non-overlapping card position:
  // If no target element or welcome step: center card on screen.
  // If target element is on left/center of screen: position card at bottom-right corner.
  // If target element is on right side of screen: position card at bottom-left corner.
  const isTargetOnRightSide = targetRect ? (targetRect.left + targetRect.width / 2) > (window.innerWidth * 0.55) : false;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[200000] pointer-events-none">
        
        {/* Backdrop dismiss overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className={`absolute inset-0 pointer-events-auto transition-colors ${
            targetRect && !currentStep.noOverlay 
              ? 'bg-transparent' 
              : 'bg-slate-950/80'
          }`}
        />

        {/* Dynamic Ring Spotlight around Target Element (9999px Native Box-Shadow Mask) */}
        {targetRect && !currentStep.noOverlay && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: `${targetRect.top - 6}px`,
              left: `${targetRect.left - 6}px`,
              width: `${targetRect.width + 12}px`,
              height: `${targetRect.height + 12}px`,
              boxShadow: '0 0 0 9999px rgba(2, 6, 23, 0.82), 0 0 25px rgba(245, 158, 11, 0.65)',
              transition: 'all 0.15s ease-out'
            }}
            className="pointer-events-none z-[200001] rounded-2xl border-2 border-amber-400 bg-amber-400/10"
          />
        )}

        {/* Non-Blocking Responsive Tour Card */}
        <div 
          className={`fixed z-[200002] pointer-events-auto transition-all duration-300 ${
            !targetRect || currentStep.noOverlay
              ? 'inset-0 flex items-center justify-center p-3 sm:p-4'
              : isTargetOnRightSide
                ? 'inset-x-3 bottom-3 sm:inset-auto sm:bottom-6 sm:left-8 max-w-md sm:w-full'
                : 'inset-x-3 bottom-3 sm:inset-auto sm:bottom-6 sm:right-8 max-w-md sm:w-full'
          }`}
        >
          <motion.div
            key={currentStep.id}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            transition={{ type: "spring", duration: 0.35 }}
            className="w-full max-w-lg bg-slate-900 border-2 border-amber-500/40 text-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.85)] space-y-3.5 sm:space-y-5 overflow-hidden relative"
          >
            {/* Subtle gold decorative glow */}
            <div className="absolute top-0 right-0 w-36 h-36 sm:w-48 sm:h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

            {/* Modal Header */}
            <div className="flex items-start justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 sm:p-2.5 bg-amber-500/20 border border-amber-400/40 rounded-xl sm:rounded-2xl text-amber-300 shrink-0 shadow-inner">
                  <StepIcon size={18} className="text-amber-400 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <span className="text-[9px] sm:text-[10px] uppercase font-mono font-extrabold text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2 sm:px-2.5 py-0.5 rounded-full inline-block">
                    {currentStep.badge}
                  </span>
                  <h3 className="text-sm sm:text-lg font-display font-extrabold text-white mt-0.5 leading-snug">
                    {currentStep.title}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 sm:p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-full border border-slate-700/60 transition-colors cursor-pointer shrink-0"
                title="Close Admin Tour (Esc)"
              >
                <X size={14} className="sm:w-4 sm:h-4" />
              </button>
            </div>

            {/* Description */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-slate-200 text-xs sm:text-sm leading-relaxed space-y-1.5 font-sans shadow-inner">
              <p>{currentStep.description}</p>
            </div>

            {/* Progress Indicators & Navigation Controls */}
            <div className="pt-2 flex flex-row items-center justify-between gap-2 border-t border-slate-800">
              
              {/* Step dots */}
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                {steps.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentStepIndex(idx)}
                    className={`h-1.5 sm:h-2 rounded-full transition-all cursor-pointer ${
                      idx === currentStepIndex
                        ? 'w-4 sm:w-6 bg-amber-400'
                        : 'w-1.5 sm:w-2 bg-slate-700 hover:bg-slate-600'
                    }`}
                    title={`Go to step ${idx + 1}`}
                  />
                ))}
              </div>

              {/* Next / Prev Buttons */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {currentStepIndex > 0 && (
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] sm:text-xs font-extrabold rounded-lg sm:rounded-xl border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft size={13} className="sm:w-3.5 sm:h-3.5" />
                    <span>Prev</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleNext}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white text-[11px] sm:text-xs font-black rounded-lg sm:rounded-xl shadow-lg transition-all flex items-center gap-1 sm:gap-1.5 cursor-pointer uppercase tracking-wider"
                >
                  <span>{currentStepIndex === steps.length - 1 ? 'Finish 🎉' : 'Next'}</span>
                  <ChevronRight size={13} className="sm:w-3.5 sm:h-3.5" />
                </button>
              </div>

            </div>

          </motion.div>
        </div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
