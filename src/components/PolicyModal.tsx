import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, FileText, ShieldAlert, RotateCcw, Shield, Hammer, AlertTriangle, CheckCircle2, ChevronDown } from 'lucide-react';

interface PolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'installation' | 'engineering' | 'return';
}

export const PolicyModal: React.FC<PolicyModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'installation'
}) => {
  const [activeTab, setActiveTab] = useState<'installation' | 'engineering' | 'return'>(initialTab);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-0 md:p-4 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-slate-900 border border-slate-800 text-slate-100 rounded-none md:rounded-2xl max-w-4xl w-full shadow-2xl flex flex-col md:flex-row overflow-hidden h-full md:my-8 md:max-h-[85vh]"
          id="policy-modal-container"
        >
          {/* Sidebar Tabs */}
          <div className="w-full md:w-64 bg-slate-950 border-r border-slate-800 p-6 flex flex-col shrink-0">
            <div>
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="flex items-center gap-2 mb-6 w-full text-left"
              >
                <div className="p-1 rounded bg-brand/10 text-brand">
                  <Shield size={18} />
                </div>
                <span className="font-display font-black text-sm uppercase tracking-wider text-white">SkyIT Policies</span>
                <ChevronDown size={16} className={`ml-auto md:hidden transition-transform ${isSidebarOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence initial={false}>
                {(isSidebarOpen || window.innerWidth >= 768) && (
                  <motion.nav 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-1.5 overflow-hidden"
                  >
                    <button
                      id="tab-installation-btn"
                      onClick={() => {
                        setActiveTab('installation');
                        if (window.innerWidth < 768) setIsSidebarOpen(false);
                      }}
                      className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-3 border ${
                        activeTab === 'installation'
                          ? 'bg-brand/15 text-brand border-brand/20'
                          : 'text-slate-400 hover:text-white hover:bg-slate-900/50 border-transparent'
                      }`}
                    >
                      <Hammer size={14} />
                      <span>Installation</span>
                    </button>

                    <button
                      id="tab-engineering-btn"
                      onClick={() => {
                        setActiveTab('engineering');
                        if (window.innerWidth < 768) setIsSidebarOpen(false);
                      }}
                      className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-3 border ${
                        activeTab === 'engineering'
                          ? 'bg-brand/15 text-brand border-brand/20'
                          : 'text-slate-400 hover:text-white hover:bg-slate-900/50 border-transparent'
                      }`}
                    >
                      <ShieldAlert size={14} />
                      <span>Engineering</span>
                    </button>

                    <button
                      id="tab-return-btn"
                      onClick={() => {
                        setActiveTab('return');
                        if (window.innerWidth < 768) setIsSidebarOpen(false);
                      }}
                      className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-3 border ${
                        activeTab === 'return'
                          ? 'bg-brand/15 text-brand border-brand/20'
                          : 'text-slate-400 hover:text-white hover:bg-slate-900/50 border-transparent'
                      }`}
                    >
                      <RotateCcw size={14} />
                      <span>Return Policy</span>
                    </button>
                  </motion.nav>
                )}
              </AnimatePresence>
            </div>

            <div className="mt-auto pt-6 border-t border-slate-850 hidden md:block">
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Fully compliant with the rules and guidelines of the Nigerian Electricity Regulatory Commission (NERC) & NEMSA certification standards.
              </p>
            </div>
          </div>

          {/* Main Content Area */}
          <div className={`flex-1 flex flex-col h-full overflow-hidden bg-slate-900 ${isSidebarOpen && window.innerWidth < 768 ? 'hidden' : 'flex'}`}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
              <h2 className="text-sm font-display font-black text-white uppercase tracking-widest flex items-center gap-2">
                {activeTab === 'installation' && <>🛠️ Terms of Installation (Nigeria Spec)</>}
                {activeTab === 'engineering' && <>⚡ Engineering Policies & Safety Code</>}
                {activeTab === 'return' && <>📦 Standard Returns & Warranty Guidelines</>}
              </h2>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                aria-label="Close dialog"
                id="close-policy-modal-btn"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Policy Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs text-slate-300 leading-relaxed">
              {activeTab === 'installation' && (
                <div className="space-y-6" id="installation-policy-content">
                  <div className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-4 flex gap-3 text-amber-300">
                    <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-amber-200 mb-1">Pre-Installation Site Requirements</h4>
                      <p className="text-[11px] leading-relaxed">
                        Under the National Electrical Safety standards of Nigeria, installers must inspect the customer's DB (distribution board) panel and roof integrity before structural racking or electrical cable drops are initiated.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <section>
                      <h3 className="font-display font-black text-white text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                        <CheckCircle2 size={12} className="text-brand" />
                        1. Physical Roof & Structural Inspections
                      </h3>
                      <p className="pl-4">
                        Prior to solar panel deployment, SkyIT engineers conduct a structural integrity audit on physical rafters (timber or steel structure). For homes in high-wind regions such as Lagos Island, Lekki, or Warri coastal zones, premium double-grooved rust-proof aluminum framing and high-grade stainless steel anchors will be mandatory.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-display font-black text-white text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                        <CheckCircle2 size={12} className="text-brand" />
                        2. Civil Access & Work Hours Compliance
                      </h3>
                      <p className="pl-4">
                        Clients in secured estates (e.g., Ikota, Chevron Lekki, or high-security locations in Warri/Effurun) are responsible for acquiring estate entry permits, gate passes, and work authorizations for our engineering crew. Standard installation hours are scheduled between **08:00 AM and 05:30 PM (WAT)**, Monday through Saturday.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-display font-black text-white text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                        <CheckCircle2 size={12} className="text-brand" />
                        3. Sizing Accuracy & Load Limitations
                      </h3>
                      <p className="pl-4">
                        All residential installations are sized strictly based on the completed **Inquiry Sizing Form** or manual audit data. Directly overloading pure sine wave hybrid inverters beyond recommended peak limits (e.g., trying to run heavy high-surge compressors, water pumps, or multiple split air conditioning units on small 5kVA rigs without proper engineering power-balancing) will automatically trip the system and invalidate the installation engineering warranty.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-display font-black text-white text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                        <CheckCircle2 size={12} className="text-brand" />
                        4. Client Preparation Duties
                      </h3>
                      <p className="pl-4">
                        The client must provide secure, dry indoor spacing for the storage of physical high-grade LFP lithium-ion units, backup pure sine wave inverters, and switchgear devices. Battery boxes must be elevated to prevent exposure to potential flooding, humidity, or moisture.
                      </p>
                    </section>
                  </div>
                </div>
              )}

              {activeTab === 'engineering' && (
                <div className="space-y-6" id="engineering-policy-content">
                  <div className="bg-sky-950/20 border border-sky-500/20 rounded-xl p-4 flex gap-3 text-sky-300">
                    <Shield size={18} className="shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-sky-200 mb-1">COREN & NEMSA Certified Infrastructure</h4>
                      <p className="text-[11px] leading-relaxed">
                        All commissioning procedures are strictly supervised and certified by engineers fully registered with the Council for the Regulation of Engineering in Nigeria (COREN) and conforming with the Nigerian Electricity Management Services Agency (NEMSA).
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <section>
                      <h3 className="font-display font-black text-white text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                        <CheckCircle2 size={12} className="text-brand" />
                        1. Earthing Protection & Lightning Arrestor Requirements
                      </h3>
                      <p className="pl-4">
                        Every system must possess an isolated dedicated pure copper earth rod (minimum 1.2 meters depth) treated with conductive carbon materials or salt-charcoal conditioning to guarantee low ground-resistance. Frame racking on roofs must be securely bonded to lightning arrestor structures, providing comprehensive safety paths for electrical surges during the heavy Nigerian rain seasons.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-display font-black text-white text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                        <CheckCircle2 size={12} className="text-brand" />
                        2. Cable Management Standard (PV Specification)
                      </h3>
                      <p className="pl-4">
                        Only certified UV-resistant 4mm² or 6mm² pure-copper PV solar cables are deployed from solar arrays to the hybrid charge controllers. High-voltage DC runs are fully armored inside flexible metallic/conduit pipes to eliminate hazard occurrences, rodent damage, or environmental peeling.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-display font-black text-white text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                        <CheckCircle2 size={12} className="text-brand" />
                        3. Dual-Phase / Three-Phase Balance Procedures
                      </h3>
                      <p className="pl-4">
                        For commercial solar installations and larger three-phase residential systems, our engineering crew executes load profiling audits. Single-phase loads must be balanced evenly across the inverter phases to prevent current imbalances, hot-spots on cables, or high neutral currents.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-display font-black text-white text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                        <CheckCircle2 size={12} className="text-brand" />
                        4. High-Temperature Battery Enclosures
                      </h3>
                      <p className="pl-4">
                        Due to the tropical climatic conditions of Nigeria, all lithium and premium gel battery banks are engineered with structural temperature control features. Batteries must be housed in well-ventilated enclosures, kept away from direct sunlight, and maintained at temperatures under 32°C to prevent thermal degradation and battery expansion.
                      </p>
                    </section>
                  </div>
                </div>
              )}

              {activeTab === 'return' && (
                <div className="space-y-6" id="return-policy-content">
                  <div className="bg-rose-950/20 border border-rose-500/20 rounded-xl p-4 flex gap-3 text-rose-300">
                    <RotateCcw size={18} className="shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-rose-200 mb-1">14-Day Physical Returns & Warranty Guard</h4>
                      <p className="text-[11px] leading-relaxed">
                        We maintain a strict warranty and verification mechanism for all smart energy equipment to safeguard both retail consumers and engineers against sub-standard gear.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <section>
                      <h3 className="font-display font-black text-white text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                        <CheckCircle2 size={12} className="text-brand" />
                        1. Product Returns Assessment Window
                      </h3>
                      <p className="pl-4">
                        Purchased components (such as standalone pure sine wave inverters, LFP cells, and solar controller accessories) may be returned for a swap or credit refund within **14 calendar days from delivery**. To be eligible, the hardware must be in its original wood/cardboard crating, in pristine condition, and completely unused (lithium battery BMS cycle counter registers under 5 cycles).
                      </p>
                    </section>

                    <section>
                      <h3 className="font-display font-black text-white text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                        <CheckCircle2 size={12} className="text-brand" />
                        2. Electrical Damage Exclusions
                      </h3>
                      <p className="pl-4">
                        SkyIT Ventures Limited does **not** accept returns, swaps, or liability for equipment that has been damaged due to external electrical faults, grid surges from "NEPA/grid supply", grid-tie backfeeding attempts on non-cooperative inverters, lightning strikes without proper lightning arrestors, or customer-engineered electrical bypasses that violate manufacturer instructions.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-display font-black text-white text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                        <CheckCircle2 size={12} className="text-brand" />
                        3. Logistics & Safe Secure Return Freight
                      </h3>
                      <p className="pl-4">
                        Clients returning standalone heavy components must return them directly to our central sorting portals located either in **Ikota Lekki, Lagos** or **Effurun-Warri, Delta State**. Return freight or transportation costs, security, and safety during transport are the responsibility of the client.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-display font-black text-white text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                        <CheckCircle2 size={12} className="text-brand" />
                        4. Custom Solar Panels or Racking Adjustments
                      </h3>
                      <p className="pl-4">
                        Custom-fabricated metal roof frames, structural aluminum ground mounts, or cut-to-length armored copper cabling are custom order products and are **non-refundable** once cutting or welding engineering actions have begun.
                      </p>
                    </section>
                  </div>
                </div>
              )}
            </div>

            {/* Footer buttons */}
            <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center gap-4 shrink-0">
              <span className="text-[10px] text-slate-500 hidden sm:inline-block">
                SkyIT Ventures Limited • Engr. Reg. No: COREN/E/29304
              </span>
              <button
                id="policy-modal-dismiss-btn"
                onClick={onClose}
                className="ml-auto px-5 py-2 bg-brand hover:bg-brand-hover text-slate-950 font-black uppercase tracking-wider text-[10.5px] rounded-lg transition-all cursor-pointer"
              >
                I Understand
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
