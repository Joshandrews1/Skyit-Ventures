import React, { useState, useEffect } from 'react';
import { db, logAuditEvent } from '../firebase';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { 
  SOLAR_PACKAGES, 
  SolarPackage, 
  BatteryTech, 
  APPLIANCES, 
  getRecommendedPackageByLoad, 
  calculateTotalWatts 
} from '../data/quote-data';
import { Product } from '../types';
import { PackageUsageModeSelector } from './PackageUsageModeSelector';
import { 
  Zap, 
  Battery, 
  Sun, 
  Gauge, 
  HelpCircle, 
  Plus, 
  Minus, 
  ShoppingCart, 
  Check, 
  ArrowRight, 
  AlertTriangle,
  Cpu,
  Info,
  Loader2,
  ArrowUpDown,
  Filter,
  Search,
  X,
  SlidersHorizontal,
  MessageSquare,
  Sparkles
} from 'lucide-react';

interface SolarPackagesProps {
  onAddToCart: (product: Product) => void;
  onOpenCart: () => void;
  onConsultPackage?: (pkg: SolarPackage) => void;
}

export const SolarPackages: React.FC<SolarPackagesProps> = ({ onAddToCart, onOpenCart, onConsultPackage }) => {
  const [packages, setPackages] = useState<SolarPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTech, setSelectedTech] = useState<BatteryTech>('lithium');
  
  // Catalog view filtering & sorting state
  const [techFilter, setTechFilter] = useState<'all' | BatteryTech>('all');
  const [sortBy, setSortBy] = useState<'price-asc' | 'price-desc' | 'kva-asc'>('price-asc');
  const [kvaFilter, setKvaFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Interactive appliance calculator state
  const [selectedAppliances, setSelectedAppliances] = useState<Record<string, number>>({});
  const [recommendedPackage, setRecommendedPackage] = useState<SolarPackage | null>(null);
  const [showGuide, setShowGuide] = useState<boolean>(true);
  const [autoSwitchNotice, setAutoSwitchNotice] = useState<string | null>(null);

  // Helper to parse numerical KVA value
  const parseKvaVal = (str: string | undefined): number => {
    if (!str) return 1.5;
    const m = str.match(/[\d.]+/);
    return m ? parseFloat(m[0]) : 1.5;
  };

  // Determine max capacities dynamically from current catalog
  const tubularPackages = packages.filter(p => p.tech === 'tubular');
  const maxTubularKva = tubularPackages.length > 0 
    ? Math.max(...tubularPackages.map(p => parseKvaVal(p.kva)))
    : 5.0;

  const lithiumPackages = packages.filter(p => p.tech === 'lithium');
  const maxLithiumKva = lithiumPackages.length > 0 
    ? Math.max(...lithiumPackages.map(p => parseKvaVal(p.kva)))
    : 12.0;

  const totalWatts = calculateTotalWatts(selectedAppliances);

  // Compute required system capacity KVA
  const numACs = (selectedAppliances['ac1'] || 0) + (selectedAppliances['ac15'] || 0);
  const hasPump = (selectedAppliances['pump'] || 0) > 0;
  const hasFreezerOrMicrowave = (selectedAppliances['freezer'] || 0) > 0 || (selectedAppliances['microwave'] || 0) > 0;

  let calculatedRequiredKva = (totalWatts * 1.25) / 800;
  if (totalWatts > 0) {
    if (numACs >= 3 || totalWatts > 5000) {
      calculatedRequiredKva = Math.max(calculatedRequiredKva, 10.0);
    } else if (numACs >= 2 || totalWatts > 3200) {
      calculatedRequiredKva = Math.max(calculatedRequiredKva, 6.0);
    } else if (numACs >= 1) {
      calculatedRequiredKva = Math.max(calculatedRequiredKva, 4.0);
    } else if (hasPump || hasFreezerOrMicrowave || totalWatts > 1800) {
      calculatedRequiredKva = Math.max(calculatedRequiredKva, 3.5);
    } else if (totalWatts > 800) {
      calculatedRequiredKva = Math.max(calculatedRequiredKva, 2.5);
    } else {
      calculatedRequiredKva = 1.0;
    }
  }

  const isBiggerThanTubular = totalWatts > 0 && calculatedRequiredKva > maxTubularKva;
  const isBiggerThanLithium = totalWatts > 0 && calculatedRequiredKva > maxLithiumKva;

  // Quick preset loader helper
  const applyPresetLoad = (preset: 'bulbsOnly' | 'standardHome' | 'heavyHome') => {
    if (preset === 'bulbsOnly') {
      setSelectedAppliances({ bulbs: 10 });
    } else if (preset === 'standardHome') {
      setSelectedAppliances({ bulbs: 8, fans: 4, tv: 1, laptop: 2, fridge: 1 });
    } else if (preset === 'heavyHome') {
      setSelectedAppliances({ bulbs: 12, fans: 6, tv: 2, fridge: 1, ac1: 1, pump: 1 });
    }
  };

  // Read / Write packages directly in Firestore with auto-healing sync
  useEffect(() => {
    const defaultList = [...SOLAR_PACKAGES.tubular, ...SOLAR_PACKAGES.lithium];
    const obsoleteIds = new Set(['li-1.5', 'li-2.5']); // Deprecated packages to purge

    const unsub = onSnapshot(collection(db, 'solar_packages'), (snapshot) => {
      if (snapshot.empty) {
        // If Firestore is empty, initialize it with local quote-data defaults
        defaultList.forEach((pkg) => {
          setDoc(doc(db, 'solar_packages', pkg.id), pkg).catch(err => {
            console.error("Failed to seed package:", pkg.id, err);
          });
        });
        setPackages(defaultList);
      } else {
        const dbPackages: SolarPackage[] = [];
        snapshot.forEach((d) => {
          const data = d.data() as SolarPackage;
          // Delete obsolete default packages from Firestore if found
          if (obsoleteIds.has(d.id)) {
            deleteDoc(doc(db, 'solar_packages', d.id)).catch(console.error);
          } else {
            dbPackages.push(data);
          }
        });

        // Ensure all current default packages exist in Firestore with up-to-date specs
        defaultList.forEach((defaultPkg) => {
          const existingIdx = dbPackages.findIndex(p => p.id === defaultPkg.id);
          if (existingIdx === -1) {
            setDoc(doc(db, 'solar_packages', defaultPkg.id), defaultPkg).catch(console.error);
            dbPackages.push(defaultPkg);
          } else {
            // Update if name, batteryInfo, cableSize or acSupport from quote-data differs from old Firestore doc
            const currentInDb = dbPackages[existingIdx];
            if (
              currentInDb.name !== defaultPkg.name ||
              currentInDb.batteryInfo !== defaultPkg.batteryInfo ||
              currentInDb.cableSize !== defaultPkg.cableSize ||
              currentInDb.acSupport !== defaultPkg.acSupport
            ) {
              const updatedPkg = { ...currentInDb, ...defaultPkg, price: currentInDb.price || defaultPkg.price };
              setDoc(doc(db, 'solar_packages', defaultPkg.id), updatedPkg).catch(console.error);
              dbPackages[existingIdx] = updatedPkg;
            }
          }
        });

        setPackages(dbPackages);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error subscribing to solar packages:", error);
      // Fallback to local data if firestore fails
      setPackages(defaultList);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Appliance calculator logic
  const handleQuantityChange = (applianceId: string, delta: number) => {
    setSelectedAppliances((prev) => {
      const current = prev[applianceId] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [applianceId]: next };
    });
  };

  const clearCalculator = () => {
    setSelectedAppliances({});
    setRecommendedPackage(null);
    setAutoSwitchNotice(null);
  };

  // Re-run recommendation logic when selected load or current list of packages changes
  useEffect(() => {
    if (totalWatts === 0) {
      setRecommendedPackage(null);
      setAutoSwitchNotice(null);
      return;
    }

    let activeTech = selectedTech;

    // Rule 1: If load is bigger than tubular capacity, auto switch to lithium & notify user
    if (isBiggerThanTubular && selectedTech === 'tubular') {
      activeTech = 'lithium';
      setSelectedTech('lithium');
      setAutoSwitchNotice(
        `Your selected appliance load (${totalWatts}W / ~${calculatedRequiredKva.toFixed(1)} KVA) exceeds the maximum Tubular package capacity (${maxTubularKva} KVA). We have automatically upgraded your recommendation to Lithium-ion Packages for higher power density and heavy load support.`
      );
    }

    const rec = getRecommendedPackageByLoad(selectedAppliances, activeTech, packages);
    setRecommendedPackage(rec);
  }, [selectedAppliances, selectedTech, packages, isBiggerThanTubular, maxTubularKva, totalWatts, calculatedRequiredKva]);

  // Convert SolarPackage object to standard Product interface for checkout compatibility
  const addPackageToCart = (pkg: SolarPackage) => {
    const pkgProduct: Product = {
      id: pkg.id,
      name: `SkyIT ${pkg.name} Solar Package`,
      description: pkg.description,
      category: 'Solar Packages',
      price: pkg.price,
      originalPrice: pkg.price,
      discountPercent: 0,
      rating: 5,
      ratingCount: 12, // Pre-configured premium ratings
      image: 'https://firebasestorage.googleapis.com/v0/b/gen-lang-client-0122140096.firebasestorage.app/o/skyit%20logo.png?alt=media&token=639a434a-2fc0-4063-ac43-4ca872cb99ae', // Brand logo or generic premium placeholder
      features: [
        `System Capacity: ${pkg.kva}`,
        `Storage Specs: ${pkg.batteries}x ${pkg.batteryInfo}`,
        `Solar Power: ${pkg.panels} High-efficiency Panels`,
        `Load Sizing Guidance: ${pkg.acSupport}`
      ],
      specs: {
        'Inverter Sizing': pkg.kva,
        'Battery Tech': pkg.tech === 'lithium' ? 'LFP Lithium-ion' : 'Deep-Cycle Tubular',
        'Batteries Included': `${pkg.batteries} Units`,
        'Solar Array Sizing': `${pkg.panels} Panels`,
        'Cable Size': pkg.cableSize,
        'AC Capability': pkg.acSupport
      },
      stock: 5,
      allowCOD: true
    };

    onAddToCart(pkgProduct);
    onOpenCart();
  };

  // Unique available KVA capacity list for filter options
  const availableKvas = Array.from(new Set(packages.map(p => p.kva))).sort((a: string, b: string) => {
    const numA = parseFloat(a.replace(/[^0-9.]/g, '')) || 0;
    const numB = parseFloat(b.replace(/[^0-9.]/g, '')) || 0;
    return numA - numB;
  });

  const filteredPackages = packages
    .filter(p => {
      // Tech / Series filter
      if (techFilter !== 'all' && p.tech !== techFilter) return false;

      // KVA capacity filter
      if (kvaFilter !== 'all' && p.kva !== kvaFilter) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = p.name.toLowerCase().includes(q);
        const matchKva = p.kva.toLowerCase().includes(q);
        const matchDesc = (p.description || '').toLowerCase().includes(q);
        const matchBattery = (p.batteryInfo || '').toLowerCase().includes(q);
        const matchLoads = (p.loadSummary || []).some(l => l.toLowerCase().includes(q));
        if (!matchName && !matchKva && !matchDesc && !matchBattery && !matchLoads) return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'price-asc') {
        return a.price - b.price; // Lowest to Highest price
      }
      if (sortBy === 'price-desc') {
        return b.price - a.price; // Highest to Lowest price
      }
      if (sortBy === 'kva-asc') {
        const parseKvaNum = (s: string) => {
          const m = s.match(/[\d.]+/);
          return m ? parseFloat(m[0]) : 0;
        };
        const kvaDiff = parseKvaNum(a.kva) - parseKvaNum(b.kva);
        if (kvaDiff !== 0) return kvaDiff;
        return a.price - b.price;
      }
      return 0;
    });

  return (
    <div className="space-y-12 animate-fade-in">
      
      {/* Visual Identity Hero Jumbotron */}
      <div className="relative rounded-3xl bg-slate-900 border border-slate-800 text-white overflow-hidden p-6 sm:p-10 flex flex-col md:flex-row justify-between items-center gap-8 shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-brand/15 to-indigo-900/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-4 max-w-xl text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/15 border border-sky-400/30 text-sky-300 text-xs font-black uppercase tracking-wider">
            <Cpu size={12} className="text-sky-400 animate-pulse" />
            <span className="text-sky-300">Pre-Engineered Systems</span>
          </div>
          <h2 id="tour-solar-packages-header" className="font-display font-extrabold text-2xl sm:text-4xl tracking-tight text-white leading-tight">
            Premium Turnkey <br />
            <span className="animate-text-gradient-rtl">Solar Power Packages</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
            Ready-to-deploy clean energy packages designed by SkyIT engineering specialists. Complete with high-density storage, optimized solar panel grids, robust electrical panels, cabling, and certified local commissioning services.
          </p>
        </div>

        <div className="shrink-0 w-48 h-48 bg-slate-800/40 rounded-2xl border border-slate-700/60 p-4 flex items-center justify-center shadow-lg relative backdrop-blur-xs">
          <div className="absolute -top-1.5 -right-1.5 bg-sky-500 text-slate-950 font-black text-[9px] uppercase tracking-wider py-1 px-2.5 rounded-lg shadow-md">
            Nigeria-Wide Delivery
          </div>
          <div className="text-center space-y-2">
            <legend className="text-4xl">☀️</legend>
            <h4 className="font-display font-bold text-xs uppercase tracking-widest text-slate-200">SkyIT Standard</h4>
            <p className="text-[10px] text-slate-400 leading-normal">
              Zero-Noise pure sine, rapid auto-charge, complete surge protection.
            </p>
          </div>
        </div>
      </div>

      {/* Dynamic Sizing Appliance Load Calculator */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs space-y-6">
        <div className="border-b border-slate-100 pb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display font-extrabold text-base text-slate-800 flex items-center gap-2">
              <Zap size={18} className="text-amber-500 animate-bounce" />
              <span>Interactive System Sizing Assistant</span>
            </h3>
            <p className="text-xs text-slate-450 mt-1 leading-relaxed">
              Not sure which package fits your home or office? Select your battery technology and appliance loads below to get an instant, logical recommendation.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
          >
            <HelpCircle size={14} className="text-brand" />
            <span>{showGuide ? 'Hide Guide' : 'How to Use This Assistant?'}</span>
          </button>
        </div>

        {/* User Guide Box */}
        {showGuide && (
          <div className="bg-sky-50/80 border border-sky-200 rounded-2xl p-4 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-sky-950 uppercase tracking-wider flex items-center gap-1.5">
                <Info size={15} className="text-sky-600" />
                <span>Quick Guide: How System Sizing Works</span>
              </h4>
              <span className="text-[10px] text-sky-700 font-medium">4 Simple Steps</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="bg-white/80 p-3 rounded-xl border border-sky-100 space-y-1">
                <div className="font-bold text-sky-900 flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-sky-600 text-white text-[10px] inline-flex items-center justify-center font-black">1</span>
                  <span>Battery Type</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">
                  Choose <strong>Lithium-ion</strong> (long 10yr life, fast charge) or <strong>Tubular</strong> (low upfront cost).
                </p>
              </div>

              <div className="bg-white/80 p-3 rounded-xl border border-sky-100 space-y-1">
                <div className="font-bold text-sky-900 flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-sky-600 text-white text-[10px] inline-flex items-center justify-center font-black">2</span>
                  <span>Add Load Items</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">
                  Click <strong>+ / -</strong> on appliances (bulbs, fans, TV, fridge, AC) to set quantities you run at once.
                </p>
              </div>

              <div className="bg-white/80 p-3 rounded-xl border border-sky-100 space-y-1">
                <div className="font-bold text-sky-900 flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-sky-600 text-white text-[10px] inline-flex items-center justify-center font-black">3</span>
                  <span>Live Sizing</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">
                  Watch total Watts and Inverter Capacity % adjust dynamically to pick the smallest safe package.
                </p>
              </div>

              <div className="bg-white/80 p-3 rounded-xl border border-sky-100 space-y-1">
                <div className="font-bold text-sky-900 flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-sky-600 text-white text-[10px] inline-flex items-center justify-center font-black">4</span>
                  <span>Instant Order</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">
                  Click <strong>Get Package</strong> to add the complete kit to cart or request installation.
                </p>
              </div>
            </div>

            {/* Quick Test Presets */}
            <div className="pt-2 border-t border-sky-200/60 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-sky-900">Try Quick Presets:</span>
              <button
                type="button"
                onClick={() => applyPresetLoad('bulbsOnly')}
                className="bg-white hover:bg-sky-100 text-sky-800 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-sky-200 shadow-3xs transition-all cursor-pointer"
              >
                💡 10 LED Bulbs Only (Small Load)
              </button>
              <button
                type="button"
                onClick={() => applyPresetLoad('standardHome')}
                className="bg-white hover:bg-sky-100 text-sky-800 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-sky-200 shadow-3xs transition-all cursor-pointer"
              >
                🏠 Standard Home (Bulbs, Fans, TV, Fridge)
              </button>
              <button
                type="button"
                onClick={() => applyPresetLoad('heavyHome')}
                className="bg-white hover:bg-sky-100 text-sky-800 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-sky-200 shadow-3xs transition-all cursor-pointer"
              >
                ⚡ Heavy Load (AC + Pump + Home)
              </button>
            </div>
          </div>
        )}

        {/* Auto-Switch Notification Banner */}
        {autoSwitchNotice && (
          <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl flex items-start justify-between gap-3 animate-fade-in text-xs text-amber-900">
            <div className="flex items-start gap-2.5">
              <Zap size={18} className="text-amber-600 fill-amber-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold uppercase tracking-wider text-[10px] text-amber-800 block">
                  Switched to Premium Lithium-ion
                </span>
                <p className="text-[11px] font-medium leading-relaxed mt-0.5">
                  {autoSwitchNotice}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAutoSwitchNotice(null)}
              className="text-amber-700 hover:text-amber-950 p-1 rounded-lg shrink-0 cursor-pointer"
              title="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* STEP 1: Battery Technology Selection Switch */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-display font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Battery size={15} className="text-brand" />
              <span>1. Select Battery Storage Technology</span>
            </span>
            <span className="text-[10px] text-slate-500 font-mono font-bold bg-white px-2.5 py-1 rounded-lg border border-slate-200">
              Active Mode: <span className="text-brand font-black uppercase">{selectedTech === 'lithium' ? 'Lithium-ion (LiFePO4)' : 'Tubular Deep Cycle'}</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSelectedTech('lithium')}
              className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                selectedTech === 'lithium'
                  ? 'border-brand bg-white shadow-sm ring-2 ring-brand/20'
                  : 'border-slate-200 bg-white/60 hover:bg-white hover:border-slate-300'
              }`}
            >
              <div className={`p-2 rounded-lg shrink-0 transition-colors ${
                selectedTech === 'lithium' ? 'bg-amber-400 text-slate-950 font-bold' : 'bg-slate-100 text-slate-400'
              }`}>
                <Zap size={18} className={selectedTech === 'lithium' ? 'fill-slate-950' : ''} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900">Lithium-ion Storage</h4>
                  {selectedTech === 'lithium' && (
                    <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                      Recommended
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  LiFePO4 tech • 10+ year lifespan • Rapid 2-hour charge • 90%+ DoD
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                if (isBiggerThanTubular) {
                  setAutoSwitchNotice(
                    `Your current load (${totalWatts}W / ~${calculatedRequiredKva.toFixed(1)} KVA) exceeds maximum Tubular capacity (${maxTubularKva} KVA). High-density Lithium storage is required.`
                  );
                  setSelectedTech('lithium');
                } else {
                  setSelectedTech('tubular');
                }
              }}
              className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                selectedTech === 'tubular'
                  ? 'border-slate-800 bg-white shadow-sm ring-2 ring-slate-800/20'
                  : 'border-slate-200 bg-white/60 hover:bg-white hover:border-slate-300'
              } ${isBiggerThanTubular ? 'opacity-70' : ''}`}
            >
              <div className={`p-2 rounded-lg shrink-0 transition-colors ${
                selectedTech === 'tubular' ? 'bg-slate-900 text-white font-bold' : 'bg-slate-100 text-slate-400'
              }`}>
                <Battery size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900">Tubular Deep Cycle</h4>
                  {isBiggerThanTubular ? (
                    <span className="bg-rose-100 text-rose-800 text-[9px] font-bold uppercase px-2 py-0.5 rounded-full">
                      Exceeds Capacity
                    </span>
                  ) : (
                    <span className="bg-slate-100 text-slate-600 text-[9px] font-bold uppercase px-2 py-0.5 rounded-full">
                      Budget Friendly
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  {isBiggerThanTubular 
                    ? `Max ${maxTubularKva} KVA capacity. Your load requires Lithium.`
                    : 'Lead-Acid tech • Lower initial setup cost • Proven heavy duty performance'
                  }
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* STEP 2: Appliance Load Selection */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-display font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Zap size={15} className="text-amber-500" />
              <span>2. Select Household / Office Appliances</span>
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* Sizing inputs */}
          <div className="lg:col-span-7 xl:col-span-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {APPLIANCES.map((app) => {
              const qty = selectedAppliances[app.id] || 0;
              return (
                <div 
                  key={app.id} 
                  className={`border rounded-2xl p-3 flex items-center justify-between transition-all ${
                    qty > 0 
                      ? 'border-brand/40 bg-brand-light/5 shadow-2xs' 
                      : 'border-slate-150 hover:border-slate-300'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <span className="text-xs font-bold text-slate-800 block truncate">{app.name}</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[9px] font-bold uppercase tracking-wider ${
                        app.type === 'heavy' ? 'text-rose-500' : app.type === 'medium' ? 'text-amber-600' : 'text-slate-400'
                      }`}>
                        {app.type}
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono">({app.label || `${app.watts}W`})</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1 shrink-0">
                    <button 
                      type="button"
                      onClick={() => handleQuantityChange(app.id, -1)}
                      disabled={qty === 0}
                      className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 flex items-center justify-center font-bold text-xs"
                    >
                      <Minus size={10} />
                    </button>
                    <span className="text-xs font-mono font-bold w-4 text-center text-slate-800">{qty}</span>
                    <button 
                      type="button"
                      onClick={() => handleQuantityChange(app.id, 1)}
                      className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 flex items-center justify-center font-bold text-xs"
                    >
                      <Plus size={10} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Calculator Results Recommendation Card */}
          <div className="lg:col-span-5 xl:col-span-4 bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 lg:sticky lg:top-20">
            <h4 className="text-xs font-display font-bold text-slate-800 uppercase tracking-widest border-b border-slate-150 pb-2">
              Sizing Diagnostics
            </h4>
            
            {isBiggerThanLithium ? (
              <div className="bg-amber-50/90 border-2 border-amber-400 p-5 rounded-2xl space-y-4 animate-scale-up text-center">
                <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
                  <MessageSquare size={24} />
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-amber-900 tracking-wider bg-amber-200/80 px-2.5 py-0.5 rounded-full inline-block">
                    Custom Commercial Solution Required
                  </span>
                  <h5 className="font-display font-black text-slate-900 text-base">
                    Load Exceeds Standard Packages
                  </h5>
                  <p className="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
                    Your calculated total load of <strong className="text-slate-900 font-mono font-bold">{totalWatts}W ({(totalWatts/1000).toFixed(2)} kW)</strong> exceeds our maximum standard Lithium package ({maxLithiumKva} KVA).
                  </p>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-amber-200 text-left text-[11px] text-slate-600 space-y-1.5">
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>Total Running Load:</span>
                    <span className="text-brand font-mono">{totalWatts} Watts</span>
                  </div>
                  <div className="flex justify-between font-medium text-slate-500">
                    <span>Est. Minimum System:</span>
                    <span className="font-bold text-slate-900">{calculatedRequiredKva.toFixed(1)} KVA System</span>
                  </div>
                  <p className="text-[10px] text-slate-500 pt-1.5 border-t border-slate-100">
                    We build custom 3-Phase commercial inverter systems, industrial high-voltage lithium battery banks, and high-capacity solar arrays.
                  </p>
                </div>

                <a
                  href={`https://wa.me/2349074444140?text=${encodeURIComponent(`Hello SkyIT Ventures team, I ran your online system calculator. My calculated load is ${totalWatts}W (${(totalWatts/1000).toFixed(2)}kW / est. ${calculatedRequiredKva.toFixed(1)}KVA), which exceeds standard pre-packaged kits. Please provide a custom commercial solar plan.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
                >
                  <MessageSquare size={16} />
                  <span>Contact Us on WhatsApp for Proper Plan</span>
                </a>

                <button
                  type="button"
                  onClick={clearCalculator}
                  className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Reset Calculator
                </button>
              </div>
            ) : recommendedPackage ? (() => {
              const totalWatts = calculateTotalWatts(selectedAppliances);
              const parseKvaVal = (str: string) => {
                const m = str.match(/[\d.]+/);
                return m ? parseFloat(m[0]) : 1.5;
              };
              const ratedWatts = Math.round(parseKvaVal(recommendedPackage.kva) * 800);
              const utilization = Math.min(100, Math.round((totalWatts / ratedWatts) * 100));

              return (
                <div className="space-y-4 animate-scale-up">
                  <div className="bg-brand/10 border border-brand/20 p-4 rounded-xl text-center space-y-2">
                    <div className="text-[10px] uppercase font-bold text-brand tracking-widest">Recommended Package</div>
                    <h5 className="font-display font-black text-slate-850 text-base">{recommendedPackage.name}</h5>
                    <div className="text-sm font-black text-slate-900 font-mono">₦{recommendedPackage.price.toLocaleString()}</div>
                    <p className="text-[11px] text-slate-500 leading-normal">{recommendedPackage.description}</p>
                  </div>

                  <div className="space-y-2 text-[11px] text-slate-600 bg-white p-3.5 rounded-xl border border-slate-200 shadow-3xs">
                    <div className="flex justify-between items-center gap-2 pb-1.5 border-b border-slate-100">
                      <span className="font-medium text-slate-400 shrink-0">Total Running Load</span>
                      <span className="font-mono font-black text-brand text-xs text-right">{totalWatts} W ({(totalWatts/1000).toFixed(2)} kW)</span>
                    </div>
                    <div className="flex justify-between items-center gap-2 pb-1.5 border-b border-slate-100">
                      <span className="font-medium text-slate-400 shrink-0">Inverter Sizing</span>
                      <span className="font-bold text-slate-800 text-right">{recommendedPackage.kva} (~{ratedWatts}W)</span>
                    </div>
                    <div className="py-1 space-y-1 border-b border-slate-100">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-400 font-medium">Capacity Utilization</span>
                        <span className={`font-mono font-bold ${utilization > 85 ? 'text-rose-500' : 'text-emerald-600'}`}>
                          {utilization}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 rounded-full ${
                            utilization > 85 ? 'bg-rose-500' : utilization > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`} 
                          style={{ width: `${utilization}%` }} 
                        />
                      </div>
                    </div>
                    <div className="flex justify-between items-center gap-2 pb-1.5 border-b border-slate-100 pt-1">
                      <span className="font-medium text-slate-400 shrink-0">Battery Array</span>
                      <span className="font-bold text-slate-800 text-right">{recommendedPackage.batteries}x {recommendedPackage.batteryInfo}</span>
                    </div>
                    <div className="flex justify-between items-center gap-2 pb-1.5 border-b border-slate-100">
                      <span className="font-medium text-slate-400 shrink-0">Solar PV Array</span>
                      <span className="font-bold text-slate-800 text-right">{recommendedPackage.panels} Panels</span>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <span className="font-medium text-slate-400 shrink-0">AC Support</span>
                      <span className="font-bold text-slate-800 text-right">{recommendedPackage.acSupport}</span>
                    </div>
                  </div>

                  {recommendedPackage.tech === 'tubular' && (
                    <div className="p-3 bg-amber-50 text-amber-800 border border-amber-100 rounded-xl text-[10px] flex gap-2 leading-relaxed">
                      <AlertTriangle size={14} className="shrink-0 text-amber-600 mt-0.5" />
                      <span><strong>Optimization Tip:</strong> Switch the battery storage technology above to <strong>Lithium-ion</strong> for high efficiency, faster charging times, and extended appliance life.</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => addPackageToCart(recommendedPackage)}
                      className="flex-1 min-w-0 bg-brand hover:bg-brand-hover text-white px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm shadow-brand/10 transition-all cursor-pointer"
                    >
                      <ShoppingCart size={14} className="shrink-0" />
                      <span className="whitespace-nowrap truncate">Get Package</span>
                    </button>
                    <button
                      type="button"
                      onClick={clearCalculator}
                      className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer"
                      title="Reset choices"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              );
            })() : (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <legend className="text-3xl">🏠</legend>
                <p className="text-xs">No active loads selected.</p>
                <p className="text-[10px] text-slate-400 max-w-[200px] mx-auto leading-normal">
                  Adjust quantities of electrical appliances on the left to see dynamic packages instantly matching your requirements.
                </p>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>

      {/* Main Catalog View Filterable Grid */}
      <div className="space-y-6">
        
        {/* Toggle Controls & Filters Bar */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-2xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-extrabold text-base sm:text-lg text-slate-900">
                  Explore Active Packages
                </h3>
                <span className="bg-brand/10 text-brand text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                  {filteredPackages.length} Available
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Sorted from lowest price to highest price by default. Filter by capacity, series, or keyword.
              </p>
            </div>

            {/* Battery Storage Series Toggle */}
            <div className="inline-flex bg-slate-100 p-1 rounded-2xl border border-slate-200/80 self-start md:self-auto shrink-0">
              <button
                type="button"
                onClick={() => setTechFilter('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  techFilter === 'all' 
                    ? 'bg-slate-900 text-white shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Series
              </button>
              <button
                type="button"
                onClick={() => setTechFilter('lithium')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  techFilter === 'lithium' 
                    ? 'bg-slate-900 text-white shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Zap size={12} className={techFilter === 'lithium' ? "text-amber-400 fill-amber-400" : ""} />
                <span>Lithium LFP</span>
              </button>
              <button
                type="button"
                onClick={() => setTechFilter('tubular')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  techFilter === 'tubular' 
                    ? 'bg-slate-900 text-white shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Battery size={12} />
                <span>Tubular Power</span>
              </button>
            </div>
          </div>

          {/* Secondary Controls: Sorting, Capacity Filter, Search */}
          <div className="pt-3 border-t border-slate-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Sort Order */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                <ArrowUpDown size={13} className="text-slate-400 shrink-0" />
                <span className="font-bold text-slate-500 text-[11px]">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent border-0 font-bold text-slate-800 text-xs focus:ring-0 focus:outline-hidden cursor-pointer"
                >
                  <option value="price-asc">Lowest to Highest Price (₦)</option>
                  <option value="price-desc">Highest to Lowest Price (₦)</option>
                  <option value="kva-asc">KVA Capacity (Small to Large)</option>
                </select>
              </div>

              {/* KVA Capacity Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                <Filter size={13} className="text-slate-400 shrink-0" />
                <span className="font-bold text-slate-500 text-[11px]">Capacity:</span>
                <select
                  value={kvaFilter}
                  onChange={(e) => setKvaFilter(e.target.value)}
                  className="bg-transparent border-0 font-bold text-slate-800 text-xs focus:ring-0 focus:outline-hidden cursor-pointer"
                >
                  <option value="all">All System Sizes</option>
                  {availableKvas.map(kva => (
                    <option key={kva} value={kva}>{kva} Packages</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Keyword / Appliance Search */}
            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter load e.g. AC, TV, Fridge..."
                className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-brand/20 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Pricing Table Cards Grid */}
        {loading ? (
          <div className="py-24 text-center text-slate-450 space-y-1.5">
            <Loader2 size={24} className="animate-spin mx-auto text-brand" />
            <span className="text-xs uppercase tracking-wider block font-bold">Synchronizing Pricing Lists...</span>
          </div>
        ) : filteredPackages.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center space-y-3">
            <SlidersHorizontal size={32} className="text-slate-300 mx-auto" />
            <h4 className="font-bold text-slate-800 text-sm">No packages match your active filters</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try adjusting your capacity size, battery tech filter, or clear your search term.
            </p>
            <button
              type="button"
              onClick={() => {
                setTechFilter('all');
                setKvaFilter('all');
                setSearchQuery('');
                setSortBy('price-asc');
              }}
              className="px-4 py-2 bg-slate-900 hover:bg-brand text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {filteredPackages.map((pkg) => (
              <div 
                key={pkg.id} 
                className="bg-white border border-slate-200 hover:border-slate-350 hover:shadow-lg rounded-3xl p-5 sm:p-6 transition-all flex flex-col justify-between relative overflow-hidden group hover:scale-[1.01] duration-300"
              >
                {/* Visual Accent Badge */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-brand/5 to-transparent rounded-bl-full pointer-events-none" />

                <div className="space-y-4 text-left">
                  
                  {/* Top Capacity & Title */}
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <span className="text-[10px] uppercase tracking-widest font-black text-brand mb-1 block">
                        {pkg.kva} Capacity
                      </span>
                      <h4 className="font-display font-extrabold text-slate-850 text-base group-hover:text-brand transition-colors">
                        {pkg.name}
                      </h4>
                    </div>
                    <div className="p-2 bg-slate-50 border border-slate-100 rounded-xl">
                      {pkg.tech === 'lithium' ? (
                        <Zap size={14} className="text-amber-500 fill-amber-500" />
                      ) : (
                        <Battery size={14} className="text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Pricing Header */}
                  <div className="py-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Deployment Cost</span>
                    <span className="text-lg sm:text-xl font-mono font-black text-slate-900 leading-none">
                      ₦{pkg.price.toLocaleString()}
                    </span>
                  </div>

                  <p className="text-xs text-slate-450 leading-relaxed font-sans min-h-[36px]">
                    {pkg.description}
                  </p>

                  {/* Bullet Spec Highlights */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-2.5 text-[11px] text-slate-600">
                    <div className="flex items-center gap-2">
                      <Battery size={13} className="text-slate-400 shrink-0" />
                      <span><strong>Batteries:</strong> {pkg.batteryInfo}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Sun size={13} className="text-slate-400 shrink-0" />
                      <span><strong>Solar Panels:</strong> {pkg.panels} Panels</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Gauge size={13} className="text-slate-400 shrink-0" />
                      <span><strong>Cables:</strong> {pkg.cableSize} standard size</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Info size={13} className="text-brand shrink-0" />
                      <span><strong>AC Support:</strong> {pkg.acSupport}</span>
                    </div>
                  </div>

                  {/* Usage Profile Modes Switcher (Max, Average, Daytime Solar, Night Battery) */}
                  <PackageUsageModeSelector pkg={pkg} theme="light" />

                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 mt-6">
                  <button
                    type="button"
                    onClick={() => addPackageToCart(pkg)}
                    className="flex-1 bg-slate-900 hover:bg-brand text-white hover:scale-[1.01] transition-all py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-xs hover:shadow-md"
                  >
                    <ShoppingCart size={13} />
                    <span>Order Package</span>
                  </button>
                  {onConsultPackage && (
                    <button
                      type="button"
                      onClick={() => onConsultPackage(pkg)}
                      className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 text-xs font-bold p-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 shrink-0"
                      title="Ask AI Advisor to explain this package"
                    >
                      <Sparkles size={16} className="text-amber-500 fill-amber-400/30" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
