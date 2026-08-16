import React, { useState, useEffect, useMemo } from 'react';
import { Product, BlogPost } from '../types';
import { ProductCard } from './ProductCard';
import { SolarPackage, SOLAR_PACKAGES } from '../data/quote-data';
import { PackageUsageModeSelector } from './PackageUsageModeSelector';
import { AnimatedStatCounter } from './AnimatedStatCounter';
import { generateEnergyAuditPDF } from '../lib/pdfGenerator';
import { defaultBlogPosts } from '../data/blogPosts';

interface FullHomePageProps {
  onNavigate: (tab: string) => void;
  onSelectCategory: (category: string) => void;
  onViewProduct: (product: Product) => void;
  onAddToCart?: (product: Product, e?: React.MouseEvent) => void;
  onConsultPackage?: (pkg: any) => void;
  onOpenLogin?: () => void;
  onOpenCart?: () => void;
  onOpenProfile?: () => void;
  onLogout?: () => void;
  products: Product[];
  isLoadingProducts: boolean;
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
  triggerCameraSearch?: () => void;
  filteredSuggestions?: Product[];
  totalCartItems?: number;
  currentUser?: any;
  isAdmin?: boolean;
  isEditor?: boolean;
  wishlistIds?: string[];
  onToggleWishlist?: (product: Product, e?: React.MouseEvent) => void;
  recentlyViewedIds?: string[];
  onOpenWishlist?: () => void;
  blogPosts?: BlogPost[];
  onSelectBlogPost?: (post: BlogPost) => void;
  onTrackOrder?: (orderId: string) => void;
}

export const FullHomePage: React.FC<FullHomePageProps> = ({
  onNavigate,
  onSelectCategory,
  onViewProduct,
  onAddToCart,
  onConsultPackage,
  onOpenLogin,
  onOpenCart,
  onOpenProfile,
  onLogout,
  products,
  isLoadingProducts,
  searchQuery = '',
  setSearchQuery,
  triggerCameraSearch,
  filteredSuggestions = [],
  totalCartItems = 0,
  currentUser,
  isAdmin = false,
  isEditor = false,
  wishlistIds = [],
  onToggleWishlist,
  recentlyViewedIds = [],
  onOpenWishlist,
  blogPosts,
  onSelectBlogPost,
  onTrackOrder,
}) => {
  // Navigation & Search Controls State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchExpanded, setIsMobileSearchExpanded] = useState(false);
  const [isDesktopSearchOpen, setIsDesktopSearchOpen] = useState(false);
  const [isShopMenuOpen, setIsShopMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  // Compute real blog posts for home display
  const homeBlogPosts = useMemo(() => {
    return (blogPosts || []).filter(p => p.published !== false).slice(0, 3);
  }, [blogPosts]);

  // Hero Live Product Spotlight State
  const [spotlightIndex, setSpotlightIndex] = useState(0);

  const spotlightProducts = useMemo(() => {
    if (products && products.length > 0) {
      return products.slice(0, 6);
    }
    return [];
  }, [products]);

  const currentSpotlight = spotlightProducts[spotlightIndex] || spotlightProducts[0];

  useEffect(() => {
    if (spotlightProducts.length <= 1) return;
    const timer = setInterval(() => {
      setSpotlightIndex((prev) => (prev + 1) % spotlightProducts.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [spotlightProducts.length]);

  const handleNextSpotlight = () => {
    setSpotlightIndex((prev) => (prev + 1) % spotlightProducts.length);
  };

  const handlePrevSpotlight = () => {
    setSpotlightIndex((prev) => (prev - 1 + spotlightProducts.length) % spotlightProducts.length);
  };

  // Hero typing animation loop for 'security' -> 'life' -> 'savings'
  const heroWords = ['Security', 'Life', 'Savings'];
  const [currentWordIdx, setCurrentWordIdx] = useState(0);
  const [typedText, setTypedText] = useState('');
  const [isDeletingWord, setIsDeletingWord] = useState(false);
  const [typeSpeed, setTypeSpeed] = useState(30);

  useEffect(() => {
    const activeWord = heroWords[currentWordIdx];
    const handleType = () => {
      if (!isDeletingWord) {
        setTypedText(activeWord.substring(0, typedText.length + 1));
        if (typedText === activeWord) {
          setTimeout(() => setIsDeletingWord(true), 1200);
          setTypeSpeed(25);
        }
      } else {
        setTypedText(activeWord.substring(0, typedText.length - 1));
        if (typedText === '') {
          setIsDeletingWord(false);
          setCurrentWordIdx((prev) => (prev + 1) % heroWords.length);
          setTypeSpeed(30);
        }
      }
    };
    const t = setTimeout(handleType, typeSpeed);
    return () => clearTimeout(t);
  }, [typedText, isDeletingWord, currentWordIdx, typeSpeed]);

  // Section 2: Load Sizing Calculator Widget State (Using official 10 packages from SOLAR_PACKAGES)
  const [calcTech, setCalcTech] = useState<'lithium' | 'tubular'>('lithium');
  const [calcPkgId, setCalcPkgId] = useState<string>('li-4.0');

  const currentTechPackages = SOLAR_PACKAGES[calcTech] || [];
  const currentCalcPackage = currentTechPackages.find(p => p.id === calcPkgId) || currentTechPackages[0] || SOLAR_PACKAGES.lithium[0];

  // Convert SolarPackage object to standard Product interface for cart addition
  const handleAddPackageToCart = (pkg: SolarPackage, e?: React.MouseEvent) => {
    const pkgProduct: Product = {
      id: pkg.id,
      name: `SkyIT ${pkg.name} Solar Package`,
      description: pkg.description,
      category: 'Solar Packages',
      price: pkg.price,
      originalPrice: pkg.price,
      discountPercent: 0,
      rating: 5,
      ratingCount: 12,
      image: 'https://firebasestorage.googleapis.com/v0/b/gen-lang-client-0122140096.firebasestorage.app/o/skyit%20logo.png?alt=media&token=639a434a-2fc0-4063-ac43-4ca872cb99ae',
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

    if (onAddToCart) {
      onAddToCart(pkgProduct, e);
    }
    if (onOpenCart) {
      onOpenCart();
    }
  };

  const recentlyViewedProducts = useMemo(() => {
    if (!recentlyViewedIds || recentlyViewedIds.length === 0) return [];
    return recentlyViewedIds
      .map(id => products.find(p => p.id === id))
      .filter((p): p is Product => Boolean(p));
  }, [recentlyViewedIds, products]);

  // Section 6: Interactive Energy Audit Tool State
  const [auditCounts, setAuditCounts] = useState({
    bulbs: 5,
    fans: 2,
    tv: 1,
    laptops: 1,
    freezer: 0,
    ac: 0,
    waterPump: 0,
    microwave: 0
  });

  // Engineering Mode: Custom watts per appliance with localStorage persistence & save toast
  const [isEngineeringMode, setIsEngineeringMode] = useState<boolean>(false);
  const [wattsSavedToast, setWattsSavedToast] = useState<boolean>(false);
  const [guestLoginPrompt, setGuestLoginPrompt] = useState<boolean>(false);
  const [customApplianceWatts, setCustomApplianceWatts] = useState<Record<string, number | ''>>(() => {
    try {
      const saved = localStorage.getItem('solar_custom_appliance_watts');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // fallback
    }
    return {
      bulbs: 15,
      fans: 65,
      tv: 150,
      laptops: 80,
      freezer: 250,
      ac: 1200,
      waterPump: 1000,
      microwave: 1200
    };
  });

  const handleSaveCustomWatts = () => {
    if (!currentUser) {
      setGuestLoginPrompt(true);
      setTimeout(() => setGuestLoginPrompt(false), 5000);
      return;
    }

    try {
      // sanitize any empty strings before saving
      const sanitized: Record<string, number> = {
        bulbs: Number(customApplianceWatts.bulbs) || 15,
        fans: Number(customApplianceWatts.fans) || 65,
        tv: Number(customApplianceWatts.tv) || 150,
        laptops: Number(customApplianceWatts.laptops) || 80,
        freezer: Number(customApplianceWatts.freezer) || 250,
        ac: Number(customApplianceWatts.ac) || 1200,
        waterPump: Number(customApplianceWatts.waterPump) || 1000,
        microwave: Number(customApplianceWatts.microwave) || 1200
      };
      setCustomApplianceWatts(sanitized);
      localStorage.setItem('solar_custom_appliance_watts', JSON.stringify(sanitized));
      setGuestLoginPrompt(false);
      setWattsSavedToast(true);
      setTimeout(() => setWattsSavedToast(false), 2500);
    } catch (e) {
      console.error('Failed to save custom watts', e);
    }
  };

  const handleResetCustomWatts = () => {
    const defaultWatts: Record<string, number> = {
      bulbs: 15,
      fans: 65,
      tv: 150,
      laptops: 80,
      freezer: 250,
      ac: 1200,
      waterPump: 1000,
      microwave: 1200
    };
    setCustomApplianceWatts(defaultWatts);
    try {
      localStorage.setItem('solar_custom_appliance_watts', JSON.stringify(defaultWatts));
      setWattsSavedToast(true);
      setTimeout(() => setWattsSavedToast(false), 2500);
    } catch {
      // ignore
    }
  };

  // Package Tier Selection in Audit: 'budget' (lowest entry) or 'optimal' (recommended best-fit)
  const [selectedAuditTier, setSelectedAuditTier] = useState<'budget' | 'optimal'>('budget');

  const [showAuditModal, setShowAuditModal] = useState<boolean>(false);
  const [downloadedRefCode, setDownloadedRefCode] = useState<string>('');
  const [backupHours, setBackupHours] = useState<number>(8);

  // Advanced Solar Calculator Mode: 'basic' | 'pro'
  const [calcMode, setCalcMode] = useState<'basic' | 'pro'>('basic');

  // Day & Solar Inclusion Settings
  const [includeDaytimeSolar, setIncludeDaytimeSolar] = useState<boolean>(true);

  // Pro Mode Battery & Solar Specs & Manual Overrides
  const [batteryTech, setBatteryTech] = useState<'lithium' | 'tubular'>('tubular');
  const [selectedBatterySpec, setSelectedBatterySpec] = useState<string>('12V_220Ah');
  const [customBatteryAh, setCustomBatteryAh] = useState<number>(220);
  const [customBatteryVolt, setCustomBatteryVolt] = useState<number>(12);
  const [manualSystemVoltage, setManualSystemVoltage] = useState<number>(0); // 0 = auto
  const [peakSunHours, setPeakSunHours] = useState<number>(5.0);
  
  // Solar Panel Specs & Custom Panel Manual Input
  const [panelWattage, setPanelWattage] = useState<number>(300);
  const [panelType, setPanelType] = useState<string>('Mono PERC');
  const [selectedPanelPreset, setSelectedPanelPreset] = useState<string>('300W_Mono');
  const [isCustomPanel, setIsCustomPanel] = useState<boolean>(false);

  const resetProEngineeringSettings = () => {
    setManualSystemVoltage(0);
    setSelectedBatterySpec('12V_220Ah');
    setBatteryTech('tubular');
    setPanelWattage(300);
    setPanelType('Mono PERC');
    setSelectedPanelPreset('300W_Mono');
    setIsCustomPanel(false);
    setPeakSunHours(5.0);
    setBackupHours(8);
    setIncludeDaytimeSolar(true);
    setCustomApplianceWatts({
      bulbs: 15,
      fans: 65,
      tv: 150,
      laptops: 80,
      freezer: 250,
      ac: 1200,
      waterPump: 1000,
      microwave: 1200
    });
  };

  const updateAuditCount = (key: keyof typeof auditCounts, delta: number) => {
    setAuditCounts(prev => ({
      ...prev,
      [key]: Math.max(0, prev[key] + delta)
    }));
  };

  const updateCustomWatts = (key: string, val: string) => {
    if (val === '') {
      setCustomApplianceWatts(prev => ({
        ...prev,
        [key]: ''
      }));
      return;
    }
    const num = parseInt(val, 10);
    if (!isNaN(num)) {
      setCustomApplianceWatts(prev => ({
        ...prev,
        [key]: Math.min(15000, Math.max(0, num))
      }));
    }
  };

  const handleBlurCustomWatts = (key: string, fallbackDefault: number) => {
    setCustomApplianceWatts(prev => {
      const current = prev[key];
      if (current === '' || current === undefined || current === 0) {
        return {
          ...prev,
          [key]: fallbackDefault
        };
      }
      return prev;
    });
  };

  const totalSustainedWattage = 
    (auditCounts.bulbs * (Number(customApplianceWatts.bulbs) || 15)) + 
    (auditCounts.fans * (Number(customApplianceWatts.fans) || 65)) + 
    (auditCounts.tv * (Number(customApplianceWatts.tv) || 150)) + 
    (auditCounts.laptops * (Number(customApplianceWatts.laptops) || 80)) + 
    (auditCounts.freezer * (Number(customApplianceWatts.freezer) || 250)) + 
    (auditCounts.ac * (Number(customApplianceWatts.ac) || 1200)) + 
    (auditCounts.waterPump * (Number(customApplianceWatts.waterPump) || 1000)) +
    (auditCounts.microwave * (Number(customApplianceWatts.microwave) || 1200));

  // System Voltage Determination
  const autoSystemVoltage = useMemo(() => {
    if (totalSustainedWattage < 1000) return 12;
    if (totalSustainedWattage < 3000) return 24;
    return 48;
  }, [totalSustainedWattage]);

  const activeSystemVoltage = manualSystemVoltage > 0 ? manualSystemVoltage : autoSystemVoltage;

  // Selected Battery Unit Details
  const batteryUnitDetails = useMemo(() => {
    if (selectedBatterySpec === '12V_220Ah') {
      return { label: '12V 220Ah Tubular', v: 12, ah: 220, wh: 2640 };
    }
    if (selectedBatterySpec === '12V_200Ah') {
      return { label: '12V 200Ah Tubular', v: 12, ah: 200, wh: 2400 };
    }
    if (selectedBatterySpec === '51.2V_100Ah') {
      return { label: '51.2V 100Ah Lithium (5.12kWh)', v: 51.2, ah: 100, wh: 5120 };
    }
    if (selectedBatterySpec === '51.2V_200Ah') {
      return { label: '51.2V 200Ah Lithium (10.24kWh)', v: 51.2, ah: 200, wh: 10240 };
    }
    return {
      label: `${customBatteryVolt}V ${customBatteryAh}Ah Custom`,
      v: customBatteryVolt || 12,
      ah: customBatteryAh || 200,
      wh: (customBatteryVolt || 12) * (customBatteryAh || 200)
    };
  }, [selectedBatterySpec, customBatteryAh, customBatteryVolt]);

  // Depth of Discharge Factor & Efficiency
  const dodFactor = batteryTech === 'lithium' ? 0.85 : 0.50;
  const batteryEfficiency = batteryTech === 'lithium' ? 0.95 : 0.80;

  // Effective battery discharge hours (Solar handles ~10 daytime hours directly, so battery carries max 14 night hours for a 24h cycle)
  const effectiveBatteryHours = (includeDaytimeSolar && backupHours > 14) 
    ? 14 
    : backupHours;

  // Required Storage Capacity (kWh)
  const requiredBatteryKwhNum = totalSustainedWattage === 0 
    ? 0 
    : (totalSustainedWattage * effectiveBatteryHours) / (1000 * dodFactor * batteryEfficiency);

  const recommendedBatteryKwh = requiredBatteryKwhNum.toFixed(1);

  // Exact Number of Physical Battery Units
  const calculatedBatteryUnits = useMemo(() => {
    if (totalSustainedWattage === 0 || requiredBatteryKwhNum === 0) return 0;
    const requiredWh = requiredBatteryKwhNum * 1000;
    const rawUnits = Math.ceil(requiredWh / batteryUnitDetails.wh);

    if (batteryUnitDetails.v < activeSystemVoltage) {
      const seriesStringCount = activeSystemVoltage / batteryUnitDetails.v;
      return Math.max(seriesStringCount, Math.ceil(rawUnits / seriesStringCount) * seriesStringCount);
    }
    return Math.max(1, rawUnits);
  }, [totalSustainedWattage, requiredBatteryKwhNum, batteryUnitDetails, activeSystemVoltage]);

  // Battery Bank Capacity @ System Voltage (Ah)
  const totalBankWh = calculatedBatteryUnits * batteryUnitDetails.wh;
  const totalAhAtVoltage = activeSystemVoltage > 0 ? Math.round(totalBankWh / activeSystemVoltage) : 0;

  // Solar Array & MPPT Sizing
  const dailyEnergyWh = totalSustainedWattage * backupHours;
  const requiredDailyPvWh = dailyEnergyWh / (dodFactor * batteryEfficiency);
  const requiredPvWattage = peakSunHours > 0 ? Math.ceil(requiredDailyPvWh / peakSunHours) : 0;
  
  const recommendedSolarWattage = includeDaytimeSolar 
    ? Math.ceil((Math.max(requiredPvWattage, totalSustainedWattage * 1.35)) / 100) * 100
    : 0;

  const activePanelWattage = panelWattage > 0 ? panelWattage : 300;

  const solarPanelCount = (includeDaytimeSolar && recommendedSolarWattage > 0) 
    ? Math.max(1, Math.ceil(recommendedSolarWattage / activePanelWattage))
    : 0;

  const totalSolarWattageActual = solarPanelCount * activePanelWattage;
  const calculatedMpptAmps = (activeSystemVoltage > 0 && totalSolarWattageActual > 0)
    ? Math.ceil((totalSolarWattageActual / activeSystemVoltage) * 1.25)
    : 0;

  // Sizing Strategy:
  // 1. Lowest / Budget-friendly Package: Entry point with accessible price
  // 2. Best / Optimal Package: Sized for full concurrent load + headroom
  const budgetEntryPackage: SolarPackage = useMemo(() => {
    if (totalSustainedWattage <= 1200) {
      return SOLAR_PACKAGES.tubular.find(p => p.id === 'tub-1.5') || SOLAR_PACKAGES.tubular[0];
    } else if (totalSustainedWattage <= 2200) {
      return SOLAR_PACKAGES.tubular.find(p => p.id === 'tub-3.5-std') || SOLAR_PACKAGES.tubular[1];
    } else if (totalSustainedWattage <= 3800) {
      return SOLAR_PACKAGES.tubular.find(p => p.id === 'tub-5.0-std') || SOLAR_PACKAGES.tubular[3];
    } else if (totalSustainedWattage <= 5000) {
      return SOLAR_PACKAGES.lithium.find(p => p.id === 'li-4.0') || SOLAR_PACKAGES.lithium[0];
    } else {
      return SOLAR_PACKAGES.lithium.find(p => p.id === 'li-6.0-10') || SOLAR_PACKAGES.lithium[1];
    }
  }, [totalSustainedWattage]);

  const optimalMatchedPackage: SolarPackage = useMemo(() => {
    if (totalSustainedWattage <= 800) {
      return SOLAR_PACKAGES.tubular.find(p => p.id === 'tub-1.5') || SOLAR_PACKAGES.tubular[0];
    } else if (totalSustainedWattage <= 1600) {
      return SOLAR_PACKAGES.tubular.find(p => p.id === 'tub-3.5-ext') || SOLAR_PACKAGES.tubular[2];
    } else if (totalSustainedWattage <= 2800) {
      return SOLAR_PACKAGES.lithium.find(p => p.id === 'li-4.0') || SOLAR_PACKAGES.lithium[0];
    } else if (totalSustainedWattage <= 4500) {
      return SOLAR_PACKAGES.lithium.find(p => p.id === 'li-6.0-10') || SOLAR_PACKAGES.lithium[1];
    } else if (totalSustainedWattage <= 7500) {
      return SOLAR_PACKAGES.lithium.find(p => p.id === 'li-6.0-15') || SOLAR_PACKAGES.lithium[2];
    } else {
      return SOLAR_PACKAGES.lithium.find(p => p.id === 'li-10.0-hyb') || SOLAR_PACKAGES.lithium[3];
    }
  }, [totalSustainedWattage]);

  // Optional upgrade package for small loads when 1.5KVA is already optimal
  const recommendedUpgradePackage: SolarPackage | null = useMemo(() => {
    if (budgetEntryPackage.id === optimalMatchedPackage.id) {
      // For small loads, provide a next-level upgrade option (e.g. 3.5KVA)
      return SOLAR_PACKAGES.tubular.find(p => p.id === 'tub-3.5-std') || SOLAR_PACKAGES.tubular[1];
    }
    return null;
  }, [budgetEntryPackage.id, optimalMatchedPackage.id]);

  const isIdenticalMatch = budgetEntryPackage.id === optimalMatchedPackage.id;

  // The active displayed package based on whether user chooses Lowest Entry vs Best Fit
  const activeAuditPackage: SolarPackage = useMemo(() => {
    if (isIdenticalMatch) {
      return selectedAuditTier === 'optimal' && recommendedUpgradePackage 
        ? recommendedUpgradePackage 
        : budgetEntryPackage;
    }
    return selectedAuditTier === 'optimal' ? optimalMatchedPackage : budgetEntryPackage;
  }, [isIdenticalMatch, selectedAuditTier, recommendedUpgradePackage, budgetEntryPackage, optimalMatchedPackage]);

  const bestMatchedPackage = activeAuditPackage;

  // Realistic Inverter Sizing Calculation
  const recommendedMinKva = totalSustainedWattage === 0 ? 0.8 : Math.max(1.5, (totalSustainedWattage / 650));

  const auditRecommendedSystem = bestMatchedPackage.name;

  const handleDownloadAuditPDF = async () => {
    const refCode = `SKY-AUD-${Math.floor(100000 + Math.random() * 900000)}`;
    setDownloadedRefCode(refCode);

    await generateEnergyAuditPDF({
      auditCounts,
      totalSustainedWattage,
      recommendedMinKva,
      bestMatchedPackage,
      recommendedBatteryKwh,
      recommendedSolarWattage: totalSolarWattageActual,
      backupHours,
      auditRef: refCode,
      includeDaytimeSolar,
      isProEngineered: calcMode === 'pro',
      batteryTech,
      batterySpecLabel: batteryUnitDetails.label,
      batteryUnitsCount: calculatedBatteryUnits,
      batteryBankAhAtVoltage: `${totalAhAtVoltage} Ah @ ${activeSystemVoltage}V`,
      systemVoltage: activeSystemVoltage,
      peakSunHours,
      solarPanelWattage: panelWattage,
      solarPanelType: panelType,
      solarPanelCount,
      mpptAmps: calculatedMpptAmps,
      daytimeHours: 10,
      nighttimeHours: backupHours
    });

    setShowAuditModal(true);
  };

  // Section 5: Component Shop Filter State
  const [selectedShopTab, setSelectedShopTab] = useState<'All' | 'Inverters' | 'Batteries' | 'Solar Panels' | 'Security Systems' | 'Accessories' | 'Industrial Solar'>('All');

  // Section 8: Logistics Tracking Input & Progress Animation State
  const [trackingInputId, setTrackingInputId] = useState('');
  const [activeTrackingStep, setActiveTrackingStep] = useState(0);

  const handleTrackOrderSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = trackingInputId.trim();
    if (onTrackOrder) {
      onTrackOrder(trimmed);
    } else {
      onNavigate('tracker');
    }
  };

  // Auto-playing continuous loop for live deployment progress
  useEffect(() => {
    const timer = setTimeout(() => {
      setActiveTrackingStep((prev) => (prev >= 3 ? 0 : prev + 1));
    }, activeTrackingStep === 3 ? 2500 : 1800);

    return () => clearTimeout(timer);
  }, [activeTrackingStep]);

  // Dynamic hardware items mapped from real products
  const hardwareList = useMemo(() => {
    if (products && products.length > 0) {
      return products.map(p => ({
        id: p.id,
        name: p.name,
        category: p.category,
        subCat: (p.category === 'Inverters' ? 'POWER INVERSION' : p.category === 'Batteries' ? 'ENERGY STORAGE' : p.category === 'Security Systems' ? 'SMART SECURITY' : 'SOLAR HARVEST'),
        price: p.price,
        image: p.image,
        alt: p.description || p.name,
        originalProduct: p
      }));
    }
    return [];
  }, [products]);

  // Filter hardware list
  const filteredHardware = selectedShopTab === 'All' 
    ? hardwareList.slice(0, 8) 
    : hardwareList.filter(h => h.category === selectedShopTab).slice(0, 8);

  return (
    <div className="bg-[#0e131e] text-[#dee2f2] font-body-md selection:bg-[#0066ff] selection:text-[#f8f7ff] min-h-screen w-full">
      
      <main>
        {/* Section 2: Hero & Load Calculator */}
        <section className="relative min-h-[850px] flex flex-col items-center justify-center pt-16 pb-12 px-2.5 sm:px-10">
          <div className="relative z-10 max-w-7xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left Hero Text */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <span className="inline-block px-4 py-1.5 rounded-full bg-[#0066ff]/20 border border-[#0066ff]/30 text-[#b3c5ff] text-[12px] leading-[16px] font-medium uppercase tracking-widest">
                Industrial Precision. Unmatched Power.
              </span>
              <h1 className="text-[32px] sm:text-[48px] lg:text-[54px] leading-[40px] sm:leading-[56px] lg:leading-[62px] font-bold text-[#dee2f2] tracking-[-0.02em]">
                Uninterrupted Power &amp; <br/>
                <span className="text-[#b3c5ff]">24/7 Smart <span className="inline-block min-w-[60px] sm:min-w-[75px] md:min-w-[85px] lg:min-w-[105px] text-amber-400 font-extrabold">{typedText}<span className="animate-pulse font-light text-white ml-0.5">|</span></span></span>
              </h1>
              <p className="text-[16px] sm:text-[18px] leading-[26px] sm:leading-[28px] text-[#c2c6d8] max-w-2xl mx-auto lg:mx-0">
                Providing Nigeria's most reliable solar infrastructure and smart surveillance systems for homes and heavy industrial sites.
              </p>
              <div className="flex flex-wrap justify-center lg:justify-start gap-3 sm:gap-4 pt-2">
                <button 
                  type="button"
                  onClick={() => onNavigate('quote')}
                  className="bg-[#0066ff] text-[#f8f7ff] px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl text-[18px] sm:text-[22px] font-bold hover:brightness-110 transition-all safety-glow cursor-pointer"
                >
                  Install Solar Power
                </button>
                <button 
                  type="button"
                  onClick={() => { onSelectCategory('All'); onNavigate('shop'); }}
                  className="border-2 border-white/20 text-[#dee2f2] px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl text-[18px] sm:text-[22px] font-bold hover:bg-white/5 transition-all cursor-pointer"
                >
                  Explore All Catalog
                </button>
              </div>
            </div>

            {/* Right Live Product Spotlight Card (Hidden on mobile) */}
            {isLoadingProducts ? (
              <div className="hidden lg:flex lg:col-span-5 justify-center lg:justify-end w-full">
                <div className="w-full max-w-md bg-[#f0f4fa] rounded-[24px] p-5 sm:p-6 border border-slate-200/90 shadow-2xl space-y-4 animate-pulse">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
                    <div className="h-4 w-36 bg-slate-300/80 rounded-md" />
                    <div className="h-5 w-16 bg-slate-300/80 rounded-full" />
                  </div>
                  <div className="flex items-center gap-4 py-1">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-slate-300/80 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-16 bg-slate-300/80 rounded-md" />
                      <div className="h-4 w-full bg-slate-300/80 rounded-md" />
                      <div className="h-4 w-3/4 bg-slate-300/80 rounded-md" />
                      <div className="h-5 w-24 bg-slate-300/80 rounded-md mt-2" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-200/80">
                    <div className="h-8 w-28 bg-slate-300/80 rounded-xl" />
                    <div className="h-4 w-20 bg-slate-300/80 rounded-md" />
                  </div>
                </div>
              </div>
            ) : currentSpotlight ? (
              <div className="hidden lg:flex lg:col-span-5 justify-center lg:justify-end w-full">
                <div className="w-full max-w-md bg-[#f0f4fa] text-[#0f172a] rounded-[24px] p-5 sm:p-6 border border-slate-200/90 shadow-2xl space-y-4 animate-fade-in">
                  {/* Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
                    <span className="text-xs font-black uppercase tracking-wider text-[#1e293b] font-display flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Live Product Spotlight
                    </span>
                    <button 
                      type="button"
                      onClick={() => { onSelectCategory('All'); onNavigate('shop'); }}
                      className="bg-[#e2e8f0] hover:bg-[#cbd5e1] text-[#1e293b] text-xs font-bold px-3 py-1 rounded-full transition-colors cursor-pointer flex items-center gap-1"
                    >
                      Catalog &gt;
                    </button>
                  </div>

                  {/* Product Info */}
                  <div className="flex items-center gap-4 py-1">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white border border-slate-200/80 p-2 flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
                      <img 
                        src={currentSpotlight.image} 
                        alt={currentSpotlight.name} 
                        className="w-full h-full object-contain hover:scale-105 transition-transform duration-300" 
                      />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div>
                        <span className="inline-block bg-[#e2e8f0] text-[#1e293b] border border-slate-300/60 text-xs font-extrabold uppercase px-2.5 py-0.5 rounded-md tracking-wider">
                          {currentSpotlight.category || 'Inverters'}
                        </span>
                      </div>
                      <h3 className="text-[14px] sm:text-[16px] font-bold text-[#0f172a] leading-snug line-clamp-2">
                        {currentSpotlight.name}
                      </h3>
                      {currentSpotlight.discountPercent > 0 && (
                        <div>
                          <span className="bg-[#ffe4e6] text-[#e11d48] border border-[#fecdd3] text-xs font-extrabold px-2 py-0.5 rounded-md inline-block">
                            -{currentSpotlight.discountPercent}% OFF
                          </span>
                        </div>
                      )}
                      <div className="flex items-baseline gap-2 pt-0.5">
                        <span className="text-[16px] sm:text-[18px] font-extrabold text-[#0f172a]">
                          ₦{currentSpotlight.price.toLocaleString('en-US').replace(/\s+/g, '')}
                        </span>
                        {currentSpotlight.originalPrice > currentSpotlight.price && (
                          <span className="text-xs line-through text-[#64748b] font-medium">
                            ₦{currentSpotlight.originalPrice.toLocaleString('en-US').replace(/\s+/g, '')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Footer Controls */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-200/80">
                    <button 
                      type="button"
                      onClick={() => onViewProduct(currentSpotlight)}
                      className="bg-white hover:bg-slate-50 border border-slate-300/80 text-[#0f172a] text-xs font-extrabold uppercase tracking-wider px-4 py-2 rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
                    >
                      Inspect Item
                    </button>
                    
                    <div className="flex items-center gap-3">
                      {/* Indicator Dots */}
                      <div className="flex items-center gap-1.5">
                        {spotlightProducts.map((_, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setSpotlightIndex(idx)}
                            className={`transition-all cursor-pointer ${
                              idx === spotlightIndex 
                                ? 'w-5 h-2 bg-[#0f172a] rounded-full' 
                                : 'w-2 h-2 bg-slate-300 hover:bg-slate-400 rounded-full'
                            }`}
                            aria-label={`Go to slide ${idx + 1}`}
                          />
                        ))}
                      </div>

                      {/* Prev & Next Arrows */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={handlePrevSpotlight}
                          className="w-7 h-7 rounded-lg border border-slate-300/80 bg-white hover:bg-slate-100 text-[#0f172a] flex items-center justify-center transition-all cursor-pointer active:scale-90"
                          aria-label="Previous Spotlight Item"
                        >
                          <span className="material-symbols-outlined text-sm">chevron_left</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleNextSpotlight}
                          className="w-7 h-7 rounded-lg border border-slate-300/80 bg-white hover:bg-slate-100 text-[#0f172a] flex items-center justify-center transition-all cursor-pointer active:scale-90"
                          aria-label="Next Spotlight Item"
                        >
                          <span className="material-symbols-outlined text-sm">chevron_right</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Section 2: Interactive Precision Energy Audit Tool (Primary Hero Sizing Tool) */}
          <div id="tour-home-audit" className="relative z-10 mt-16 w-full max-w-7xl glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-8 space-y-6 border border-white/10 shadow-2xl">
            {/* Calculator Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-white/10">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0066ff]/20 text-[#b3c5ff] border border-[#0066ff]/30 text-xs font-bold uppercase tracking-wider mb-2">
                  <span className="material-symbols-outlined text-sm">tune</span>
                  SkyIT Precision Sizing Engine
                </div>
                <h2 className="text-[26px] sm:text-[32px] leading-[34px] sm:leading-[40px] font-black text-[#dee2f2]">
                  Precision Energy Audit
                </h2>
                <p className="text-[13px] sm:text-[15px] text-[#c2c6d8] mt-1">
                  Adjust appliance quantities or edit load wattages in Engineering Mode to find your budget entry package and view the recommended best fit.
                </p>
              </div>

              {/* Edit Watts Toggle Switch */}
              <div className="flex items-center gap-2.5 self-start md:self-auto bg-[#171b27] px-3 py-1.5 rounded-xl border border-white/10 shadow-xs">
                <span className="text-xs font-bold text-[#dee2f2] flex items-center gap-1.5 whitespace-nowrap">
                  <span className="material-symbols-outlined text-amber-400 text-sm">tune</span>
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

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Column: Appliance Load Selector & Presets */}
              <div 
                className="lg:col-span-7 space-y-5 lg:sticky self-start"
                style={{
                  top: 'calc(100vh - 100% - 2rem)',
                  maxHeight: 'none'
                }}
              >
                
                {/* Simultaneous Load Explanation Notice */}
                <div className="p-3.5 rounded-2xl bg-[#171b27] border border-[#0066ff]/30 flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#0066ff] text-xl shrink-0 mt-0.5">bolt</span>
                  <p className="text-xs text-[#c2c6d8] leading-relaxed">
                    <strong className="text-white font-bold">Simultaneous Load Principle:</strong> Sizing is calculated strictly based on appliances powered <span className="text-[#b3c5ff] font-bold">at the exact same time</span> (concurrent peak load).
                  </p>
                </div>

                {/* Quick Preset Load Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 bg-[#171b27] p-2.5 rounded-2xl border border-white/5">
                  <span className="text-[11px] font-bold text-[#c2c6d8]">Quick Load Presets:</span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAuditCounts({ bulbs: 5, fans: 2, tv: 1, laptops: 1, freezer: 0, ac: 0, waterPump: 0, microwave: 0 })}
                      className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-[#303541] hover:bg-[#0066ff]/20 text-slate-700 dark:text-[#b3c5ff] hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10 text-[10px] font-extrabold cursor-pointer transition-all"
                    >
                      ⚡ Basic Entry Load
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuditCounts({ bulbs: 8, fans: 3, tv: 1, laptops: 2, freezer: 1, ac: 0, waterPump: 0, microwave: 0 })}
                      className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-[#303541] hover:bg-[#0066ff]/20 text-slate-700 dark:text-[#b3c5ff] hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10 text-[10px] font-extrabold cursor-pointer transition-all"
                    >
                      🏠 Standard Home
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuditCounts({ bulbs: 0, fans: 0, tv: 0, laptops: 0, freezer: 0, ac: 0, waterPump: 0, microwave: 0 })}
                      className="px-2.5 py-1 rounded-xl bg-rose-50 dark:bg-red-500/10 hover:bg-rose-100 dark:hover:bg-red-500/20 text-rose-700 dark:text-red-300 border border-rose-200 dark:border-red-500/20 text-[10px] font-extrabold cursor-pointer transition-all"
                    >
                      🧹 Clear All
                    </button>
                  </div>
                </div>

                {isEngineeringMode && (
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-base text-amber-400 shrink-0">tune</span>
                        <span><strong>Engineering Mode:</strong> Adjust individual appliance watts to match your exact ratings.</span>
                      </div>
                      {wattsSavedToast && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-slate-950 font-black text-[10px] animate-fade-in flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">check_circle</span>
                          Saved!
                        </span>
                      )}
                    </div>

                    {guestLoginPrompt && (
                      <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-center justify-between gap-2 animate-fade-in">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="material-symbols-outlined text-base text-rose-400 shrink-0">lock</span>
                          <span className="truncate">Please <strong>sign in</strong> or create an account to save custom load ratings.</span>
                        </div>
                        {onOpenLogin && (
                          <button
                            type="button"
                            onClick={onOpenLogin}
                            className="px-2.5 py-1 rounded-lg bg-rose-400 hover:bg-rose-300 text-slate-950 font-black text-[11px] shrink-0 cursor-pointer transition-all"
                          >
                            Sign In
                          </button>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-amber-500/20">
                      <button
                        type="button"
                        onClick={handleResetCustomWatts}
                        className="px-2.5 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-900 text-slate-300 hover:text-white border border-white/10 text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-xs">restart_alt</span>
                        <span>Reset Defaults</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveCustomWatts}
                        className="px-3 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[11px] cursor-pointer transition-all shadow-xs flex items-center gap-1 active:scale-95"
                      >
                        <span className="material-symbols-outlined text-xs">{currentUser ? 'save' : 'lock'}</span>
                        <span>{currentUser ? 'Save Custom Watts' : 'Login to Save Watts'}</span>
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Appliance Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { key: 'bulbs', name: 'LED Bulbs / Fittings', defaultWatts: 15, icon: 'lightbulb' },
                    { key: 'fans', name: 'Ceiling / Standing Fans', defaultWatts: 65, icon: 'mode_fan' },
                    { key: 'tv', name: 'Smart TV & Soundbar', defaultWatts: 150, icon: 'tv' },
                    { key: 'laptops', name: 'Laptops / Routers', defaultWatts: 80, icon: 'laptop_chromebook' },
                    { key: 'freezer', name: 'Freezer / Refrigerator', defaultWatts: 250, icon: 'kitchen' },
                    { 
                      key: 'ac', 
                      name: (() => {
                        const w = Number(customApplianceWatts.ac) || 1200;
                        if (w <= 900) return 'Inverter AC (1.0HP)';
                        if (w <= 1500) return 'Inverter AC (1.5HP)';
                        return `Inverter AC (${(w / 746).toFixed(1)}HP)`;
                      })(), 
                      defaultWatts: 1200, 
                      icon: 'ac_unit' 
                    },
                    { key: 'waterPump', name: 'Water Pumping Motor', defaultWatts: 1000, icon: 'water_pump' },
                    { key: 'microwave', name: 'Microwave / Kettle', defaultWatts: 1200, icon: 'microwave' },
                  ].map((appliance) => {
                    const currentWatts = customApplianceWatts[appliance.key] ?? appliance.defaultWatts;
                    return (
                      <div key={appliance.key} className="flex flex-col justify-between p-3.5 bg-[#171b27] rounded-2xl border border-white/5 hover:border-white/10 transition-all gap-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0 pr-2">
                            <div className="w-9 h-9 rounded-xl bg-[#303541] flex items-center justify-center shrink-0 text-[#b3c5ff]">
                              <span className="material-symbols-outlined text-lg">{appliance.icon}</span>
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-xs text-[#dee2f2] truncate">{appliance.name}</div>
                              {isEngineeringMode ? (
                                <div className="text-[11px] text-[#c2c6d8] flex items-center gap-1 mt-0.5">
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={customApplianceWatts[appliance.key] !== undefined ? customApplianceWatts[appliance.key] : appliance.defaultWatts}
                                    onChange={(e) => updateCustomWatts(appliance.key, e.target.value)}
                                    onBlur={() => handleBlurCustomWatts(appliance.key, appliance.defaultWatts)}
                                    placeholder={String(appliance.defaultWatts)}
                                    className="w-16 px-1.5 py-0.5 bg-slate-900 border border-amber-400/60 focus:border-amber-300 focus:outline-hidden rounded text-amber-300 font-mono text-xs font-bold text-center"
                                  />
                                  <span className="text-amber-400 font-bold text-[10px]">W each</span>
                                </div>
                              ) : (
                                <div className="text-[11px] text-[#c2c6d8] mt-0.5">
                                  {Number(currentWatts) || appliance.defaultWatts}W avg.
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button 
                              type="button"
                              onClick={() => updateAuditCount(appliance.key as keyof typeof auditCounts, -1)}
                              className="w-8 h-8 rounded-full border border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-transparent flex items-center justify-center text-slate-800 dark:text-white hover:bg-[#b3c5ff] hover:text-[#002b75] transition-all font-black text-sm cursor-pointer"
                            >
                              -
                            </button>
                            <span className="text-base font-extrabold w-5 text-center text-slate-800 dark:text-[#dee2f2]">
                              {auditCounts[appliance.key as keyof typeof auditCounts]}
                            </span>
                            <button 
                              type="button"
                              onClick={() => updateAuditCount(appliance.key as keyof typeof auditCounts, 1)}
                              className="w-8 h-8 rounded-full bg-slate-200 dark:bg-[#303541] flex items-center justify-center text-slate-900 dark:text-white hover:bg-[#b3c5ff] hover:text-[#002b75] transition-all font-black text-sm cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {isEngineeringMode && auditCounts[appliance.key as keyof typeof auditCounts] > 0 && (
                          <div className="text-[10px] text-right font-mono text-amber-300/80 pt-1 border-t border-white/5">
                            Subtotal: {(auditCounts[appliance.key as keyof typeof auditCounts] * (Number(currentWatts) || appliance.defaultWatts)).toLocaleString()} W
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Live Calculation Output & Best Matched Package */}
              <div className="lg:col-span-5 bg-[#303541] rounded-3xl p-4 sm:p-7 space-y-5 flex flex-col justify-between shadow-2xl border border-white/10">
                <div className="space-y-4 text-center sm:text-left">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div>
                      <span className="text-[11px] text-[#b3c5ff] font-bold uppercase tracking-widest block">Simultaneous Load</span>
                      <span className="text-[11px] text-[#c2c6d8]">Running at the same time</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                      0.8 PF Sized
                    </span>
                  </div>
                  
                  <div className="text-4xl sm:text-5xl font-black text-[#dee2f2]">
                    {totalSustainedWattage.toLocaleString('en-US').replace(/\s+/g, '')} <span className="text-xl text-[#b3c5ff] font-bold">Watts</span>
                  </div>

                  {/* Daytime Solar Panel Inclusion Toggle */}
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-[#171b27] border border-[#0066ff]/30 space-y-3 text-left">
                    <div className="space-y-0.5">
                      <span className="text-[11px] font-bold text-[#b3c5ff] uppercase tracking-wider block">Include Solar Panels?</span>
                      <span className="text-[10.5px] text-[#c2c6d8] block leading-snug">Calculate with daytime solar generation or inverter-only</span>
                    </div>

                    <div className="flex p-1 bg-[#303541] rounded-xl border border-white/10 w-full gap-1">
                      <button
                        type="button"
                        onClick={() => setIncludeDaytimeSolar(true)}
                        className={`flex-1 py-2 px-3 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer text-center ${
                          includeDaytimeSolar 
                            ? 'bg-[#0066ff] text-white shadow-md' 
                            : 'text-[#c2c6d8] hover:text-white hover:bg-white/5'
                        }`}
                      >
                        Yes (Solar)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIncludeDaytimeSolar(false);
                        }}
                        className={`flex-1 py-2 px-3 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer text-center ${
                          !includeDaytimeSolar 
                            ? 'bg-amber-500 text-slate-950 shadow-md font-black' 
                            : 'text-[#c2c6d8] hover:text-white hover:bg-white/5'
                        }`}
                      >
                        No (Inverter Only)
                      </button>
                    </div>

                    {includeDaytimeSolar ? (
                      <div className="p-2.5 rounded-xl bg-[#0066ff]/10 border border-[#0066ff]/20 flex items-center gap-2 text-[10px] text-[#b3c5ff]">
                        <span className="material-symbols-outlined text-amber-400 text-base shrink-0">wb_sunny</span>
                        <span><strong>Daytime Solar Active:</strong> Solar panels run appliances during daylight hours (~8h), reserving battery power for target night backup.</span>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1 text-[10px] text-amber-300">
                        <div className="flex items-center gap-1.5 font-bold">
                          <span className="material-symbols-outlined text-amber-400 text-base shrink-0">power_off</span>
                          <span>Inverter & Battery Backup Only (0 Solar Panels)</span>
                        </div>
                        <p className="text-[#c2c6d8] text-[9.5px] leading-tight">
                          💡 <strong>Expansion Tip:</strong> You can add <strong>{Math.max(2, Math.ceil((totalSustainedWattage * 1.35) / panelWattage))}x {panelWattage}W Solar Panels</strong> + MPPT controller to this package anytime for daytime solar power generation!
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Tier Selector: Lowest Budget Entry vs. Best Matched Package */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-[#c2c6d8]">
                      <span>Suggested Package Options:</span>
                      <span className="text-amber-300 font-mono text-[10px]">
                        {isIdenticalMatch
                          ? (selectedAuditTier === 'budget' ? '⭐ 100% Load Match' : '🚀 Expansion Upgrade')
                          : (selectedAuditTier === 'budget' ? '💡 Budget-Friendly First' : '🌟 Best Full-Load Fit')}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-[#171b27] p-1.5 rounded-2xl border border-white/10">
                      <button
                        type="button"
                        onClick={() => setSelectedAuditTier('budget')}
                        className={`p-2.5 rounded-xl text-left transition-all cursor-pointer flex flex-col justify-between border ${
                          selectedAuditTier === 'budget'
                            ? (isIdenticalMatch
                                ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-md'
                                : 'bg-amber-500/20 border-amber-400 text-white shadow-md')
                            : 'border-transparent text-[#c2c6d8] hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] uppercase font-black tracking-wider ${isIdenticalMatch ? 'text-emerald-300' : 'text-amber-300'}`}>
                            {isIdenticalMatch ? '⭐ 1. Recommended Match' : '1. Lowest Entry'}
                          </span>
                          {selectedAuditTier === 'budget' && (
                            <span className={`w-2 h-2 rounded-full ${isIdenticalMatch ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                          )}
                        </div>
                        <div className="font-extrabold text-xs text-white truncate mt-0.5">{budgetEntryPackage.name}</div>
                        <div className={`text-sm font-black mt-1 ${isIdenticalMatch ? 'text-emerald-300' : 'text-amber-300'}`}>
                          ₦{budgetEntryPackage.price.toLocaleString('en-US').replace(/\s+/g, '')}
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedAuditTier('optimal')}
                        className={`p-2.5 rounded-xl text-left transition-all cursor-pointer flex flex-col justify-between border ${
                          selectedAuditTier === 'optimal'
                            ? 'bg-[#0066ff]/25 border-[#0066ff] text-white shadow-md'
                            : 'border-transparent text-[#c2c6d8] hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-black tracking-wider text-[#b3c5ff]">
                            {isIdenticalMatch ? '2. Future Upgrade Tier' : '2. Best Fit (Recommended)'}
                          </span>
                          {selectedAuditTier === 'optimal' && <span className="w-2 h-2 rounded-full bg-[#0066ff]" />}
                        </div>
                        <div className="font-extrabold text-xs text-white truncate mt-0.5">
                          {isIdenticalMatch && recommendedUpgradePackage ? recommendedUpgradePackage.name : optimalMatchedPackage.name}
                        </div>
                        <div className="text-sm font-black text-[#b3c5ff] mt-1">
                          ₦{(isIdenticalMatch && recommendedUpgradePackage ? recommendedUpgradePackage.price : optimalMatchedPackage.price).toLocaleString('en-US').replace(/\s+/g, '')}
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Selected Package Details Card */}
                  <div className={`p-4 rounded-2xl border space-y-2 text-left transition-all ${
                    selectedAuditTier === 'budget'
                      ? (isIdenticalMatch ? 'bg-[#171b27] border-emerald-500/40' : 'bg-[#171b27] border-amber-500/40')
                      : 'bg-[#171b27] border-[#0066ff]/40'
                  }`}>
                    <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider">
                      <span className={
                        selectedAuditTier === 'budget'
                          ? (isIdenticalMatch ? 'text-emerald-400' : 'text-amber-400')
                          : 'text-[#b3c5ff]'
                      }>
                        {isIdenticalMatch
                          ? (selectedAuditTier === 'budget' ? '⭐ Recommended Best Match (Small Load)' : '🚀 Future Upgrade / Extra Capacity')
                          : (selectedAuditTier === 'budget' ? '💡 Lowest Entry Package' : '🌟 Recommended Best Fit')}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        selectedAuditTier === 'budget'
                          ? (isIdenticalMatch 
                              ? 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/20' 
                              : 'bg-amber-400/10 text-amber-300 border border-amber-400/20')
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {isIdenticalMatch
                          ? (selectedAuditTier === 'budget' ? '100% Best Fit' : 'Heavy Load Headroom')
                          : (selectedAuditTier === 'budget' ? 'Budget Friendly' : '100% Load Match')}
                      </span>
                    </div>
                    <div className="text-base font-black text-[#dee2f2]">{bestMatchedPackage.name}</div>
                    <div className={`text-2xl font-black ${
                      selectedAuditTier === 'budget'
                        ? (isIdenticalMatch ? 'text-emerald-400' : 'text-amber-400')
                        : 'text-[#0066ff]'
                    }`}>
                      ₦{bestMatchedPackage.price.toLocaleString('en-US').replace(/\s+/g, '')}
                    </div>
                    <p className="text-xs text-[#c2c6d8] line-clamp-2">{bestMatchedPackage.description}</p>
                    <div className="pt-1 flex flex-wrap gap-1.5 text-[10px] font-medium">
                      <span className="bg-[#303541] text-[#b3c5ff] px-2 py-0.5 rounded border border-white/5">{bestMatchedPackage.kva}</span>
                      <span className="bg-[#303541] text-[#b3c5ff] px-2 py-0.5 rounded border border-white/5">{bestMatchedPackage.batteryInfo}</span>
                      <span className="bg-[#303541] text-[#b3c5ff] px-2 py-0.5 rounded border border-white/5">{bestMatchedPackage.panels}x Solar Panels</span>
                      <span className="bg-[#303541] text-amber-300 px-2 py-0.5 rounded border border-white/5">{bestMatchedPackage.acSupport}</span>
                    </div>
                  </div>

                  {/* Target Backup Autonomy Selector */}
                  <div className="p-3.5 rounded-2xl bg-[#171b27] border border-amber-500/30 space-y-2.5 text-left">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">Target Backup Autonomy</span>
                        <span className="text-[10px] text-[#c2c6d8]">Hours of continuous battery power</span>
                      </div>
                      <span className="text-xs font-black text-amber-300 bg-amber-500/15 px-2.5 py-1 rounded-lg border border-amber-500/30">
                        {backupHours} Hours
                      </span>
                    </div>

                    {/* Quick Preset Buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[4, 6, 8, 12, 16, 24].map((hrs) => (
                        <button
                          key={hrs}
                          type="button"
                          onClick={() => setBackupHours(hrs)}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-extrabold transition-all cursor-pointer ${
                            backupHours === hrs 
                              ? 'bg-[#0066ff] text-white shadow-md' 
                              : 'bg-[#303541] text-[#c2c6d8] hover:bg-white/10'
                          }`}
                        >
                          {hrs}h
                        </button>
                      ))}
                    </div>

                    {/* Slider */}
                    <div className="space-y-1">
                      <input 
                        type="range"
                        min={2}
                        max={24}
                        step={1}
                        value={backupHours}
                        onChange={(e) => setBackupHours(Number(e.target.value))}
                        className="w-full accent-[#0066ff] bg-[#303541] h-1.5 rounded-lg cursor-pointer"
                      />
                      <div className="flex justify-between text-[9px] text-[#c2c6d8] font-medium">
                        <span>2h (Short)</span>
                        <span>12h (Overnight)</span>
                        <span>24h (Full Day)</span>
                      </div>
                    </div>
                  </div>

                  {/* Specification Breakdown Metrics */}
                  <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-center">
                    <div className="p-2 sm:p-2.5 rounded-xl bg-[#0e131e] border border-white/5 flex flex-col justify-center items-center min-h-[58px]">
                      <span className="text-[9px] sm:text-[10px] text-[#c2c6d8] uppercase font-bold leading-tight text-center whitespace-normal">
                        Min. Inverter
                      </span>
                      <span className="text-xs sm:text-sm font-extrabold text-[#dee2f2] mt-0.5">
                        {recommendedMinKva.toFixed(1)} kVA
                      </span>
                    </div>
                    <div className="p-2 sm:p-2.5 rounded-xl bg-[#0e131e] border border-white/5 flex flex-col justify-center items-center min-h-[58px]">
                      <span className="text-[9px] sm:text-[10px] text-[#c2c6d8] uppercase font-bold leading-tight text-center whitespace-normal">
                        Battery Storage
                      </span>
                      <span className="text-xs sm:text-sm font-extrabold text-amber-400 mt-0.5">
                        {recommendedBatteryKwh} kWh
                      </span>
                    </div>
                    <div className="p-2 sm:p-2.5 rounded-xl bg-[#0e131e] border border-white/5 flex flex-col justify-center items-center min-h-[58px]">
                      <span className="text-[9px] sm:text-[10px] text-[#c2c6d8] uppercase font-bold leading-tight text-center whitespace-normal">
                        Solar Array
                      </span>
                      <span className="text-xs sm:text-sm font-extrabold text-[#dee2f2] mt-0.5">
                        {totalSolarWattageActual.toLocaleString('en-US').replace(/\s+/g, '')} W
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5 pt-2">
                  <button 
                    type="button"
                    onClick={(e) => handleAddPackageToCart(bestMatchedPackage, e)}
                    className="w-full py-3 px-3 rounded-xl bg-[#0066ff] hover:bg-[#0052cc] text-white font-extrabold text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 shadow-lg active:scale-95"
                  >
                    <span className="material-symbols-outlined text-base sm:text-lg shrink-0">shopping_cart</span>
                    <span className="hidden sm:inline">Order {selectedAuditTier === 'budget' ? 'Budget' : 'Optimal'} Package (₦{bestMatchedPackage.price.toLocaleString('en-US').replace(/\s+/g, '')})</span>
                    <span className="sm:hidden font-extrabold">Order Package</span>
                    <span className="sm:hidden bg-white/20 px-2 py-0.5 rounded-md text-[10px] font-black shrink-0">₦{bestMatchedPackage.price.toLocaleString('en-US').replace(/\s+/g, '')}</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      type="button"
                      onClick={() => {
                        if (onConsultPackage) {
                          onConsultPackage(bestMatchedPackage);
                        } else {
                          onNavigate('ai');
                        }
                      }}
                      className="py-2.5 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <span className="material-symbols-outlined text-amber-400 text-sm">auto_awesome</span>
                      <span>AI Consultant</span>
                    </button>

                    <button 
                      type="button"
                      onClick={handleDownloadAuditPDF}
                      className="py-2.5 px-3 rounded-xl bg-[#171b27] hover:bg-[#171b27]/80 text-[#b3c5ff] font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-white/5"
                    >
                      <span className="material-symbols-outlined text-sm">download</span>
                      <span>Audit Report</span>
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* Link Bar: View All Solar Packages */}
            <div className="pt-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-left space-y-0.5">
                <span className="text-xs font-bold text-[#b3c5ff] uppercase tracking-wider block">Prefer Pre-Configured Turnkey Solar Packages?</span>
                <p className="text-xs text-[#c2c6d8]">Explore our standard Lithium & Tubular solar packages with complete price & hardware breakdowns.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onNavigate('quote');
                }}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-[#0066ff] to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 active:scale-95 shrink-0"
              >
                <span className="material-symbols-outlined text-base">inventory_2</span>
                <span>View All Solar Packages</span>
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </button>
            </div>
          </div>

          {/* Live Metrics Bar */}
          <div className="relative z-10 mt-12 w-full max-w-5xl flex flex-wrap justify-center gap-8 sm:gap-12 py-6 border-y border-white/5">
            <div className="flex flex-col items-center text-center">
              <span className="text-[20px] sm:text-[24px] font-extrabold text-[#dee2f2]">
                <AnimatedStatCounter target={8.4} decimals={1} suffix=" MW+" duration={2000} />
              </span>
              <span className="text-[12px] leading-[16px] uppercase text-[#b3c5ff] font-bold mt-1">Clean Power Generated</span>
            </div>
            <div className="flex flex-col items-center text-center">
              <span className="text-[20px] sm:text-[24px] font-extrabold text-[#dee2f2]">
                <AnimatedStatCounter target={1240} decimals={0} formatComma={true} suffix="+" duration={2200} />
              </span>
              <span className="text-[12px] leading-[16px] uppercase text-[#b3c5ff] font-bold mt-1">Industrial Sites Active</span>
            </div>
            <div className="flex flex-col items-center text-center">
              <span className="text-[20px] sm:text-[24px] font-extrabold text-[#dee2f2]">
                <AnimatedStatCounter target={99.9} decimals={1} suffix="%" duration={2000} />
              </span>
              <span className="text-[12px] leading-[16px] uppercase text-[#b3c5ff] font-bold mt-1">Uptime Reliability</span>
            </div>
            <div className="flex flex-col items-center text-center">
              <span className="text-[20px] sm:text-[24px] font-extrabold text-[#dee2f2]">
                <AnimatedStatCounter target={24} secondTarget={7} suffix="" duration={1800} />
              </span>
              <span className="text-[12px] leading-[16px] uppercase text-[#b3c5ff] font-bold mt-1">Monitoring Active</span>
            </div>
          </div>
        </section>

        {/* Section 3: Technical Pillars */}
        <section className="py-20 sm:py-24 px-4 sm:px-10 max-w-[1440px] mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="glass-card p-8 rounded-3xl space-y-4 hover:translate-y-[-8px] transition-all duration-300">
              <span className="material-symbols-outlined text-4xl text-[#b3c5ff]">bolt</span>
              <h4 className="text-[24px] leading-[32px] font-bold text-[#dee2f2]">MPPT Inverters</h4>
              <p className="text-[16px] leading-[24px] text-[#c2c6d8]">High-efficiency tracking for 30% more energy harvest than PWM systems.</p>
            </div>
            <div className="glass-card p-8 rounded-3xl space-y-4 hover:translate-y-[-8px] transition-all duration-300">
              <span className="material-symbols-outlined text-4xl text-[#b3c5ff]">battery_charging_full</span>
              <h4 className="text-[24px] leading-[32px] font-bold text-[#dee2f2]">LFP Lithium</h4>
              <p className="text-[16px] leading-[24px] text-[#c2c6d8]">Premium LiFePO4 cells with 6000+ cycle life and 10-year warranty design.</p>
            </div>
            <div className="glass-card p-8 rounded-3xl space-y-4 hover:translate-y-[-8px] transition-all duration-300">
              <span className="material-symbols-outlined text-4xl text-[#b3c5ff]">wb_sunny</span>
              <h4 className="text-[24px] leading-[32px] font-bold text-[#dee2f2]">Mono Panels</h4>
              <p className="text-[16px] leading-[24px] text-[#c2c6d8]">Tier-1 Monocrystalline PERC panels for peak performance in low light.</p>
            </div>
            <div className="glass-card p-8 rounded-3xl space-y-4 hover:translate-y-[-8px] transition-all duration-300">
              <span className="material-symbols-outlined text-4xl text-[#b3c5ff]">local_shipping</span>
              <h4 className="text-[24px] leading-[32px] font-bold text-[#dee2f2]">Nationwide</h4>
              <p className="text-[16px] leading-[24px] text-[#c2c6d8]">Secure logistics and expert installation teams across all Nigerian states.</p>
            </div>
          </div>
        </section>

        {/* Section 4: Hardware Shop */}
        <section id="tour-home-shop" className="py-16 sm:py-20 px-4 sm:px-10 max-w-[1440px] mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
            <div>
              <h2 className="text-[28px] sm:text-[32px] leading-[36px] sm:leading-[40px] font-bold text-[#dee2f2]">Component Shop</h2>
              <p className="text-[15px] sm:text-[18px] leading-[22px] sm:leading-[28px] text-[#c2c6d8] mt-1">Industrial-grade components for custom infrastructure.</p>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 max-w-full">
              {(['All', 'Inverters', 'Batteries', 'Solar Panels', 'Security Systems', 'Accessories', 'Industrial Solar'] as const).map((tab) => (
                <button 
                  key={tab}
                  type="button"
                  onClick={() => setSelectedShopTab(tab)}
                  className={`whitespace-nowrap px-4 sm:px-6 py-2 rounded-full font-bold text-xs sm:text-[14px] transition-all cursor-pointer ${
                    selectedShopTab === tab 
                      ? 'border border-[#b3c5ff] text-[#b3c5ff] bg-[#0066ff]/20' 
                      : 'border border-white/10 text-[#c2c6d8] hover:text-[#dee2f2]'
                  }`}
                >
                  {tab === 'All' ? 'All Hardware' : tab === 'Security Systems' ? 'CCTV Kits' : tab}
                </button>
              ))}
            </div>
          </div>

          {isLoadingProducts ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-[#131926] border border-white/5 rounded-2xl p-4 space-y-3 animate-pulse">
                  <div className="w-full h-36 sm:h-44 bg-white/5 rounded-xl flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-white/5" />
                  </div>
                  <div className="h-3 w-16 bg-white/10 rounded" />
                  <div className="h-4 w-full bg-white/10 rounded" />
                  <div className="h-4 w-2/3 bg-white/10 rounded" />
                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <div className="h-5 w-20 bg-white/10 rounded" />
                    <div className="h-7 w-16 bg-white/10 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredHardware.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
              {filteredHardware.map((item) => {
                const productObj: Product = item.originalProduct || {
                  id: item.id,
                  name: item.name,
                  price: item.price,
                  originalPrice: item.price,
                  category: (item.category === 'Security Systems' ? 'CCTV Kits' : item.category) as any,
                  description: item.name,
                  rating: 4.9,
                  ratingCount: 18,
                  inStock: true,
                  image: item.image,
                  specs: { Type: item.subCat },
                  warranty: '2 Years',
                  isNew: true,
                  discountPercent: 0
                };
                const isWishlisted = wishlistIds.includes(productObj.id);

                return (
                  <ProductCard 
                    key={item.id}
                    product={productObj}
                    onAddToCart={(prod, e) => {
                      if (onAddToCart) {
                        onAddToCart(prod, e);
                      } else {
                        onNavigate('shop');
                      }
                    }}
                    onViewDetails={(prod) => {
                      onViewProduct(prod);
                    }}
                    isWishlisted={isWishlisted}
                    onToggleWishlist={(prod, e) => {
                      if (onToggleWishlist) {
                        onToggleWishlist(prod, e);
                      }
                    }}
                  />
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-[#8e95b0]">
              <p className="text-sm font-semibold">No hardware items found in this category.</p>
            </div>
          )}

          {/* View All Button */}
          <div className="mt-10 sm:mt-12 text-center">
            <button
              type="button"
              onClick={() => onNavigate('shop')}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-[#0066ff] hover:bg-[#0052cc] text-white font-extrabold text-sm transition-all shadow-lg active:scale-95 cursor-pointer"
            >
              <span>View All Products in Catalog</span>
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </button>
          </div>
        </section>

        {/* Recently Viewed Products Section */}
        {recentlyViewedProducts.length > 0 && (
          <section className="py-12 px-4 sm:px-10 max-w-[1440px] mx-auto border-t border-white/5">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-[#dee2f2]">Recently Viewed</h3>
                <p className="text-xs sm:text-sm text-[#c2c6d8] mt-0.5">Quickly jump back to hardware you inspected.</p>
              </div>
              <button 
                type="button"
                onClick={() => onNavigate('recently-viewed')}
                className="text-xs font-bold text-[#b3c5ff] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View Full History ({recentlyViewedProducts.length})</span>
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
              {recentlyViewedProducts.slice(0, 4).map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  onAddToCart={(prod, e) => {
                    if (onAddToCart) onAddToCart(prod, e);
                  }}
                  onViewDetails={onViewProduct}
                  isWishlisted={wishlistIds.includes(p.id)}
                  onToggleWishlist={onToggleWishlist}
                />
              ))}
            </div>
          </section>
        )}

        {/* Section 7: AI Energy Specialist Banner */}
        <section className="py-12 px-4 sm:px-10">
          <div className="max-w-[1440px] mx-auto bg-gradient-to-r from-[#303541] to-[#171b27] rounded-3xl p-6 sm:p-10 border border-[#b3c5ff]/20 flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8 shadow-xl">
            <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 sm:gap-6 w-full md:w-auto">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#b3c5ff]/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-3xl sm:text-4xl text-[#b3c5ff]" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
              </div>
              <div className="flex flex-col items-center sm:items-start w-full">
                <h3 className="text-[20px] sm:text-[24px] leading-[28px] sm:leading-[32px] font-bold text-[#dee2f2] flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span>SkyIT AI Consultant</span>
                  <span className="text-[11px] sm:text-[12px] bg-[#b3c5ff] text-[#002b75] px-2 py-0.5 rounded font-bold uppercase tracking-wider">POWERED BY GEMINI</span>
                </h3>
                <p className="text-[14px] sm:text-[16px] leading-[22px] sm:leading-[24px] text-[#c2c6d8] max-w-md mt-2">
                  Our AI energy specialist can analyze your consumption patterns and design a custom hardware stack in seconds.
                </p>
              </div>
            </div>
            <button 
              onClick={() => onNavigate('ai')}
              className="w-full sm:w-auto justify-center bg-[#b3c5ff] text-[#002b75] px-8 py-3.5 sm:py-4 rounded-xl font-bold text-[14px] leading-[20px] flex items-center gap-2.5 hover:brightness-110 transition-all cursor-pointer shrink-0 shadow-lg active:scale-95"
            >
              <span>Start Consultation</span>
              <span className="material-symbols-outlined">smart_toy</span>
            </button>
          </div>
        </section>

        {/* Section 8: Logistics Tracking */}
        <section className="py-16 sm:py-24 px-2 sm:px-10 max-w-[1440px] mx-auto">
          <div className="text-center mb-10 sm:mb-16 px-2">
            <h2 className="text-[26px] sm:text-[32px] leading-[34px] sm:leading-[40px] font-bold text-[#dee2f2]">Track Your Deployment</h2>
            <p className="text-[15px] sm:text-[18px] leading-[22px] sm:leading-[28px] text-[#c2c6d8] mt-2">Real-time logistics monitoring for your hardware delivery.</p>
          </div>
          <div id="tour-home-tracking" className="max-w-3xl mx-auto glass-card rounded-2xl sm:rounded-[2.5rem] p-3.5 sm:p-12 space-y-6 sm:space-y-8">
            <form onSubmit={handleTrackOrderSubmit} className="flex flex-col md:flex-row gap-3 sm:gap-4">
              <input 
                type="text"
                value={trackingInputId}
                onChange={(e) => setTrackingInputId(e.target.value)}
                className="flex-1 bg-[#0e131e] border border-white/10 rounded-xl px-4 sm:px-6 py-3.5 sm:py-4 text-[#dee2f2] focus:border-[#0066ff] focus:ring-1 focus:ring-[#0066ff] outline-none transition-all font-mono text-sm sm:text-base"
                placeholder="Enter Tracking ID (e.g., SK-98231)"
              />
              <button 
                type="submit"
                className="bg-[#0066ff] text-[#f8f7ff] px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl font-bold text-[14px] leading-[20px] cursor-pointer hover:bg-[#0052cc] active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shrink-0"
              >
                <span>Track Order</span>
              </button>
            </form>

            {/* Live Status Badge Banner */}
            <div className="bg-[#0e131e]/90 border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-5 flex flex-col gap-2.5 text-left">
              {/* Top: Live Tracking Tag */}
              <div className="flex items-center justify-between">
                <span className="text-[9px] sm:text-[10px] bg-[#38bdf8]/10 border border-[#38bdf8]/30 text-[#38bdf8] font-bold uppercase tracking-wider px-2 sm:px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8] animate-pulse"></span>
                  LIVE TRACKING
                </span>
                
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${
                    activeTrackingStep === 3 
                      ? 'bg-emerald-400 animate-pulse ring-4 ring-emerald-500/20' 
                      : 'bg-[#0066ff] animate-ping ring-4 ring-[#0066ff]/20'
                  }`} />
                  <span className="text-[9px] sm:text-[10px] uppercase tracking-widest text-[#8e95b0] font-bold">LOGISTICS STATUS</span>
                </div>
              </div>

              {/* Main Status Message Text across full width */}
              <div className="pt-1.5 border-t border-white/5">
                <span className="font-bold text-[#dee2f2] text-xs sm:text-base leading-relaxed block">
                  {activeTrackingStep === 0 && '📦 Order Processed & Hardware Reserved'}
                  {activeTrackingStep === 1 && '⚙️ 48-Point Quality & Load Testing in Progress'}
                  {activeTrackingStep === 2 && '🚚 Dispatched & In Transit on SkyIT Logistics Fleet'}
                  {activeTrackingStep === 3 && '✅ Order Delivered & Ready for Installation!'}
                </span>
              </div>
            </div>

            {/* Stepper Track */}
            <div className="relative pt-4 sm:pt-6 pb-2">
              {/* Background Track Line */}
              <div className="absolute top-[36px] sm:top-[48px] left-[12.5%] right-[12.5%] h-[3px] sm:h-[4px] bg-white/10 rounded-full z-0" />
              
              {/* Animated Progress Line */}
              <div 
                className="absolute top-[36px] sm:top-[48px] left-[12.5%] h-[3px] sm:h-[4px] bg-gradient-to-r from-[#0066ff] via-[#38bdf8] to-[#10b981] rounded-full z-0 transition-all duration-700 ease-in-out shadow-[0_0_12px_rgba(0,102,255,0.8)]"
                style={{
                  width: `${(activeTrackingStep / 3) * 75}%`
                }}
              />

              <div className="grid grid-cols-4 relative z-10 gap-1 sm:gap-2">
                {[
                  { label: 'Processed', icon: 'inventory', sub: 'Confirmed' },
                  { label: 'Quality Testing', icon: 'conveyor_belt', sub: 'Testing' },
                  { label: 'In Transit', icon: 'local_shipping', sub: 'En Route' },
                  { label: 'Delivered', icon: 'check_circle', sub: 'Completed' }
                ].map((step, idx) => {
                  const isDone = idx < activeTrackingStep;
                  const isCurrent = idx === activeTrackingStep;
                  const isReached = idx <= activeTrackingStep;

                  return (
                    <div 
                      key={step.label}
                      onClick={() => {
                        setActiveTrackingStep(idx);
                      }}
                      className="flex flex-col items-center gap-2 sm:gap-3 text-center cursor-pointer group select-none px-0.5"
                    >
                      <div 
                        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-500 ${
                          isCurrent
                            ? activeTrackingStep === 3 
                              ? 'bg-[#10b981] text-white shadow-[0_0_20px_rgba(16,185,129,0.9)] scale-105 sm:scale-110 ring-2 sm:ring-4 ring-[#10b981]/30'
                              : 'bg-[#0066ff] text-white shadow-[0_0_20px_rgba(0,102,255,0.9)] scale-105 sm:scale-110 ring-2 sm:ring-4 ring-[#0066ff]/30'
                            : isDone
                            ? 'bg-[#10b981] text-white shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                            : 'bg-[#1e2433] text-[#6b7280] opacity-50 group-hover:opacity-80'
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm sm:text-base !text-white">
                          {isDone ? 'check' : step.icon}
                        </span>
                      </div>
                      <div className="flex flex-col items-center w-full">
                        <span className={`font-bold text-[10px] sm:text-[12px] leading-[13px] sm:leading-[16px] transition-colors break-words ${
                          isReached ? 'text-[#dee2f2]' : 'text-[#6b7280]'
                        }`}>
                          {step.label}
                        </span>
                        <span className={`text-[9px] sm:text-[10px] font-semibold mt-0.5 ${
                          isCurrent 
                            ? activeTrackingStep === 3 ? 'text-emerald-400 font-bold' : 'text-[#38bdf8] animate-pulse font-bold' 
                            : isDone ? 'text-emerald-400' : 'text-[#6b7280]'
                        }`}>
                          {isCurrent && activeTrackingStep === 3 ? 'Delivered!' : isDone ? 'Done' : isCurrent ? 'Active...' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Section 9: Reviews & Gallery */}
        <section className="py-20 sm:py-24 bg-[#090e19]">
          <div className="px-4 sm:px-10 max-w-[1440px] mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
              <div className="space-y-12">
                <div>
                  <h2 className="text-[28px] sm:text-[32px] leading-[36px] sm:leading-[40px] font-bold text-[#dee2f2]">Field Reports</h2>
                  <p className="text-[18px] leading-[28px] text-[#c2c6d8] mt-2">Feedback from our residential and industrial partners.</p>
                </div>
                <div className="space-y-6">
                  <div className="glass-card p-8 rounded-3xl border-l-4 border-[#0066ff]">
                    <div className="flex gap-1 mb-4 text-[#b3c5ff]">
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    </div>
                    <p className="text-[18px] leading-[28px] italic font-medium text-[#dee2f2]">"The 10kVA industrial setup at our Lagos warehouse has maintained 100% uptime through the worst weather. Professional grade hardware."</p>
                    <div className="mt-6 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-[#303541] flex items-center justify-center font-bold text-[#b3c5ff]">TA</div>
                      <div>
                        <div className="font-bold text-[#dee2f2]">Engr. Tunde Adeyemi</div>
                        <div className="text-[12px] leading-[16px] text-[#b3c5ff] uppercase font-bold">Ikeja, Lagos</div>
                      </div>
                    </div>
                  </div>

                  <div className="glass-card p-8 rounded-3xl">
                    <div className="flex gap-1 mb-4 text-[#b3c5ff]">
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    </div>
                    <p className="text-[18px] leading-[28px] italic font-medium text-[#dee2f2]">"SkyIT's security integration with our solar system changed our peace of mind. Excellent customer support during installation in Abuja."</p>
                    <div className="mt-6 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-[#303541] flex items-center justify-center font-bold text-[#b3c5ff]">GO</div>
                      <div>
                        <div className="font-bold text-[#dee2f2]">Dr. Grace Obi</div>
                        <div className="text-[12px] leading-[16px] text-[#b3c5ff] uppercase font-bold">Maitama, Abuja</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Gallery Grid */}
              <div className="grid grid-cols-2 gap-4 h-full">
                <div className="space-y-4">
                  <div className="h-80 rounded-3xl overflow-hidden border border-white/5">
                    <img 
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" 
                      alt="Top Left Gallery Installation" 
                      src="https://firebasestorage.googleapis.com/v0/b/gen-lang-client-0122140096.firebasestorage.app/o/web%20images%2FUntitled%20design%20(7).jpg?alt=media&token=a8fee283-e4c0-4a47-8ca0-b7b1f16c5149"
                    />
                  </div>
                  <div className="h-48 rounded-3xl overflow-hidden border border-white/5">
                    <img 
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" 
                      alt="Bottom Left Gallery Installation" 
                      src="https://firebasestorage.googleapis.com/v0/b/gen-lang-client-0122140096.firebasestorage.app/o/web%20images%2FUntitled%20design%20(8).jpg?alt=media&token=f66b3c30-69be-4a39-b158-46dc4b28a027"
                    />
                  </div>
                </div>
                <div className="pt-12 space-y-4">
                  <div className="h-48 rounded-3xl overflow-hidden border border-white/5">
                    <img 
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" 
                      alt="Top Right Gallery Installation" 
                      src="https://firebasestorage.googleapis.com/v0/b/gen-lang-client-0122140096.firebasestorage.app/o/web%20images%2FUntitled%20design%20(10).jpg?alt=media&token=732e26cb-53d6-4c63-a760-e7ceda6c26d1"
                    />
                  </div>
                  <div className="h-80 rounded-3xl overflow-hidden border border-white/5">
                    <img 
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" 
                      alt="Bottom Right Gallery Installation" 
                      src="https://firebasestorage.googleapis.com/v0/b/gen-lang-client-0122140096.firebasestorage.app/o/web%20images%2FUntitled%20design%20(11).jpg?alt=media&token=fae8296d-61d3-4824-a85c-ccba179d997b"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 10: About SkyIT Ventures */}
        <section className="py-20 sm:py-24 px-4 sm:px-10 max-w-[1440px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="relative">
              <div className="absolute -top-10 -left-10 w-40 h-40 bg-[#0066ff]/20 rounded-full blur-3xl"></div>
              <div className="relative z-10 glass-card p-2 rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl">
                <img 
                  className="w-full h-auto rounded-[2.5rem] object-cover" 
                  alt="SkyIT Ventures About Feature" 
                  src="https://firebasestorage.googleapis.com/v0/b/gen-lang-client-0122140096.firebasestorage.app/o/web%20images%2FUntitled%20design%20(13).jpg?alt=media&token=fad1ce6c-6b86-4d42-b969-e87b968247ed"
                />
              </div>
            </div>
            <div className="space-y-8">
              <div>
                <h2 className="text-[28px] sm:text-[32px] leading-[36px] sm:leading-[40px] font-bold text-[#dee2f2]">
                  Precision Energy. <br/>Industrial Integrity.
                </h2>
                <div className="h-1 w-20 bg-[#0066ff] mt-6 rounded-full"></div>
              </div>
              <p className="text-[18px] leading-[28px] text-[#c2c6d8]">
                SkyIT Ventures was founded on a single principle: industrial reliability is not optional. In an era of inconsistent power, we bridge the gap between physical hardware and intelligent software to ensure your life and business never pause.
              </p>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <div className="text-3xl font-extrabold text-[#dee2f2]">20+ Years</div>
                  <div className="text-[12px] leading-[16px] text-[#b3c5ff] uppercase font-bold mt-1">Engineering Excellence</div>
                </div>
                <div>
                  <div className="text-3xl font-extrabold text-[#dee2f2]">100%</div>
                  <div className="text-[12px] leading-[16px] text-[#b3c5ff] uppercase font-bold mt-1">Genuine Hardware</div>
                </div>
              </div>
              <button 
                onClick={() => onNavigate('about')}
                className="border-2 border-[#0066ff] text-[#b3c5ff] px-8 py-4 rounded-xl font-bold text-[14px] leading-[20px] hover:bg-[#0066ff] hover:text-[#f8f7ff] transition-all cursor-pointer"
              >
                Meet Our Founders
              </button>
            </div>
          </div>
        </section>

        {/* Section 11: Educational Blog / Knowledge Base */}
        <section className="py-20 sm:py-24 px-4 sm:px-10 bg-[#171b27]/30">
          <div className="max-w-[1440px] mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-12 sm:mb-16 gap-6">
              <div>
                <span className="text-[11px] text-[#0066ff] uppercase font-bold tracking-widest block mb-1">SkyIT Insights</span>
                <h2 className="text-[28px] sm:text-[32px] leading-[36px] sm:leading-[40px] font-bold text-[#dee2f2]">Knowledge Base</h2>
                <p className="text-[16px] sm:text-[18px] leading-[24px] sm:leading-[28px] text-[#c2c6d8] mt-2">Expert guides on maximizing your energy &amp; security infrastructure.</p>
              </div>
              <button 
                type="button"
                onClick={() => onNavigate('blog')}
                className="text-[#b3c5ff] hover:text-white font-bold text-[14px] leading-[20px] flex items-center gap-2 cursor-pointer hover:underline transition-colors shrink-0"
              >
                Explore All Guides <span className="material-symbols-outlined text-base">arrow_forward</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              {homeBlogPosts.length === 0 ? (
                <div className="col-span-full bg-[#131926] border border-white/5 rounded-3xl p-8 text-center space-y-3">
                  <p className="text-slate-400 text-sm font-medium">No published insights or articles available at the moment. Check back soon or visit our blog!</p>
                  <button
                    type="button"
                    onClick={() => onNavigate('blog')}
                    className="bg-[#0066ff] hover:bg-[#0052cc] text-white font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer"
                  >
                    Open Knowledge Hub
                  </button>
                </div>
              ) : (
                homeBlogPosts.map((post) => (
                <div 
                  key={post.id}
                  onClick={() => {
                    if (onSelectBlogPost) {
                      onSelectBlogPost(post);
                    } else {
                      onNavigate('blog');
                    }
                  }}
                  className="group cursor-pointer flex flex-col justify-between bg-[#131926] border border-white/5 rounded-3xl p-5 hover:border-[#0066ff]/40 transition-all duration-300 hover:-translate-y-1 shadow-lg"
                >
                  <div className="space-y-4">
                    <div className="h-56 sm:h-60 rounded-2xl overflow-hidden border border-white/5 bg-[#1b2438] relative">
                      <img 
                        className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500" 
                        alt={post.title} 
                        src={post.coverImage || 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&w=1200&q=80'}
                        referrerPolicy="no-referrer"
                      />
                      <span className="absolute top-3 left-3 bg-[#0b0e17]/85 backdrop-blur-md text-[#0066ff] text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-lg border border-[#0066ff]/30 shadow-md">
                        {post.category}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                        <span>{new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        {post.readTimeMinutes && (
                          <span className="flex items-center gap-1 text-[#b3c5ff]">
                            <span className="material-symbols-outlined text-xs">schedule</span>
                            {post.readTimeMinutes} min read
                          </span>
                        )}
                      </div>

                      <h3 className="text-[18px] sm:text-[20px] leading-[26px] sm:leading-[28px] font-bold text-[#dee2f2] group-hover:text-[#b3c5ff] transition-colors line-clamp-2">
                        {post.title}
                      </h3>

                      <p className="text-[13px] sm:text-[14px] leading-[20px] sm:leading-[22px] text-[#c2c6d8] line-clamp-3">
                        {post.excerpt}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <img 
                        src={post.authorName === 'Daniel Eweh' || !post.authorAvatar || post.authorAvatar.includes('unsplash') ? "https://firebasestorage.googleapis.com/v0/b/gen-lang-client-0122140096.firebasestorage.app/o/web%20images%2FIMG-20260723-WA0001.jpg?alt=media&token=30e9afa5-8d9c-4334-b742-386e47910f2f" : post.authorAvatar} 
                        alt={post.authorName} 
                        className="w-6 h-6 rounded-full object-cover border border-white/20 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <span className="font-semibold text-slate-300 text-[11px] truncate">{post.authorName || 'SkyIT Team'}</span>
                    </div>
                    <span className="text-[#0066ff] font-bold text-[12px] flex items-center gap-1 group-hover:translate-x-1 transition-transform shrink-0">
                      Read Article <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </span>
                  </div>
                </div>
              )))}
            </div>
          </div>
        </section>
      </main>

      {/* Energy Audit Downloaded Confirmation Modal */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#171b27] border border-[#0066ff]/40 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl relative text-left">
            <button 
              type="button"
              onClick={() => setShowAuditModal(false)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>

            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <span className="material-symbols-outlined text-3xl">picture_as_pdf</span>
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold uppercase tracking-wider mb-1">
                  <span className="material-symbols-outlined text-xs">check_circle</span>
                  PDF Downloaded ({downloadedRefCode})
                </div>
                <h3 className="text-xl font-black text-white font-display">SkyIT Audit Report Saved</h3>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0e131e] border border-white/10 space-y-3">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-[#0066ff] text-xl shrink-0 mt-0.5">engineering</span>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">Present Report to a SkyIT Engineer</h4>
                  <p className="text-xs text-[#c2c6d8] leading-relaxed">
                    Your official PDF report includes brand-certified load specs (<strong className="text-white">{totalSustainedWattage.toLocaleString()}W Load</strong>) and sizing for <strong className="text-amber-400">{backupHours} Hours Backup ({recommendedBatteryKwh} kWh)</strong>. Present this report to a SkyIT Ventures Engineer so we can conduct an on-site survey and build a <strong className="text-[#0066ff]">100% custom solar package</strong> tailored to your property.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              <a 
                href={`https://wa.me/2349074444140?text=Hello%20SkyIT%20Engineer,%20I%20just%20generated%20my%20Energy%20Audit%20Report%20(Ref:%20${downloadedRefCode})%20for%20a%20${totalSustainedWattage}W%20simultaneous%20load%20with%20${backupHours}h%20target%20backup%20time%20(${recommendedBatteryKwh}%20kWh%20battery).%20I%20would%20like%20a%20customized%20package%20quote.`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg active:scale-95"
              >
                <span className="material-symbols-outlined text-lg">chat</span>
                <span>Contact SkyIT Engineer on WhatsApp</span>
              </a>

              <div className="grid grid-cols-2 gap-2">
                <button 
                  type="button"
                  onClick={() => {
                    setShowAuditModal(false);
                    if (onConsultPackage) {
                      onConsultPackage(bestMatchedPackage);
                    } else {
                      onNavigate('ai');
                    }
                  }}
                  className="py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <span className="material-symbols-outlined text-sm">auto_awesome</span>
                  <span>AI Energy Assistant</span>
                </button>

                <button 
                  type="button"
                  onClick={() => setShowAuditModal(false)}
                  className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-white/10"
                >
                  <span>Close Notice</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
