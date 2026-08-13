import React, { useState, useEffect } from 'react';
import { db, logAuditEvent } from '../firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { SolarPackage, SOLAR_PACKAGES, BatteryTech } from '../data/quote-data';
import { 
  Zap, 
  DollarSign, 
  Edit3, 
  Check, 
  X, 
  Loader2, 
  RefreshCw, 
  Plus, 
  Trash2, 
  Battery, 
  Sun, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertCircle,
  Sliders,
  Sparkles,
  Info,
  ShieldCheck,
  Eye,
  ArrowRight
} from 'lucide-react';

export const AdminSolarPackages: React.FC = () => {
  const [packages, setPackages] = useState<SolarPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTech, setSelectedTech] = useState<'all' | BatteryTech>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Inline Price Editing State
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [draftPrice, setDraftPrice] = useState<number>(0);
  const [savingPriceId, setSavingPriceId] = useState<string | null>(null);

  // Full Package Modal Editing State
  const [editingPackage, setEditingPackage] = useState<SolarPackage | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  
  // Package Form State
  const [formId, setFormId] = useState('');
  const [formTech, setFormTech] = useState<BatteryTech>('lithium');
  const [formName, setFormName] = useState('');
  const [formKva, setFormKva] = useState('3.5KVA');
  const [formPrice, setFormPrice] = useState<number>(1000000);
  const [formDescription, setFormDescription] = useState('');
  const [formBatteries, setFormBatteries] = useState<number>(1);
  const [formBatteryInfo, setFormBatteryInfo] = useState('');
  const [formPanels, setFormPanels] = useState<number>(6);
  const [formCableSize, setFormCableSize] = useState('6mm² Solar Cable (30m)');
  const [formAcSupport, setFormAcSupport] = useState('No AC Support');
  const [formLoadInput, setFormLoadInput] = useState('');
  const [formLoadList, setFormLoadList] = useState<string[]>([]);

  // Feedback Notifications
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [savingPackage, setSavingPackage] = useState(false);
  const [resettingDefaults, setResettingDefaults] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => {
      setFeedbackMsg(null);
    }, 4500);
  };

  // 1. Subscribe live to Firestore solar_packages collection
  useEffect(() => {
    setLoading(true);
    const defaults = [...SOLAR_PACKAGES.tubular, ...SOLAR_PACKAGES.lithium];
    const obsoleteIds = new Set(['li-1.5', 'li-2.5']);

    const unsub = onSnapshot(collection(db, 'solar_packages'), (snapshot) => {
      if (snapshot.empty) {
        // Seed default 10 promo packages if empty
        defaults.forEach(pkg => {
          setDoc(doc(db, 'solar_packages', pkg.id), pkg).catch(console.error);
        });
        setPackages(defaults);
      } else {
        const list: SolarPackage[] = [];
        snapshot.forEach(docSnap => {
          if (obsoleteIds.has(docSnap.id)) {
            deleteDoc(doc(db, 'solar_packages', docSnap.id)).catch(console.error);
          } else {
            list.push(docSnap.data() as SolarPackage);
          }
        });

        // Auto-seed missing current promo defaults
        defaults.forEach((defaultPkg) => {
          const existingIdx = list.findIndex(p => p.id === defaultPkg.id);
          if (existingIdx === -1) {
            setDoc(doc(db, 'solar_packages', defaultPkg.id), defaultPkg).catch(console.error);
            list.push(defaultPkg);
          }
        });

        // Sort by tech (tubular first, then lithium) and price
        list.sort((a, b) => {
          if (a.tech !== b.tech) return a.tech === 'tubular' ? -1 : 1;
          return a.price - b.price;
        });
        setPackages(list);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error loading solar packages from Firestore:", error);
      setPackages(defaults);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // 2. Handle quick inline price update
  const handleSaveInlinePrice = async (pkg: SolarPackage) => {
    if (draftPrice <= 0) {
      showToast('error', 'Package cost must be greater than zero ₦.');
      return;
    }

    setSavingPriceId(pkg.id);
    try {
      await updateDoc(doc(db, 'solar_packages', pkg.id), {
        price: Number(draftPrice)
      });

      await logAuditEvent(
        'UPDATE_PACKAGE_PRICE',
        pkg.id,
        'quote',
        `Updated cost for ${pkg.name} (${pkg.kva}) to ₦${Number(draftPrice).toLocaleString()}`
      );

      showToast('success', `Updated cost for "${pkg.name}" to ₦${Number(draftPrice).toLocaleString()}`);
      setEditingPriceId(null);
    } catch (err: any) {
      console.error("Failed to update price:", err);
      showToast('error', `Database update failed: ${err.message || String(err)}`);
    } finally {
      setSavingPriceId(null);
    }
  };

  // 3. Populate form for full editing or creation
  const handleOpenEditModal = (pkg: SolarPackage) => {
    setEditingPackage(pkg);
    setIsCreatingNew(false);
    setFormId(pkg.id);
    setFormTech(pkg.tech);
    setFormName(pkg.name);
    setFormKva(pkg.kva);
    setFormPrice(pkg.price);
    setFormDescription(pkg.description || '');
    setFormBatteries(pkg.batteries || 1);
    setFormBatteryInfo(pkg.batteryInfo || '');
    setFormPanels(pkg.panels || 0);
    setFormCableSize(pkg.cableSize || '');
    setFormAcSupport(pkg.acSupport || '');
    setFormLoadList(pkg.loadSummary || []);
    setFormLoadInput('');
  };

  const handleOpenCreateModal = () => {
    setEditingPackage(null);
    setIsCreatingNew(true);
    const newId = `custom-pkg-${Date.now().toString().slice(-6)}`;
    setFormId(newId);
    setFormTech('lithium');
    setFormName('New Solar System Package');
    setFormKva('5.0KVA');
    setFormPrice(2500000);
    setFormDescription('High efficiency solar inverter installation with battery backup.');
    setFormBatteries(1);
    setFormBatteryInfo('1x 5KWH Lithium Battery');
    setFormPanels(6);
    setFormCableSize('10mm² Solar Cable (30m)');
    setFormAcSupport('Supports 1 Inverter AC');
    setFormLoadList(['Fans', 'TV', 'Decoder', 'Lighting Point', 'Fridge/Freezer']);
    setFormLoadInput('');
  };

  // Add load item to tag list
  const handleAddLoadItem = () => {
    const trimmed = formLoadInput.trim();
    if (trimmed && !formLoadList.includes(trimmed)) {
      setFormLoadList([...formLoadList, trimmed]);
      setFormLoadInput('');
    }
  };

  const handleRemoveLoadItem = (itemToRemove: string) => {
    setFormLoadList(formLoadList.filter(item => item !== itemToRemove));
  };

  // 4. Save package details (create or update)
  const handleSaveFullPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || formPrice <= 0) {
      showToast('error', 'Please provide a valid package title and cost price.');
      return;
    }

    setSavingPackage(true);

    const updatedPackage: SolarPackage = {
      id: formId,
      tech: formTech,
      name: formName.trim(),
      kva: formKva.trim(),
      description: formDescription.trim(),
      price: Number(formPrice),
      batteries: Number(formBatteries),
      batteryInfo: formBatteryInfo.trim(),
      panels: Number(formPanels),
      cableSize: formCableSize.trim(),
      acSupport: formAcSupport.trim(),
      loadSummary: formLoadList
    };

    try {
      await setDoc(doc(db, 'solar_packages', formId), updatedPackage);

      await logAuditEvent(
        isCreatingNew ? 'CREATE_SOLAR_PACKAGE' : 'UPDATE_SOLAR_PACKAGE',
        formId,
        'quote',
        `${isCreatingNew ? 'Created' : 'Updated'} solar package ${formName} (₦${formPrice.toLocaleString()})`
      );

      showToast('success', `Saved package "${formName}" successfully!`);
      setEditingPackage(null);
      setIsCreatingNew(false);
    } catch (err: any) {
      console.error("Save package error:", err);
      showToast('error', `Failed to save package: ${err.message || String(err)}`);
    } finally {
      setSavingPackage(false);
    }
  };

  // 5. Delete package
  const handleDeletePackage = async (pkgId: string, pkgName: string) => {
    if (!window.confirm(`Are you sure you want to delete package "${pkgName}"?`)) {
      return;
    }

    setDeletingId(pkgId);
    try {
      await deleteDoc(doc(db, 'solar_packages', pkgId));
      await logAuditEvent('DELETE_SOLAR_PACKAGE', pkgId, 'quote', `Deleted solar package ${pkgName}`);
      showToast('success', `Package "${pkgName}" has been deleted.`);
    } catch (err: any) {
      console.error("Delete package error:", err);
      showToast('error', `Failed to delete package: ${err.message || String(err)}`);
    } finally {
      setDeletingId(null);
    }
  };

  // 6. Reset / Restore Official Promo Catalog Defaults
  const handleResetToOfficialDefaults = async () => {
    if (!window.confirm("Restore all official Promo Inverter System packages? This will refresh all 10 standard Tubular and Lithium package specifications and prices to official factory defaults.")) {
      return;
    }

    setResettingDefaults(true);
    try {
      const defaults = [...SOLAR_PACKAGES.tubular, ...SOLAR_PACKAGES.lithium];
      for (const pkg of defaults) {
        await setDoc(doc(db, 'solar_packages', pkg.id), pkg);
      }

      await logAuditEvent('RESET_SOLAR_PACKAGES', 'all', 'quote', 'Restored official catalog defaults for all solar packages.');
      showToast('success', '🎉 Restored official Promo Solar System packages and prices!');
    } catch (err: any) {
      console.error("Reset catalog error:", err);
      showToast('error', `Failed to reset catalog: ${err.message || String(err)}`);
    } finally {
      setResettingDefaults(false);
    }
  };

  // Filter packages based on tech and search query
  const filteredPackages = packages.filter(pkg => {
    const matchesTech = selectedTech === 'all' || pkg.tech === selectedTech;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery = !q || 
      pkg.name.toLowerCase().includes(q) || 
      pkg.kva.toLowerCase().includes(q) || 
      pkg.batteryInfo.toLowerCase().includes(q) ||
      pkg.price.toString().includes(q) ||
      pkg.loadSummary.some(item => item.toLowerCase().includes(q));

    return matchesTech && matchesQuery;
  });

  const totalTubular = packages.filter(p => p.tech === 'tubular').length;
  const totalLithium = packages.filter(p => p.tech === 'lithium').length;

  return (
    <div className="space-y-6">
      
      {/* Toast Banner Notification */}
      {feedbackMsg && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 animate-fadeIn text-xs sm:text-sm font-semibold shadow-md ${
          feedbackMsg.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          <div className="flex items-center gap-2.5">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle size={18} className="text-rose-600 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-brand/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 flex-1">
            <div className="inline-flex items-center gap-2 bg-brand/20 border border-brand/30 rounded-full px-3 py-1 text-[11px] font-bold tracking-wider uppercase text-sky-300">
              <Zap size={13} className="text-amber-400" />
              <span>Official Promo Pricing Engine</span>
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-display font-extrabold text-white tracking-tight">
              Solar Package Costs & Specifications
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Manage system prices, battery specs, solar panel quantities, and load capabilities live. Any price adjustment saved here updates quotes and checkout across the store instantly.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0 pt-2 lg:pt-0">
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2.5 rounded-2xl bg-brand hover:bg-brand-dark text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-brand/20 transition-all cursor-pointer active:scale-95"
            >
              <Plus size={16} />
              <span>New Solar Package</span>
            </button>

            <button
              onClick={handleResetToOfficialDefaults}
              disabled={resettingDefaults}
              className="px-4 py-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              title="Reset all prices and specs to factory default catalog"
            >
              {resettingDefaults ? (
                <Loader2 size={15} className="animate-spin text-brand" />
              ) : (
                <RefreshCw size={15} className="text-sky-400" />
              )}
              <span>Restore Catalog Defaults</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80 text-xs">
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-3">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Active Systems</span>
            <span className="text-lg font-mono font-extrabold text-white mt-0.5 block">{packages.length} Packages</span>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-3">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Tubular Battery Series</span>
            <span className="text-lg font-mono font-extrabold text-sky-300 mt-0.5 block">{totalTubular} Systems</span>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-3">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Lithium LFP Series</span>
            <span className="text-lg font-mono font-extrabold text-amber-300 mt-0.5 block">{totalLithium} Systems</span>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-3">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Price Range</span>
            <span className="text-xs font-mono font-extrabold text-emerald-400 mt-1 block">
              ₦948k - ₦6.15M
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-3xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Technology Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setSelectedTech('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedTech === 'all' 
                ? 'bg-white text-slate-900 shadow-3xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Series ({packages.length})
          </button>
          <button
            onClick={() => setSelectedTech('tubular')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedTech === 'tubular' 
                ? 'bg-brand text-white shadow-3xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Tubular Series</span>
            <span className="bg-white/20 text-[10px] px-1.5 rounded-full">{totalTubular}</span>
          </button>
          <button
            onClick={() => setSelectedTech('lithium')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedTech === 'lithium' 
                ? 'bg-amber-600 text-white shadow-3xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Lithium Series</span>
            <span className="bg-white/20 text-[10px] px-1.5 rounded-full">{totalLithium}</span>
          </button>
        </div>

        {/* Search Input Box */}
        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by KVA, load, price..."
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-brand/20 focus:bg-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Package Cards List */}
      {loading ? (
        <div className="py-16 text-center space-y-3 bg-white rounded-3xl border border-slate-200">
          <Loader2 size={24} className="animate-spin text-brand mx-auto" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Syncing solar system registry from Firestore...</p>
        </div>
      ) : filteredPackages.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-white rounded-3xl border border-slate-200 p-6">
          <Zap size={32} className="text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No solar packages found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            No system matched your search "{searchQuery}". Try clearing your filter or click below to restore defaults.
          </p>
          <button
            onClick={handleResetToOfficialDefaults}
            className="px-4 py-2 bg-brand text-white text-xs font-bold rounded-xl hover:bg-brand-dark transition-all cursor-pointer"
          >
            Restore Official Catalog Packages
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPackages.map((pkg) => {
            const isEditingPrice = editingPriceId === pkg.id;
            const isLithium = pkg.tech === 'lithium';

            return (
              <div 
                key={pkg.id} 
                className="bg-white border border-slate-200 rounded-3xl p-5 shadow-2xs hover:shadow-md transition-all relative flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3">
                  {/* Top Bar: Tech Tag & KVA */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                        isLithium 
                          ? 'bg-amber-50 text-amber-800 border-amber-200' 
                          : 'bg-sky-50 text-sky-800 border-sky-200'
                      }`}>
                        {isLithium ? '⚡ Lithium LFP' : '🔋 Tubular Series'}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        {pkg.kva}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(pkg)}
                        className="p-1.5 text-slate-400 hover:text-brand hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                        title="Edit all package specs"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePackage(pkg.id, pkg.name)}
                        disabled={deletingId === pkg.id}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer disabled:opacity-40"
                        title="Delete package"
                      >
                        {deletingId === pkg.id ? (
                          <Loader2 size={15} className="animate-spin text-rose-500" />
                        ) : (
                          <Trash2 size={15} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="font-display font-extrabold text-base text-slate-900 group-hover:text-brand transition-colors">
                      {pkg.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {pkg.description || `${pkg.kva} System with ${pkg.batteryInfo}`}
                    </p>
                  </div>

                  {/* Technical Specs Summary Grid */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 border border-slate-150 rounded-2xl p-3 text-xs">
                    <div className="flex items-center gap-2">
                      <Battery size={14} className={isLithium ? 'text-amber-500' : 'text-sky-500'} />
                      <div className="min-w-0">
                        <span className="text-[10px] text-slate-400 font-medium block leading-none">Battery Storage</span>
                        <span className="font-bold text-slate-800 truncate block mt-0.5">{pkg.batteryInfo || `${pkg.batteries}x Battery`}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Sun size={14} className="text-amber-500" />
                      <div className="min-w-0">
                        <span className="text-[10px] text-slate-400 font-medium block leading-none">Solar Panels</span>
                        <span className="font-bold text-slate-800 truncate block mt-0.5">{pkg.panels} Solar Panels</span>
                      </div>
                    </div>
                  </div>

                  {/* Load Capability Chips */}
                  {pkg.loadSummary && pkg.loadSummary.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Can Carry:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {pkg.loadSummary.map((item, idx) => (
                          <span 
                            key={idx} 
                            className="bg-slate-100 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded-lg border border-slate-200/80"
                          >
                            ✓ {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Bar: Price & Action */}
                <div className="pt-3 border-t border-slate-150 flex items-center justify-between gap-3 bg-slate-50/50 -mx-5 -mb-5 p-4 rounded-b-3xl">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider block">Total Turnkey Cost</span>
                    
                    {isEditingPrice ? (
                      <div className="flex items-center gap-1.5 bg-white border border-brand/50 rounded-xl p-1 shadow-sm">
                        <span className="text-xs font-bold text-slate-500 pl-1">₦</span>
                        <input
                          type="number"
                          value={draftPrice}
                          onChange={(e) => setDraftPrice(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-28 bg-transparent border-0 text-sm font-mono font-bold text-slate-900 focus:ring-0 focus:outline-hidden p-0"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveInlinePrice(pkg)}
                          disabled={savingPriceId === pkg.id}
                          className="p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-all cursor-pointer"
                          title="Save price"
                        >
                          {savingPriceId === pkg.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Check size={13} />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingPriceId(null)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all cursor-pointer"
                          title="Cancel"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-base sm:text-lg font-mono font-black text-slate-900">
                          ₦{pkg.price.toLocaleString()}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPriceId(pkg.id);
                            setDraftPrice(pkg.price);
                          }}
                          className="p-1 px-2 rounded-lg bg-slate-200/60 hover:bg-brand/10 hover:text-brand text-slate-600 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                          title="Quick update price"
                        >
                          <Edit3 size={11} />
                          <span>Edit Price</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(pkg)}
                    className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-brand text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-3xs"
                  >
                    <span>Full Specs</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FULL PACKAGE CREATION / EDITING MODAL */}
      {(editingPackage || isCreatingNew) && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl my-8 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-brand/20 border border-brand/40 flex items-center justify-center text-sky-400">
                  <Zap size={18} />
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-base text-white">
                    {isCreatingNew ? 'Create New Solar Package' : `Edit Package Specs (${formKva})`}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isCreatingNew ? 'Configure a new turnkey inverter installation system' : 'Update pricing, battery storage, and load details'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingPackage(null);
                  setIsCreatingNew(false);
                }}
                className="p-2 text-slate-400 hover:text-white rounded-full bg-slate-800 hover:bg-slate-700 transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveFullPackage} className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
              
              {/* Row 1: Title & Technology */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="font-bold text-slate-700 block">Package Title *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. 3.5KVA Hybrid Solar Inverter (Standard)"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand/20 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Battery Tech *</label>
                  <select
                    value={formTech}
                    onChange={(e) => setFormTech(e.target.value as BatteryTech)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand/20 focus:outline-hidden"
                  >
                    <option value="tubular">Tubular Series</option>
                    <option value="lithium">Lithium LFP Series</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Price in Naira & KVA Rating */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/80 p-4 rounded-2xl border border-slate-200">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800 block text-xs">Turnkey Price (₦ Naira) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₦</span>
                    <input
                      type="number"
                      required
                      min={100000}
                      value={formPrice}
                      onChange={(e) => setFormPrice(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono font-extrabold text-slate-900 focus:ring-2 focus:ring-brand/20 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800 block text-xs">Inverter KVA Rating *</label>
                  <input
                    type="text"
                    required
                    value={formKva}
                    onChange={(e) => setFormKva(e.target.value)}
                    placeholder="e.g. 1.5KVA, 3.5KVA, 5.0KVA, 6.0KVA, 10.0KVA"
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-brand/20 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Row 3: Batteries & Solar Panels Specs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Battery Info & Quantity</label>
                  <input
                    type="text"
                    value={formBatteryInfo}
                    onChange={(e) => setFormBatteryInfo(e.target.value)}
                    placeholder="e.g. 1x 10KWH Lithium Battery or 4x 220AH Tubular"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand/20 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Solar Panels Count</label>
                  <input
                    type="number"
                    min={0}
                    value={formPanels}
                    onChange={(e) => setFormPanels(parseInt(e.target.value) || 0)}
                    placeholder="e.g. 6"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand/20 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Row 4: Solar Cable & AC Support */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Solar Cable Specification</label>
                  <input
                    type="text"
                    value={formCableSize}
                    onChange={(e) => setFormCableSize(e.target.value)}
                    placeholder="e.g. 10mm² Solar Cable (30m)"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand/20 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Air Conditioner Support</label>
                  <input
                    type="text"
                    value={formAcSupport}
                    onChange={(e) => setFormAcSupport(e.target.value)}
                    placeholder="e.g. Supports AC / Microwave or No AC Support"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand/20 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Package Description</label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Summary description for quote generator and product details..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand/20 focus:outline-hidden resize-y min-h-[70px]"
                />
              </div>

              {/* Load Capability Tag Manager */}
              <div className="space-y-2 border-t border-slate-200 pt-3">
                <label className="font-bold text-slate-700 block">Can Carry / Appliance Capabilities</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={formLoadInput}
                    onChange={(e) => setFormLoadInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddLoadItem();
                      }
                    }}
                    placeholder="Add item e.g. Pumping Machine, Fridge, Microwave..."
                    className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand/20 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleAddLoadItem}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs cursor-pointer"
                  >
                    Add Load
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {formLoadList.map((loadItem, idx) => (
                    <span 
                      key={idx} 
                      className="bg-brand/10 text-brand border border-brand/20 font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-[11px]"
                    >
                      <span>{loadItem}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveLoadItem(loadItem)}
                        className="hover:text-rose-600 transition-colors cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setEditingPackage(null);
                    setIsCreatingNew(false);
                  }}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={savingPackage}
                  className="px-6 py-2.5 rounded-2xl bg-brand hover:bg-brand-dark text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-brand/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {savingPackage ? (
                    <Loader2 size={15} className="animate-spin text-white" />
                  ) : (
                    <Check size={15} />
                  )}
                  <span>{isCreatingNew ? 'Create Package' : 'Save Specifications & Price'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
