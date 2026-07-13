import React, { useState, useEffect } from 'react';
import { db, logAuditEvent } from '../firebase';
import { collection, onSnapshot, doc, setDoc, updateDoc } from 'firebase/firestore';
import { SOLAR_PACKAGES, SolarPackage, BatteryTech, APPLIANCES } from '../data/quote-data';
import { Product } from '../types';
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
  Loader2
} from 'lucide-react';

interface SolarPackagesProps {
  onAddToCart: (product: Product) => void;
  onOpenCart: () => void;
}

export const SolarPackages: React.FC<SolarPackagesProps> = ({ onAddToCart, onOpenCart }) => {
  const [packages, setPackages] = useState<SolarPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTech, setSelectedTech] = useState<BatteryTech>('lithium');
  
  // Interactive appliance calculator state
  const [selectedAppliances, setSelectedAppliances] = useState<Record<string, number>>({});
  const [recommendedPackage, setRecommendedPackage] = useState<SolarPackage | null>(null);

  // Read / Write packages directly in Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'solar_packages'), (snapshot) => {
      if (snapshot.empty) {
        // If Firestore is empty, initialize it with local quote-data defaults
        const allLocalPackages: SolarPackage[] = [
          ...SOLAR_PACKAGES.tubular,
          ...SOLAR_PACKAGES.lithium
        ];
        
        allLocalPackages.forEach((pkg) => {
          setDoc(doc(db, 'solar_packages', pkg.id), pkg).catch(err => {
            console.error("Failed to seed package:", pkg.id, err);
          });
        });
        setPackages(allLocalPackages);
      } else {
        const dbPackages: SolarPackage[] = [];
        snapshot.forEach((d) => {
          dbPackages.push(d.data() as SolarPackage);
        });
        setPackages(dbPackages);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error subscribing to solar packages:", error);
      // Fallback to local data if firestore fails
      setPackages([
        ...SOLAR_PACKAGES.tubular,
        ...SOLAR_PACKAGES.lithium
      ]);
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
  };

  // Re-run recommendation logic when selected load or current list of packages changes
  useEffect(() => {
    const hasSelections = Object.values(selectedAppliances).some(q => Number(q) > 0);
    if (!hasSelections) {
      setRecommendedPackage(null);
      return;
    }

    // Determine load classification
    let isHeavy = false;
    let totalLoadPoints = 0;

    Object.entries(selectedAppliances).forEach(([id, rawQty]) => {
      const qty = Number(rawQty);
      if (qty <= 0) return;
      const app = APPLIANCES.find(a => a.id === id);
      if (app) {
        if (app.type === 'heavy') {
          isHeavy = true;
          totalLoadPoints += qty * 10;
        } else if (app.type === 'medium') {
          totalLoadPoints += qty * 4;
        } else {
          totalLoadPoints += qty * 1;
        }
      }
    });

    // Match recommendation
    const techPackages = packages.filter(p => p.tech === selectedTech);
    if (techPackages.length === 0) return;

    let match: SolarPackage = techPackages[0];

    if (isHeavy || totalLoadPoints >= 20) {
      // Directs to high capacity packages (>= 5KVA or 6KVA)
      const highCap = techPackages.find(p => parseFloat(p.kva) >= 5);
      match = highCap || techPackages[techPackages.length - 1];
    } else if (totalLoadPoints <= 5) {
      // Smallest package
      match = techPackages[0];
    } else {
      // Median capacity packages (3.5KVA tubular / 4.0KVA lithium)
      const median = techPackages.find(p => parseFloat(p.kva) >= 3.5);
      match = median || techPackages[Math.floor(techPackages.length / 2)];
    }

    setRecommendedPackage(match);
  }, [selectedAppliances, selectedTech, packages]);

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

  const filteredPackages = packages.filter(p => p.tech === selectedTech);

  return (
    <div className="space-y-12 animate-fade-in">
      
      {/* Visual Identity Hero Jumbotron */}
      <div className="relative rounded-3xl bg-slate-900 border border-slate-800 text-white overflow-hidden p-6 sm:p-10 flex flex-col md:flex-row justify-between items-center gap-8 shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-brand/15 to-indigo-900/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-4 max-w-xl text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-light/10 text-brand text-xs font-black uppercase tracking-wider">
            <Cpu size={12} className="animate-pulse" />
            <span>Pre-Engineered Systems</span>
          </div>
          <h2 className="font-display font-extrabold text-2xl sm:text-4xl tracking-tight text-white leading-tight">
            Premium Turnkey <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-sky-400">Solar Power Packages</span>
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
        <div className="border-b border-slate-100 pb-3">
          <h3 className="font-display font-extrabold text-base text-slate-800 flex items-center gap-2">
            <Zap size={18} className="text-amber-500 animate-bounce" />
            <span>Interactive System Sizing Assistant</span>
          </h3>
          <p className="text-xs text-slate-450 mt-1 leading-relaxed">
            Not sure which package fits your home or office? Select the appliances you expect to run simultaneously, and our heuristic sizing engine will recommend the perfect, pre-engineered hybrid package.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Sizing inputs */}
          <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
                    <span className={`text-[9px] font-bold uppercase tracking-wider ${
                      app.type === 'heavy' ? 'text-rose-500' : app.type === 'medium' ? 'text-amber-600' : 'text-slate-400'
                    }`}>
                      {app.type} load
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1">
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
          <div className="md:col-span-4 bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4 sticky top-20">
            <h4 className="text-xs font-display font-bold text-slate-800 uppercase tracking-widest border-b border-slate-150 pb-2">
              Sizing Diagnostics
            </h4>
            
            {recommendedPackage ? (
              <div className="space-y-4 animate-scale-up">
                <div className="bg-brand/10 border border-brand/20 p-4 rounded-xl text-center space-y-2">
                  <div className="text-[10px] uppercase font-bold text-brand tracking-widest">Recommended Package</div>
                  <h5 className="font-display font-black text-slate-850 text-base">{recommendedPackage.name}</h5>
                  <div className="text-sm font-black text-slate-900 font-mono">₦{recommendedPackage.price.toLocaleString()}</div>
                  <p className="text-[11px] text-slate-500 leading-normal">{recommendedPackage.description}</p>
                </div>

                <div className="space-y-2 text-[11px] text-slate-600 bg-white p-3.5 rounded-xl border border-slate-200 shadow-3xs">
                  <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
                    <span className="font-medium text-slate-400">Battery Array</span>
                    <span className="font-bold text-slate-800">{recommendedPackage.batteries}x {recommendedPackage.batteryInfo}</span>
                  </div>
                  <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
                    <span className="font-medium text-slate-400">Solar PV Array</span>
                    <span className="font-bold text-slate-800">{recommendedPackage.panels} Panels</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-slate-400">AC Support</span>
                    <span className="font-bold text-slate-800">{recommendedPackage.acSupport}</span>
                  </div>
                </div>

                {recommendedPackage.tech === 'tubular' && (
                  <div className="p-3 bg-amber-50 text-amber-800 border border-amber-100 rounded-xl text-[10px] flex gap-2 leading-relaxed">
                    <AlertTriangle size={14} className="shrink-0 text-amber-600 mt-0.5" />
                    <span><strong>Optimization Tip:</strong> Switch the battery storage technology above to <strong>Lithium-ion</strong> for high efficiency, faster charging times, and extended appliance life.</span>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => addPackageToCart(recommendedPackage)}
                    className="flex-1 bg-brand hover:bg-brand-hover text-white py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm shadow-brand/10"
                  >
                    <ShoppingCart size={13} />
                    <span>Get Package</span>
                  </button>
                  <button
                    onClick={clearCalculator}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 rounded-xl text-xs font-bold transition-all"
                    title="Reset choices"
                  >
                    Reset
                  </button>
                </div>
              </div>
            ) : (
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

      {/* Main Catalog View Filterable Grid */}
      <div className="space-y-6">
        
        {/* Toggle Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h3 className="font-display font-extrabold text-base text-slate-800">
              Explore Active Packages
            </h3>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Available configurations: {filteredPackages.length} engineered solutions
            </p>
          </div>

          <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
            <button
              onClick={() => setSelectedTech('lithium')}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                selectedTech === 'lithium' 
                  ? 'bg-slate-900 text-white shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Zap size={12} className={selectedTech === 'lithium' ? "text-amber-400 fill-amber-400" : ""} />
              <span>Premium Lithium</span>
            </button>
            <button
              onClick={() => setSelectedTech('tubular')}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                selectedTech === 'tubular' 
                  ? 'bg-slate-900 text-white shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Battery size={12} />
              <span>Tubular Power</span>
            </button>
          </div>
        </div>

        {/* Pricing Table Cards Grid */}
        {loading ? (
          <div className="py-24 text-center text-slate-450 space-y-1.5">
            <Loader2 size={24} className="animate-spin mx-auto text-brand" />
            <span className="text-xs uppercase tracking-wider block font-bold">Synchronizing Pricing Lists...</span>
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
                      <span><strong>Batteries:</strong> {pkg.batteries}x {pkg.batteryInfo}</span>
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

                  {/* Loads summary badges */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Recommended Appliance Load</span>
                    <div className="flex flex-wrap gap-1.5">
                      {pkg.loadSummary.map((load, idx) => (
                        <span 
                          key={idx} 
                          className="bg-slate-100 text-slate-600 text-[9px] font-bold px-2 py-0.5 rounded"
                        >
                          {load}
                        </span>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Purchase Button */}
                <button
                  type="button"
                  onClick={() => addPackageToCart(pkg)}
                  className="w-full mt-6 bg-slate-900 hover:bg-brand text-white group-hover:bg-slate-900 hover:scale-[1.01] transition-all py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer border border-transparent shadow-xs hover:shadow-md"
                >
                  <ShoppingCart size={13} />
                  <span>Order System Package</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
