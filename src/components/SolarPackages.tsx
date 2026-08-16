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

  // Engineering Mode: Custom watts per appliance with localStorage persistence
  const [isEngineeringMode, setIsEngineeringMode] = useState<boolean>(false);
  const [customApplianceWatts, setCustomApplianceWatts] = useState<Record<string, number | ''>>(() => {
    try {
      const saved = localStorage.getItem('packages_custom_appliance_watts');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // fallback
    }
    const defaults: Record<string, number> = {};
    APPLIANCES.forEach(a => {
      defaults[a.id] = a.watts;
    });
    return defaults;
  });

  const updateCustomWatts = (id: string, valStr: string) => {
    if (valStr === '') {
      setCustomApplianceWatts(prev => ({ ...prev, [id]: '' }));
      return;
    }
    const cleanNum = parseInt(valStr.replace(/\D/g, ''), 10);
    if (!isNaN(cleanNum)) {
      setCustomApplianceWatts(prev => ({ ...prev, [id]: Math.min(15000, cleanNum) }));
    }
  };

  const handleBlurCustomWatts = (id: string, defaultWatts: number) => {
    const current = customApplianceWatts[id];
    if (current === '' || current === undefined || current === null || Number(current) <= 0) {
      setCustomApplianceWatts(prev => ({ ...prev, [id]: defaultWatts }));
    }
  };

  const handleResetCustomWatts = () => {
    const defaults: Record<string, number> = {};
    APPLIANCES.forEach(a => {
      defaults[a.id] = a.watts;
    });
    setCustomApplianceWatts(defaults);
    try {
      localStorage.removeItem('packages_custom_appliance_watts');
    } catch {}
  };

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

  const totalWatts = React.useMemo(() => {
    let total = 0;
    Object.entries(selectedAppliances).forEach(([id, rawQty]) => {
      const qty = Number(rawQty);
      if (qty > 0) {
        const app = APPLIANCES.find(a => a.id === id);
        const w = Number(customApplianceWatts[id]) || (app ? app.watts : 0);
        total += w * qty;
      }
    });
    return total;
  }, [selectedAppliances, customApplianceWatts]);

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
      <div className="relative rounded-3xl bg-[#171b27] border border-white/10 text-[#dee2f2] overflow-hidden p-6 sm:p-10 flex flex-col md:flex-row justify-between items-center gap-8 shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[#0066ff]/15 to-indigo-900/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-4 max-w-xl text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0066ff]/15 border border-[#0066ff]/30 text-[#b3c5ff] text-xs font-black uppercase tracking-wider">
            <Cpu size={12} className="text-[#0066ff] animate-pulse" />
            <span className="text-[#b3c5ff]">Pre-Engineered Systems</span>
          </div>
          <h2 id="tour-solar-packages-header" className="font-display font-extrabold text-2xl sm:text-4xl tracking-tight text-white leading-tight">
            Premium Turnkey <br />
            <span className="animate-text-gradient-rtl">Solar Power Packages</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#c2c6d8] leading-relaxed font-sans">
            Ready-to-deploy clean energy packages designed by SkyIT engineering specialists. Complete with high-density storage, optimized solar panel grids, robust electrical panels, cabling, and certified local commissioning services.
          </p>
        </div>

        <div className="shrink-0 w-48 h-48 bg-[#0e131e]/60 rounded-2xl border border-white/10 p-4 flex items-center justify-center shadow-lg relative backdrop-blur-xs">
          <div className="absolute -top-1.5 -right-1.5 bg-[#0066ff] text-white font-black text-[9px] uppercase tracking-wider py-1 px-2.5 rounded-lg shadow-md">
            Nigeria-Wide Delivery
          </div>
          <div className="text-center space-y-2">
            <legend className="text-4xl">☀️</legend>
            <h4 className="font-display font-bold text-xs uppercase tracking-widest text-[#dee2f2]">SkyIT Standard</h4>
            <p className="text-[10px] text-[#8e95b0] leading-normal">
              Zero-Noise pure sine, rapid auto-charge, complete surge protection.
            </p>
          </div>
        </div>
      </div>

      {/* Dynamic Sizing Appliance Load Calculator */}
      <div className="bg-[#171b27] border border-white/10 rounded-3xl p-6 shadow-xl space-y-6">
        <div className="border-b border-white/10 pb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display font-extrabold text-base text-[#dee2f2] flex items-center gap-2">
              <Zap size={18} className="text-amber-400 animate-bounce" />
              <span>Interactive System Sizing Assistant</span>
            </h3>
            <p className="text-xs text-[#c2c6d8] mt-1 leading-relaxed">
              Not sure which package fits your home or office? Select your battery technology and appliance loads below to get an instant, logical recommendation.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#0e131e] hover:bg-white/10 text-[#dee2f2] border border-white/10 transition-all cursor-pointer"
          >
            <HelpCircle size={14} className="text-[#0066ff]" />
            <span>{showGuide ? 'Hide Guide' : 'How to Use This Assistant?'}</span>
          </button>
        </div>

        {/* User Guide Box */}
        {showGuide && (
          <div className="bg-[#0e131e] border border-white/10 rounded-2xl p-4 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-[#dee2f2] uppercase tracking-wider flex items-center gap-1.5">
                <Info size={15} className="text-[#0066ff]" />
                <span>Quick Guide: How System Sizing Works</span>
              </h4>
              <span className="text-[10px] text-[#c2c6d8] font-medium">4 Simple Steps</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="bg-[#171b27] p-3 rounded-xl border border-white/10 space-y-1">
                <div className="font-bold text-[#dee2f2] flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-[#0066ff] text-white text-[10px] inline-flex items-center justify-center font-black">1</span>
                  <span>Battery Type</span>
                </div>
                <p className="text-[11px] text-[#c2c6d8] leading-snug">
                  Choose <strong className="text-white">Lithium-ion</strong> (long 10yr life, fast charge) or <strong className="text-white">Tubular</strong> (low upfront cost).
                </p>
              </div>

              <div className="bg-[#171b27] p-3 rounded-xl border border-white/10 space-y-1">
                <div className="font-bold text-[#dee2f2] flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-[#0066ff] text-white text-[10px] inline-flex items-center justify-center font-black">2</span>
                  <span>Add Load Items</span>
                </div>
                <p className="text-[11px] text-[#c2c6d8] leading-snug">
                  Click <strong className="text-white">+ / -</strong> on appliances (bulbs, fans, TV, fridge, AC) to set quantities you run at once.
                </p>
              </div>

              <div className="bg-[#171b27] p-3 rounded-xl border border-white/10 space-y-1">
                <div className="font-bold text-[#dee2f2] flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-[#0066ff] text-white text-[10px] inline-flex items-center justify-center font-black">3</span>
                  <span>Live Sizing</span>
                </div>
                <p className="text-[11px] text-[#c2c6d8] leading-snug">
                  Watch total Watts and Inverter Capacity % adjust dynamically to pick the smallest safe package.
                </p>
              </div>

              <div className="bg-[#171b27] p-3 rounded-xl border border-white/10 space-y-1">
                <div className="font-bold text-[#dee2f2] flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-[#0066ff] text-white text-[10px] inline-flex items-center justify-center font-black">4</span>
                  <span>Instant Order</span>
                </div>
                <p className="text-[11px] text-[#c2c6d8] leading-snug">
                  Click <strong className="text-white">Get Package</strong> to add the complete kit to cart or request installation.
                </p>
              </div>
            </div>

            {/* Quick Test Presets */}
            <div className="pt-2 border-t border-white/10 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-[#dee2f2]">Try Quick Presets:</span>
              <button
                type="button"
                onClick={() => applyPresetLoad('bulbsOnly')}
                className="bg-[#171b27] hover:bg-white/10 text-[#dee2f2] text-[11px] font-bold px-2.5 py-1 rounded-lg border border-white/10 transition-all cursor-pointer"
              >
                💡 10 LED Bulbs Only (Small Load)
              </button>
              <button
                type="button"
                onClick={() => applyPresetLoad('standardHome')}
                className="bg-[#171b27] hover:bg-white/10 text-[#dee2f2] text-[11px] font-bold px-2.5 py-1 rounded-lg border border-white/10 transition-all cursor-pointer"
              >
                🏠 Standard Home (Bulbs, Fans, TV, Fridge)
              </button>
              <button
                type="button"
                onClick={() => applyPresetLoad('heavyHome')}
                className="bg-[#171b27] hover:bg-white/10 text-[#dee2f2] text-[11px] font-bold px-2.5 py-1 rounded-lg border border-white/10 transition-all cursor-pointer"
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
        <div className="bg-[#171b27] border border-white/10 rounded-2xl p-4 space-y-3 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-display font-bold uppercase tracking-wider text-[#dee2f2] flex items-center gap-1.5">
              <Battery size={15} className="text-[#0066ff]" />
              <span>1. Select Battery Storage Technology</span>
            </span>
            <span className="text-[10px] text-[#c2c6d8] font-mono font-bold bg-[#0e131e] px-2.5 py-1 rounded-lg border border-white/10">
              Active Mode: <span className="text-[#0066ff] font-black uppercase">{selectedTech === 'lithium' ? 'Lithium-ion (LiFePO4)' : 'Tubular Deep Cycle'}</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSelectedTech('lithium')}
              className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                selectedTech === 'lithium'
                  ? 'border-[#0066ff] bg-[#0e131e] shadow-md ring-2 ring-[#0066ff]/20'
                  : 'border-white/10 bg-[#0e131e]/60 hover:bg-[#0e131e] hover:border-white/20'
              }`}
            >
              <div className={`p-2 rounded-lg shrink-0 transition-colors ${
                selectedTech === 'lithium' ? 'bg-amber-400 text-slate-950 font-bold' : 'bg-white/5 text-slate-400'
              }`}>
                <Zap size={18} className={selectedTech === 'lithium' ? 'fill-slate-950' : ''} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#dee2f2]">Lithium-ion Storage</h4>
                  {selectedTech === 'lithium' && (
                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                      Recommended
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#c2c6d8] mt-0.5 leading-snug">
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
                  ? 'border-[#0066ff] bg-[#0e131e] shadow-md ring-2 ring-[#0066ff]/20'
                  : 'border-white/10 bg-[#0e131e]/60 hover:bg-[#0e131e] hover:border-white/20'
              } ${isBiggerThanTubular ? 'opacity-70' : ''}`}
            >
              <div className={`p-2 rounded-lg shrink-0 transition-colors ${
                selectedTech === 'tubular' ? 'bg-[#0066ff] text-white font-bold' : 'bg-white/5 text-slate-400'
              }`}>
                <Battery size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#dee2f2]">Tubular Deep Cycle</h4>
                  {isBiggerThanTubular ? (
                    <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[9px] font-bold uppercase px-2 py-0.5 rounded-full">
                      Exceeds Capacity
                    </span>
                  ) : (
                    <span className="bg-white/10 text-[#c2c6d8] text-[9px] font-bold uppercase px-2 py-0.5 rounded-full">
                      Budget Friendly
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#c2c6d8] mt-0.5 leading-snug">
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-display font-bold uppercase tracking-wider text-[#dee2f2] flex items-center gap-1.5">
              <Zap size={15} className="text-amber-400" />
              <span>2. Select Household / Office Appliances</span>
            </span>

            {/* Edit Watts Engineering Mode Toggle */}
            <div className="flex items-center gap-2 bg-[#171b27] px-3 py-1.5 rounded-xl border border-white/10 shadow-xs">
              <span className="text-[11px] font-bold text-[#c2c6d8] flex items-center gap-1">
                <SlidersHorizontal size={13} className="text-amber-400" />
                <span>Edit Watts</span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={isEngineeringMode}
                onClick={() => setIsEngineeringMode(!isEngineeringMode)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  isEngineeringMode ? 'bg-amber-400' : 'bg-slate-700'
                }`}
              >
                <span className="sr-only">Toggle Edit Watts</span>
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-slate-950 shadow-md ring-0 transition duration-200 ease-in-out ${
                    isEngineeringMode ? 'translate-x-4 bg-slate-950' : 'translate-x-0 bg-white'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Engineering Mode Banner */}
          {isEngineeringMode && (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2 animate-fade-in">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-amber-400 shrink-0">tune</span>
                  <span className="font-bold text-amber-300">Engineering Mode:</span>
                  <span className="text-amber-200/90 text-[11px]">Adjust individual appliance watts to match your exact ratings.</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleResetCustomWatts}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-[11px] cursor-pointer transition-all flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-xs">restart_alt</span>
                    <span>Reset Defaults</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* Sizing inputs - sticks in view while user reviews calculations on the right */}
            <div className="lg:col-span-7 xl:col-span-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 lg:sticky lg:top-24 self-start">
            {APPLIANCES.map((app) => {
              const qty = selectedAppliances[app.id] || 0;
              const currentWatts = customApplianceWatts[app.id] !== undefined ? customApplianceWatts[app.id] : app.watts;
              return (
                <div 
                  key={app.id} 
                  className={`border rounded-2xl p-3 flex flex-col justify-between gap-2 transition-all ${
                    qty > 0 
                      ? 'border-[#0066ff]/50 bg-[#171b27] shadow-md' 
                      : 'border-white/10 bg-[#171b27]/80 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 pr-1 flex-1">
                      <span className="text-xs font-bold text-[#dee2f2] block truncate">{app.name}</span>
                      
                      {isEngineeringMode ? (
                        <div className="flex items-center gap-1 mt-1">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={customApplianceWatts[app.id] !== undefined ? customApplianceWatts[app.id] : app.watts}
                            onChange={(e) => updateCustomWatts(app.id, e.target.value)}
                            onBlur={() => handleBlurCustomWatts(app.id, app.watts)}
                            placeholder={String(app.watts)}
                            className="w-14 px-1 py-0.5 bg-slate-900 border border-amber-400/60 focus:border-amber-300 focus:outline-hidden rounded text-amber-300 font-mono text-[11px] font-bold text-center"
                          />
                          <span className="text-amber-400 font-bold text-[10px]">W each</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`text-[9px] font-bold uppercase tracking-wider ${
                            app.type === 'heavy' ? 'text-rose-400' : app.type === 'medium' ? 'text-amber-400' : 'text-[#8e95b0]'
                          }`}>
                            {app.type}
                          </span>
                          <span className="text-[9px] text-[#8e95b0] font-mono">({Number(currentWatts) || app.watts}W avg.)</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 bg-[#0e131e] border border-white/10 rounded-xl p-1 shrink-0">
                      <button 
                        type="button"
                        onClick={() => handleQuantityChange(app.id, -1)}
                        disabled={qty === 0}
                        className="w-6 h-6 rounded-lg bg-[#171b27] border border-white/10 text-[#c2c6d8] hover:bg-white/10 disabled:opacity-30 flex items-center justify-center font-bold text-xs cursor-pointer"
                      >
                        <Minus size={10} />
                      </button>
                      <span className="text-xs font-mono font-bold w-4 text-center text-[#dee2f2]">{qty}</span>
                      <button 
                        type="button"
                        onClick={() => handleQuantityChange(app.id, 1)}
                        className="w-6 h-6 rounded-lg bg-[#171b27] border border-white/10 text-[#c2c6d8] hover:bg-white/10 flex items-center justify-center font-bold text-xs cursor-pointer"
                      >
                        <Plus size={10} />
                      </button>
                    </div>
                  </div>

                  {isEngineeringMode && qty > 0 && (
                    <div className="text-[10px] text-right font-mono text-amber-300/80 pt-1 border-t border-white/5">
                      Subtotal: {(qty * (Number(currentWatts) || app.watts)).toLocaleString()} W
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Calculator Results Recommendation Card */}
          <div className="lg:col-span-5 xl:col-span-4 bg-[#171b27] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
            <h4 className="text-xs font-display font-bold text-[#dee2f2] uppercase tracking-widest border-b border-white/10 pb-2">
              Sizing Diagnostics
            </h4>
            
            {isBiggerThanLithium ? (
              <div className="bg-amber-500/10 border-2 border-amber-400/40 p-5 rounded-2xl space-y-4 animate-scale-up text-center">
                <div className="w-12 h-12 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                  <MessageSquare size={24} />
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-amber-300 tracking-wider bg-amber-500/20 px-2.5 py-0.5 rounded-full inline-block border border-amber-500/30">
                    Custom Commercial Solution Required
                  </span>
                  <h5 className="font-display font-black text-[#dee2f2] text-base">
                    Load Exceeds Standard Packages
                  </h5>
                  <p className="text-xs text-[#c2c6d8] leading-relaxed max-w-xs mx-auto">
                    Your calculated total load of <strong className="text-white font-mono font-bold">{totalWatts}W ({(totalWatts/1000).toFixed(2)} kW)</strong> exceeds our maximum standard Lithium package ({maxLithiumKva} KVA).
                  </p>
                </div>

                <div className="bg-[#0e131e] p-3.5 rounded-xl border border-white/10 text-left text-[11px] text-[#c2c6d8] space-y-1.5">
                  <div className="flex justify-between font-bold text-[#dee2f2]">
                    <span>Total Running Load:</span>
                    <span className="text-[#0066ff] font-mono">{totalWatts} Watts</span>
                  </div>
                  <div className="flex justify-between font-medium text-[#c2c6d8]">
                    <span>Est. Minimum System:</span>
                    <span className="font-bold text-white">{calculatedRequiredKva.toFixed(1)} KVA System</span>
                  </div>
                  <p className="text-[10px] text-[#8e95b0] pt-1.5 border-t border-white/10">
                    We build custom 3-Phase commercial inverter systems, industrial high-voltage lithium battery banks, and high-capacity solar arrays.
                  </p>
                </div>

                <a
                  href={`https://wa.me/2349074444140?text=${encodeURIComponent(`Hello SkyIT Ventures team, I ran your online system calculator. My calculated load is ${totalWatts}W (${(totalWatts/1000).toFixed(2)}kW / est. ${calculatedRequiredKva.toFixed(1)}KVA), which exceeds standard pre-packaged kits. Please provide a custom commercial solar plan.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white p-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <MessageSquare size={16} />
                  <span>Contact Us on WhatsApp for Proper Plan</span>
                </a>

                <button
                  type="button"
                  onClick={clearCalculator}
                  className="w-full bg-[#0e131e] hover:bg-white/10 text-[#dee2f2] py-2 rounded-xl text-xs font-bold transition-all border border-white/10 cursor-pointer"
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
                  <div className="bg-[#0066ff]/10 border border-[#0066ff]/30 p-4 rounded-xl text-center space-y-2">
                    <div className="text-[10px] uppercase font-bold text-[#0066ff] tracking-widest">Recommended Package</div>
                    <h5 className="font-display font-black text-white text-base">{recommendedPackage.name}</h5>
                    <div className="text-sm font-black text-white font-sans tracking-tight">₦{recommendedPackage.price.toLocaleString('en-US').replace(/[\s\u00A0\u202F]+/g, '')}</div>
                    <p className="text-[11px] text-[#c2c6d8] leading-normal">{recommendedPackage.description}</p>
                  </div>

                  <div className="space-y-2 text-[11px] text-[#c2c6d8] bg-[#0e131e] p-3.5 rounded-xl border border-white/10 shadow-sm">
                    <div className="flex justify-between items-center gap-2 pb-1.5 border-b border-white/10">
                      <span className="font-medium text-[#8e95b0] shrink-0">Total Running Load</span>
                      <span className="font-mono font-black text-[#0066ff] text-xs text-right">{totalWatts} W ({(totalWatts/1000).toFixed(2)} kW)</span>
                    </div>
                    <div className="flex justify-between items-center gap-2 pb-1.5 border-b border-white/10">
                      <span className="font-medium text-[#8e95b0] shrink-0">Inverter Sizing</span>
                      <span className="font-bold text-[#dee2f2] text-right">{recommendedPackage.kva} (~{ratedWatts}W)</span>
                    </div>
                    <div className="py-1 space-y-1 border-b border-white/10">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-[#8e95b0] font-medium">Capacity Utilization</span>
                        <span className={`font-mono font-bold ${utilization > 85 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {utilization}%
                        </span>
                      </div>
                      <div className="w-full bg-[#171b27] h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 rounded-full ${
                            utilization > 85 ? 'bg-rose-500' : utilization > 60 ? 'bg-amber-400' : 'bg-emerald-400'
                          }`} 
                          style={{ width: `${utilization}%` }} 
                        />
                      </div>
                    </div>
                    <div className="flex justify-between items-center gap-2 pb-1.5 border-b border-white/10 pt-1">
                      <span className="font-medium text-[#8e95b0] shrink-0">Battery Array</span>
                      <span className="font-bold text-[#dee2f2] text-right">{recommendedPackage.batteries}x {recommendedPackage.batteryInfo}</span>
                    </div>
                    <div className="flex justify-between items-center gap-2 pb-1.5 border-b border-white/10">
                      <span className="font-medium text-[#8e95b0] shrink-0">Solar PV Array</span>
                      <span className="font-bold text-[#dee2f2] text-right">{recommendedPackage.panels} Panels</span>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <span className="font-medium text-[#8e95b0] shrink-0">AC Support</span>
                      <span className="font-bold text-[#dee2f2] text-right">{recommendedPackage.acSupport}</span>
                    </div>
                  </div>

                  {recommendedPackage.tech === 'tubular' && (
                    <div className="p-3 bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-xl text-[10px] flex gap-2 leading-relaxed">
                      <AlertTriangle size={14} className="shrink-0 text-amber-400 mt-0.5" />
                      <span><strong>Optimization Tip:</strong> Switch the battery storage technology above to <strong>Lithium-ion</strong> for high efficiency, faster charging times, and extended appliance life.</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => addPackageToCart(recommendedPackage)}
                      className="flex-1 min-w-0 bg-[#0066ff] hover:bg-[#0052cc] text-white px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                    >
                      <ShoppingCart size={14} className="shrink-0" />
                      <span className="whitespace-nowrap truncate">Get Package</span>
                    </button>
                    <button
                      type="button"
                      onClick={clearCalculator}
                      className="bg-[#0e131e] hover:bg-white/10 text-[#dee2f2] border border-white/10 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer"
                      title="Reset choices"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              );
            })() : (
              <div className="py-12 text-center text-[#8e95b0] space-y-2">
                <legend className="text-3xl">🏠</legend>
                <p className="text-xs text-[#dee2f2] font-semibold">No active loads selected.</p>
                <p className="text-[10px] text-[#c2c6d8] max-w-[200px] mx-auto leading-normal">
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
        <div className="bg-[#171b27] border border-white/10 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-extrabold text-base sm:text-lg text-[#dee2f2]">
                  Explore Active Packages
                </h3>
                <span className="bg-[#0066ff]/20 border border-[#0066ff]/30 text-[#b3c5ff] text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                  {filteredPackages.length} Available
                </span>
              </div>
              <p className="text-[11px] text-[#c2c6d8] mt-0.5">
                Sorted from lowest price to highest price by default. Filter by capacity, series, or keyword.
              </p>
            </div>

            {/* Battery Storage Series Toggle */}
            <div className="inline-flex bg-[#0e131e] p-1 rounded-2xl border border-white/10 self-start md:self-auto shrink-0">
              <button
                type="button"
                onClick={() => setTechFilter('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  techFilter === 'all' 
                    ? 'bg-[#0066ff] text-white shadow-xs' 
                    : 'text-[#c2c6d8] hover:text-white'
                }`}
              >
                All Series
              </button>
              <button
                type="button"
                onClick={() => setTechFilter('lithium')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  techFilter === 'lithium' 
                    ? 'bg-[#0066ff] text-white shadow-xs' 
                    : 'text-[#c2c6d8] hover:text-white'
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
                    ? 'bg-[#0066ff] text-white shadow-xs' 
                    : 'text-[#c2c6d8] hover:text-white'
                }`}
              >
                <Battery size={12} />
                <span>Tubular Power</span>
              </button>
            </div>
          </div>

          {/* Secondary Controls: Sorting, Capacity Filter, Search */}
          <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Sort Order */}
              <div className="flex items-center gap-1.5 bg-[#0e131e] border border-white/10 px-3 py-1.5 rounded-xl">
                <ArrowUpDown size={13} className="text-[#8e95b0] shrink-0" />
                <span className="font-bold text-[#c2c6d8] text-[11px]">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent border-0 font-bold text-[#dee2f2] text-xs focus:ring-0 focus:outline-hidden cursor-pointer"
                >
                  <option value="price-asc" className="bg-[#0e131e] text-[#dee2f2]">Lowest to Highest Price (₦)</option>
                  <option value="price-desc" className="bg-[#0e131e] text-[#dee2f2]">Highest to Lowest Price (₦)</option>
                  <option value="kva-asc" className="bg-[#0e131e] text-[#dee2f2]">KVA Capacity (Small to Large)</option>
                </select>
              </div>

              {/* KVA Capacity Filter */}
              <div className="flex items-center gap-1.5 bg-[#0e131e] border border-white/10 px-3 py-1.5 rounded-xl">
                <Filter size={13} className="text-[#8e95b0] shrink-0" />
                <span className="font-bold text-[#c2c6d8] text-[11px]">Capacity:</span>
                <select
                  value={kvaFilter}
                  onChange={(e) => setKvaFilter(e.target.value)}
                  className="bg-transparent border-0 font-bold text-[#dee2f2] text-xs focus:ring-0 focus:outline-hidden cursor-pointer"
                >
                  <option value="all" className="bg-[#0e131e] text-[#dee2f2]">All System Sizes</option>
                  {availableKvas.map(kva => (
                    <option key={kva} value={kva} className="bg-[#0e131e] text-[#dee2f2]">{kva} Packages</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Keyword / Appliance Search */}
            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8e95b0]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter load e.g. AC, TV, Fridge..."
                className="w-full pl-8 pr-7 py-1.5 bg-[#0e131e] border border-white/10 rounded-xl text-xs font-medium text-[#dee2f2] placeholder-[#8e95b0] focus:outline-hidden focus:border-[#0066ff] transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8e95b0] hover:text-white cursor-pointer"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Pricing Table Cards Grid */}
        {loading ? (
          <div className="py-24 text-center text-[#8e95b0] space-y-1.5">
            <Loader2 size={24} className="animate-spin mx-auto text-[#0066ff]" />
            <span className="text-xs uppercase tracking-wider block font-bold">Synchronizing Pricing Lists...</span>
          </div>
        ) : filteredPackages.length === 0 ? (
          <div className="bg-[#171b27] border border-white/10 rounded-3xl p-10 text-center space-y-3">
            <SlidersHorizontal size={32} className="text-[#8e95b0] mx-auto" />
            <h4 className="font-bold text-[#dee2f2] text-sm">No packages match your active filters</h4>
            <p className="text-xs text-[#c2c6d8] max-w-sm mx-auto">
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
              className="px-4 py-2 bg-[#0066ff] hover:bg-[#0052cc] text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {filteredPackages.map((pkg) => (
              <div 
                key={pkg.id} 
                className="bg-[#171b27] border border-white/10 hover:border-[#0066ff]/40 hover:shadow-xl rounded-3xl p-5 sm:p-6 transition-all flex flex-col justify-between relative overflow-hidden group hover:scale-[1.01] duration-300"
              >
                {/* Visual Accent Badge */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#0066ff]/10 to-transparent rounded-bl-full pointer-events-none" />

                <div className="space-y-4 text-left">
                  
                  {/* Top Capacity & Title */}
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <span className="text-[10px] uppercase tracking-widest font-black text-[#0066ff] mb-1 block">
                        {pkg.kva} Capacity
                      </span>
                      <h4 className="font-display font-extrabold text-[#dee2f2] text-base group-hover:text-[#0066ff] transition-colors">
                        {pkg.name}
                      </h4>
                    </div>
                    <div className="p-2 bg-[#0e131e] border border-white/10 rounded-xl">
                      {pkg.tech === 'lithium' ? (
                        <Zap size={14} className="text-amber-400 fill-amber-400" />
                      ) : (
                        <Battery size={14} className="text-[#8e95b0]" />
                      )}
                    </div>
                  </div>

                  {/* Pricing Header */}
                  <div className="py-1">
                    <span className="text-[10px] font-bold text-[#8e95b0] uppercase tracking-widest block">Deployment Cost</span>
                    <span className="text-lg sm:text-xl font-sans tracking-tight font-black text-white leading-none">
                      ₦{pkg.price.toLocaleString('en-US').replace(/[\s\u00A0\u202F]+/g, '')}
                    </span>
                  </div>

                  <p className="text-xs text-[#c2c6d8] leading-relaxed font-sans min-h-[36px]">
                    {pkg.description}
                  </p>

                  {/* Bullet Spec Highlights */}
                  <div className="bg-[#0e131e] p-4 rounded-2xl border border-white/10 space-y-2.5 text-[11px] text-[#c2c6d8]">
                    <div className="flex items-center gap-2">
                      <Battery size={13} className="text-[#8e95b0] shrink-0" />
                      <span><strong className="text-white">Batteries:</strong> {pkg.batteryInfo}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Sun size={13} className="text-[#8e95b0] shrink-0" />
                      <span><strong className="text-white">Solar Panels:</strong> {pkg.panels} Panels</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Gauge size={13} className="text-[#8e95b0] shrink-0" />
                      <span><strong className="text-white">Cables:</strong> {pkg.cableSize} standard size</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Info size={13} className="text-[#0066ff] shrink-0" />
                      <span><strong className="text-white">AC Support:</strong> {pkg.acSupport}</span>
                    </div>
                  </div>

                  {/* Usage Profile Modes Switcher (Max, Average, Daytime Solar, Night Battery) */}
                  <PackageUsageModeSelector pkg={pkg} theme="dark" />

                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 mt-6">
                  <button
                    type="button"
                    onClick={() => addPackageToCart(pkg)}
                    className="flex-1 bg-[#0066ff] hover:bg-[#0052cc] text-white hover:scale-[1.01] transition-all py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    <ShoppingCart size={13} />
                    <span>Order Package</span>
                  </button>
                  {onConsultPackage && (
                    <button
                      type="button"
                      onClick={() => onConsultPackage(pkg)}
                      className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold p-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 shrink-0"
                      title="Ask AI Advisor to explain this package"
                    >
                      <Sparkles size={16} className="text-amber-400 fill-amber-400/30" />
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
