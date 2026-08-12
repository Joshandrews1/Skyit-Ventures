import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MapPin, 
  ShieldCheck, 
  Truck, 
  Sun, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Lock,
  Navigation,
  ExternalLink
} from 'lucide-react';
import { getUserGeolocation } from '../lib/visitorTracker';

export type LocationReason = 'security' | 'logistics' | 'solar' | 'general';

interface LocationPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: LocationReason;
  onLocationGranted?: (coords: { lat: number; lng: number }) => void;
  onLocationDenied?: () => void;
}

export const LocationPermissionModal: React.FC<LocationPermissionModalProps> = ({
  isOpen,
  onClose,
  reason = 'security',
  onLocationGranted,
  onLocationDenied
}) => {
  const [isLocating, setIsLocating] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRequestLocation = async () => {
    setIsLocating(true);
    setPermissionError(null);

    try {
      const coords = await getUserGeolocation();
      setIsLocating(false);

      if (coords) {
        if (onLocationGranted) {
          onLocationGranted(coords);
        }
        onClose();
      } else {
        setPermissionError('Location request was dismissed or denied in browser settings.');
        if (onLocationDenied) {
          onLocationDenied();
        }
      }
    } catch (err: any) {
      setIsLocating(false);
      setPermissionError(err?.message || 'Unable to retrieve location.');
      if (onLocationDenied) {
        onLocationDenied();
      }
    }
  };

  const getReasonDetails = () => {
    switch (reason) {
      case 'security':
        return {
          badge: 'SECURITY & LOGIN FOOTPRINT',
          icon: ShieldCheck,
          title: 'Protect Your Account & Verify Login Map',
          description: 'Enabling location allows SkyIT to map your active login sessions and instantly notify you if an unauthorized sign-in attempt occurs from a different city.',
          benefits: [
            'Maps verified login pinpoints on your account security dashboard',
            'Triggers instant email & in-app alerts for suspicious sign-ins',
            'Prevents unauthorized account takeovers from unknown devices'
          ]
        };
      case 'logistics':
        return {
          badge: 'ACCURATE DOORSTEP FREIGHT',
          icon: Truck,
          title: 'Calculate Fair Shipping & Logistics',
          description: 'Solar equipment like hybrid inverters and heavy lithium batteries require specialized haulage. Location helps us find your nearest distribution hub.',
          benefits: [
            'Pins nearest haulage hub (Lagos, Abuja, Port Harcourt, Warri)',
            'Calculates exact fair freight rates without hidden surcharges',
            'Facilitates fast estate gate pass authorization for delivery crews'
          ]
        };
      case 'solar':
        return {
          badge: 'PRECISION SOLAR SYSTEM SIZING',
          icon: Sun,
          title: 'Roof Irradiance & Battery Sizing',
          description: 'Nigeria’s solar radiation varies from 3.5 PSH in southern coastal areas up to 6.5 PSH in northern states. Exact location ensures optimal system design.',
          benefits: [
            'Calculates exact local Peak Sun Hours (PSH) for your roof',
            'Prevents under-sizing battery banks and solar panel arrays',
            'Maximizes solar ROI and daily energy harvest'
          ]
        };
      default:
        return {
          badge: 'JUST-IN-TIME LOCALIZATION',
          icon: MapPin,
          title: 'Enhance Your SkyIT Experience',
          description: 'Allowing location access enables custom solar calculations, accurate local logistics, and real-time security alerts tailored to your community.',
          benefits: [
            'Verifies login location for account security',
            'Provides accurate local shipping & delivery rates',
            'Sizes solar power systems according to local sunlight'
          ]
        };
    }
  };

  const details = getReasonDetails();
  const IconComponent = details.icon;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[200000] flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-950/85 backdrop-blur-md">
        
        {/* Backdrop click dismiss */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 cursor-pointer"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg bg-slate-900 border-2 border-amber-500/60 rounded-3xl p-5 sm:p-7 shadow-[0_0_50px_rgba(245,158,11,0.25)] text-white space-y-6 z-10 pointer-events-auto"
        >
          {/* Header Bar */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-inner">
                <IconComponent size={24} />
              </div>
              <div>
                <span className="text-[10px] sm:text-[11px] font-black text-amber-400 uppercase tracking-widest bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full inline-block mb-1">
                  {details.badge}
                </span>
                <h3 className="text-lg sm:text-xl font-extrabold text-white leading-tight">
                  {details.title}
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Description Paragraph */}
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {details.description}
          </p>

          {/* Benefit Bullets Box */}
          <div className="bg-slate-950/80 border border-amber-500/30 rounded-2xl p-4 space-y-2.5">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block flex items-center gap-1.5">
              <Navigation size={12} className="text-amber-400" />
              Why location access matters for you:
            </span>

            <ul className="space-y-2">
              {details.benefits.map((benefit, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs text-slate-200">
                  <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Permission Error / Unblock Instructions Banner */}
          {permissionError && (
            <motion.div 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-rose-950/70 border border-rose-500/50 rounded-2xl p-4 space-y-2 text-xs text-rose-200"
            >
              <div className="flex items-center gap-2 font-bold text-rose-300 text-sm">
                <AlertCircle size={16} className="text-rose-400 shrink-0" />
                <span>Browser Permission Required</span>
              </div>
              <p className="text-[11px] text-rose-200/90 leading-relaxed">
                Your browser blocked or dismissed the location popup. To allow location access manually:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-[11px] font-mono text-amber-200 bg-slate-950/60 p-2.5 rounded-xl border border-rose-500/30">
                <li>Click the <strong className="text-white">Lock / Tune icon (🔒)</strong> in your address bar</li>
                <li>Toggle <strong className="text-amber-400">Location</strong> to <strong className="text-emerald-400">Allow</strong></li>
                <li>Refresh the page and try again</li>
              </ol>
            </motion.div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleRequestLocation}
              disabled={isLocating}
              className="w-full sm:flex-1 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs sm:text-sm px-5 py-3.5 rounded-2xl shadow-xl shadow-amber-500/20 hover:shadow-amber-500/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isLocating ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                  <span>Requesting Browser Access...</span>
                </>
              ) : (
                <>
                  <MapPin size={16} className="fill-slate-950 text-amber-400" />
                  <span>Allow Location Access</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs sm:text-sm px-5 py-3.5 rounded-2xl border border-slate-700 hover:border-slate-600 transition-all cursor-pointer text-center whitespace-nowrap"
            >
              Not Now
            </button>
          </div>

          {/* Privacy Note */}
          <div className="text-center pt-1 border-t border-slate-800/80">
            <span className="text-[10px] text-slate-400 font-medium flex items-center justify-center gap-1">
              <Lock size={10} className="text-amber-400" />
              Your privacy is protected. Location coordinates are strictly used for security maps and shipping calculations.
            </span>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
