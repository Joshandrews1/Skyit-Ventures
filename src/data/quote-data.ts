export type BatteryTech = 'tubular' | 'lithium';

export interface MaxLoadBreakdown {
  bulbs: string;
  fans: string;
  tvs: string;
  fridges?: string;
  acs: string;
  others?: string;
}

export interface UsageModeDetails {
  mode: 'max' | 'average' | 'day' | 'night';
  title: string;
  badge: string;
  badgeColor: string; // e.g. 'rose' | 'blue' | 'amber' | 'indigo'
  runtime: string;
  loadItems: string[];
  advice: string;
}

export interface UsageModes {
  max: UsageModeDetails;
  average: UsageModeDetails;
  day: UsageModeDetails;
  night: UsageModeDetails;
}

export interface SolarPackage {
  id: string;
  tech: BatteryTech;
  name: string;
  kva: string;
  description: string;
  price: number;
  batteries: number;
  batteryInfo: string;
  loadSummary: string[];
  maxLoadDetails?: MaxLoadBreakdown;
  usageModes?: UsageModes;
  panels: number;
  cableSize: string;
  acSupport: string; // Explicit AC compatibility sizing guidance
}

export const SOLAR_PACKAGES: Record<BatteryTech, SolarPackage[]> = {
  tubular: [
    {
      id: 'tub-1.5',
      tech: 'tubular',
      name: '1.5KVA Hybrid Solar Inverter',
      kva: '1.5KVA',
      description: 'Compact 1.5KVA Hybrid Inverter with 1x 220AH Tubular Battery & 3x 300W Solar Panels.',
      price: 948000,
      batteries: 1,
      batteryInfo: '1x 220AH Tubular Battery',
      loadSummary: ['Up to 10 LED Bulbs', '3 Standing Fans', '1 Smart TV', '1 Decoder', 'Sound System'],
      maxLoadDetails: {
        bulbs: 'Up to 10–12 LED Bulbs (10W each)',
        fans: 'Up to 3 Standing / Ceiling Fans',
        tvs: '1 Smart TV (up to 55") + Decoder',
        fridges: 'No Refrigerator or Deep Freezer',
        acs: 'No Air Conditioners or Water Pumps',
        others: 'Sound System, Laptops, Phone Chargers, Wi-Fi Routers'
      },
      panels: 3,
      cableSize: '4mm² Solar Cable (30m)',
      acSupport: 'No AC Support'
    },
    {
      id: 'tub-3.5-std',
      tech: 'tubular',
      name: '3.5KVA Hybrid Solar Inverter (Standard)',
      kva: '3.5KVA',
      description: '3.5KVA Hybrid Inverter with 2x 220AH Tubular Batteries & 6x 300W Solar Panels.',
      price: 1782000,
      batteries: 2,
      batteryInfo: '2x 220AH Tubular Batteries',
      loadSummary: ['Up to 15 LED Bulbs', '4 Standing Fans', '2 Smart TVs', '1 Refrigerator or Freezer', '1HP Water Pump'],
      maxLoadDetails: {
        bulbs: 'Up to 15–20 LED Bulbs (10W each)',
        fans: 'Up to 4–5 Standing / Ceiling Fans',
        tvs: '2 Smart TVs + Decoders',
        fridges: '1 Inverter Refrigerator OR 1 Deep Freezer',
        acs: 'No Air Conditioners',
        others: '1HP Water Pumping Machine (daytime), Sound System, Laptops'
      },
      panels: 6,
      cableSize: '6mm² Solar Cable (30m)',
      acSupport: 'No AC Support'
    },
    {
      id: 'tub-3.5-ext',
      tech: 'tubular',
      name: '3.5KVA Hybrid Solar Inverter (Extended)',
      kva: '3.5KVA',
      description: '3.5KVA Hybrid Inverter with 4x 220AH Tubular Batteries & 12x 300W Solar Panels.',
      price: 2702000,
      batteries: 4,
      batteryInfo: '4x 220AH Tubular Batteries',
      loadSummary: ['Up to 20 LED Bulbs', '5 Standing Fans', '2 Smart TVs', '1 Refrigerator', '1 Deep Freezer', '1HP Water Pump'],
      maxLoadDetails: {
        bulbs: 'Up to 20–25 LED Bulbs (10W each)',
        fans: 'Up to 5–6 Standing / Ceiling Fans',
        tvs: '2–3 Smart TVs + Decoders',
        fridges: '1 Refrigerator AND 1 Deep Freezer',
        acs: 'No Air Conditioners (Prioritizes long night battery backup)',
        others: '1HP Water Pump, Laptops, Wi-Fi, Security Cameras'
      },
      panels: 12,
      cableSize: '6mm² Solar Cable (30m)',
      acSupport: 'No AC Support'
    },
    {
      id: 'tub-5.0-std',
      tech: 'tubular',
      name: '5.0KVA Hybrid Solar Inverter (Standard)',
      kva: '5.0KVA',
      description: '5.0KVA Hybrid Inverter with 2x 220AH Tubular Batteries & 6x 300W Solar Panels.',
      price: 1932000,
      batteries: 2,
      batteryInfo: '2x 220AH Tubular Batteries',
      loadSummary: ['1 Inverter AC (1.0HP)', 'Up to 15 LED Bulbs', '4 Standing Fans', '2 Smart TVs', '1 Refrigerator', '1HP Water Pump'],
      maxLoadDetails: {
        bulbs: 'Up to 15–20 LED Bulbs',
        fans: 'Up to 4 Standing / Ceiling Fans',
        tvs: '2 Smart TVs + Sound System',
        fridges: '1 Inverter Refrigerator',
        acs: '1 Inverter AC (1.0HP max - daytime solar run)',
        others: '1HP Water Pump, Laptops, Wi-Fi Routers'
      },
      panels: 6,
      cableSize: '6mm² Solar Cable (30m)',
      acSupport: 'Supports 1 small Inverter AC (1HP)'
    },
    {
      id: 'tub-5.0-pre',
      tech: 'tubular',
      name: '5.0KVA Hybrid Solar Inverter (Premium)',
      kva: '5.0KVA',
      description: '5.0KVA Hybrid Inverter with 4x 220AH Tubular Batteries & 12x 300W Solar Panels.',
      price: 2928000,
      batteries: 4,
      batteryInfo: '4x 220AH Tubular Batteries',
      loadSummary: ['1 Inverter AC (1.5HP)', 'Up to 25 LED Bulbs', '6 Standing Fans', '3 Smart TVs', '1 Refrigerator', '1 Deep Freezer', '1 Microwave', '1HP Water Pump'],
      maxLoadDetails: {
        bulbs: 'Up to 25–30 LED Bulbs',
        fans: 'Up to 6 Standing / Ceiling Fans',
        tvs: '3 Smart TVs + Sound System',
        fridges: '1 Refrigerator AND 1 Deep Freezer',
        acs: '1 Inverter AC (1.5HP max)',
        others: '1 Microwave Oven, 1HP Water Pump, Laptops, CCTV System'
      },
      panels: 12,
      cableSize: '10mm² Solar Cable (40m)',
      acSupport: 'Supports 1 Inverter AC'
    }
  ],
  lithium: [
    {
      id: 'li-4.0',
      tech: 'lithium',
      name: '4.0KVA Hybrid Solar Inverter (Lithium)',
      kva: '4.0KVA',
      description: '4.0KVA Hybrid Inverter with 1x 5KWH Lithium Battery & 4x 550W Solar Panels.',
      price: 2700000,
      batteries: 1,
      batteryInfo: '1x 5KWH Lithium Battery',
      loadSummary: ['1 Inverter AC (1.5HP)', 'Up to 15 LED Bulbs', '4 Standing Fans', '2 Smart TVs', '1 Refrigerator', '1 Deep Freezer', '1HP Water Pump'],
      maxLoadDetails: {
        bulbs: 'Up to 15–20 LED Bulbs',
        fans: 'Up to 4 Standing / Ceiling Fans',
        tvs: '2 Smart TVs + Decoders',
        fridges: '1 Refrigerator OR 1 Deep Freezer',
        acs: '1 Inverter AC (1.5HP)',
        others: '1HP Water Pump, Laptops, Wi-Fi, Sound System'
      },
      panels: 4,
      cableSize: '10mm² Solar Cable (30m)',
      acSupport: 'Supports 1 Inverter AC'
    },
    {
      id: 'li-6.0-10',
      tech: 'lithium',
      name: '6.0KVA Hybrid Solar Inverter (10KWH Lithium)',
      kva: '6.0KVA',
      description: '6.0KVA Hybrid Inverter with 1x 10KWH Lithium Battery & 9x 550W Solar Panels.',
      price: 4548000,
      batteries: 1,
      batteryInfo: '1x 10KWH Lithium Battery',
      loadSummary: ['Up to 2 Inverter ACs (1.5HP)', 'Up to 25 LED Bulbs', '6 Standing Fans', '3 Smart TVs', '1 Refrigerator', '1 Deep Freezer', '1 Microwave', '1HP Water Pump'],
      maxLoadDetails: {
        bulbs: 'Up to 25–30 LED Bulbs',
        fans: 'Up to 6 Standing / Ceiling Fans',
        tvs: '3 Smart TVs + Sound System',
        fridges: '1 Refrigerator AND 1 Deep Freezer',
        acs: 'Up to 2 Inverter ACs (1.5HP each)',
        others: '1 Microwave, 1HP Water Pump, Workstations & Laptops'
      },
      panels: 9,
      cableSize: '10mm² Solar Cable (30m)',
      acSupport: 'Supports AC / Microwave'
    },
    {
      id: 'li-6.0-15',
      tech: 'lithium',
      name: '6.0KVA Hybrid Solar Inverter (15KWH Lithium)',
      kva: '6.0KVA',
      description: '6.0KVA Hybrid Inverter with 1x 15KWH Lithium Battery & 12x 550W Solar Panels.',
      price: 5300000,
      batteries: 1,
      batteryInfo: '1x 15KWH Lithium Battery',
      loadSummary: ['Up to 2 Inverter ACs (1.5HP)', 'Up to 30 LED Bulbs', '8 Standing Fans', '3 Smart TVs', '1 Refrigerator', '1 Deep Freezer', '1 Microwave', '1HP Water Pump'],
      maxLoadDetails: {
        bulbs: 'Up to 30–35 LED Bulbs',
        fans: 'Up to 8 Standing / Ceiling Fans',
        tvs: '3–4 Smart TVs + Decoders',
        fridges: '1 Refrigerator AND 1 Deep Freezer',
        acs: 'Up to 2 Inverter ACs (1.5HP each, extended night backup)',
        others: '1 Microwave, 1HP Water Pump, Laptops, Wi-Fi, CCTV'
      },
      panels: 12,
      cableSize: '10mm² Solar Cable (30m)',
      acSupport: 'Supports AC / Microwave'
    },
    {
      id: 'li-10.0-hyb',
      tech: 'lithium',
      name: '10.0KVA Hybrid Solar Inverter (Lithium)',
      kva: '10.0KVA',
      description: '10.0KVA Hybrid Inverter with 1x 15KWH Lithium Battery & 12x 550W Solar Panels.',
      price: 5650000,
      batteries: 1,
      batteryInfo: '1x 15KWH Lithium Battery',
      loadSummary: ['3 to 4 Inverter ACs (1.5HP)', 'Up to 40 LED Bulbs', '10 Standing Fans', '4 Smart TVs', '2 Refrigerators', '2 Deep Freezers', 'Microwave', '1HP Water Pump'],
      maxLoadDetails: {
        bulbs: 'Up to 40–50 LED Bulbs',
        fans: 'Up to 10 Standing / Ceiling Fans',
        tvs: '4 Smart TVs + Decoders',
        fridges: '2 Refrigerators AND 2 Deep Freezers',
        acs: '3 to 4 Inverter ACs (1.5HP each)',
        others: '1 Microwave, 1HP Water Pump, Washing Machine, Workstations'
      },
      panels: 12,
      cableSize: '10mm² Solar Cable (30m)',
      acSupport: 'Supports AC, Microwave & Heavy Load'
    },
    {
      id: 'li-10.0-non',
      tech: 'lithium',
      name: '10.0KVA Non-Hybrid Solar Inverter (Lithium)',
      kva: '10.0KVA',
      description: '10.0KVA Non-Hybrid Inverter with 1x 15KWH Lithium Battery & 12x 550W Solar Panels.',
      price: 6150000,
      batteries: 1,
      batteryInfo: '1x 15KWH Lithium Battery',
      loadSummary: ['3 to 4 Inverter ACs (1.5HP)', 'Up to 40 LED Bulbs', '10 Standing Fans', '4 Smart TVs', '2 Refrigerators', '2 Deep Freezers', 'Microwave', '1HP Water Pump'],
      maxLoadDetails: {
        bulbs: 'Up to 40–50 LED Bulbs',
        fans: 'Up to 10 Standing / Ceiling Fans',
        tvs: '4 Smart TVs + Decoders',
        fridges: '2 Refrigerators AND 2 Deep Freezers',
        acs: '3 to 4 Inverter ACs (1.5HP each)',
        others: '1 Microwave, 1HP Water Pump, Washing Machine, Commercial Equipment'
      },
      panels: 12,
      cableSize: '10mm² Solar Cable (30m)',
      acSupport: 'Supports AC, Microwave & Heavy Load'
    }
  ]
};

// Define appliances with realistic electrical wattages
export interface ApplianceItem {
  id: string;
  name: string;
  type: 'basic' | 'medium' | 'heavy';
  watts: number;
  label: string;
}

export const APPLIANCES: ApplianceItem[] = [
  { id: 'bulbs', name: 'LED Bulbs', type: 'basic', watts: 10, label: '10W / bulb' },
  { id: 'fans', name: 'Ceiling Fans', type: 'basic', watts: 75, label: '75W / fan' },
  { id: 'tv', name: 'Smart TV', type: 'basic', watts: 80, label: '80W / unit' },
  { id: 'laptop', name: 'Laptop Charger', type: 'basic', watts: 65, label: '65W / unit' },
  { id: 'sound', name: 'Sound System', type: 'basic', watts: 100, label: '100W / unit' },
  { id: 'fridge', name: 'Inverter Fridge', type: 'medium', watts: 150, label: '150W / unit' },
  { id: 'freezer', name: 'Deep Freezer', type: 'medium', watts: 250, label: '250W / unit' },
  { id: 'microwave', name: 'Microwave Oven', type: 'medium', watts: 1200, label: '1.2kW / unit' },
  { id: 'pump', name: 'Water Pump (1HP)', type: 'heavy', watts: 750, label: '0.75kW / unit' },
  { id: 'ac1', name: '1.0HP Inverter AC', type: 'heavy', watts: 1000, label: '1.0kW / unit' },
  { id: 'ac15', name: '1.5HP Inverter AC', type: 'heavy', watts: 1500, label: '1.5kW / unit' },
  { id: 'washer', name: 'Washing Machine', type: 'heavy', watts: 500, label: '0.5kW / unit' },
];

/**
 * Calculates the exact total running load in Watts for selected appliances
 */
export const calculateTotalWatts = (selectedAppliances: Record<string, number>): number => {
  let total = 0;
  Object.entries(selectedAppliances).forEach(([id, rawQty]) => {
    const qty = Number(rawQty);
    if (qty > 0) {
      const app = APPLIANCES.find(a => a.id === id);
      if (app) {
        total += app.watts * qty;
      }
    }
  });
  return total;
};

/**
 * 1. Checks if the current selected load contains heavy startup inductive elements
 */
export const hasHeavyLoad = (selectedAppliances: Record<string, number>): boolean => {
  return Object.entries(selectedAppliances).some(([id, qty]) => {
    const item = APPLIANCES.find(a => a.id === id);
    return qty > 0 && item?.type === 'heavy';
  });
};

/**
 * 2. Real-time engineering warnings based on current combinations of goal and batteries
 */
export const getHeavyLoadConflict = (
  selectedAppliances: Record<string, number>,
  goal: string | null,
  tech: 'tubular' | 'lithium'
): string | null => {
  if (!hasHeavyLoad(selectedAppliances)) return null;

  if (goal === 'starter' || goal === 'standard') {
    return "Heavy appliances detected. These items require a high-capacity system with surge protection.";
  }
  if (tech === 'tubular') {
    return "Heavy appliances detected. We recommend switching to 'Lithium-ion' storage for optimal surge capability.";
  }
  return null;
};

/**
 * 3. Logical, load-based package recommendation algorithm
 */
export const getRecommendedPackageByLoad = (
  selectedAppliances: Record<string, number>,
  tech: BatteryTech,
  catalog: SolarPackage[]
): SolarPackage | null => {
  const totalWatts = calculateTotalWatts(selectedAppliances);
  if (totalWatts === 0) return null;

  const parseKva = (pkg: SolarPackage): number => {
    const match = pkg.kva.match(/[\d.]+/);
    return match ? parseFloat(match[0]) : 1.5;
  };

  // Sort candidate packages strictly by capacity (KVA) ascending, then by price ascending
  const techPackages = catalog
    .filter(p => p.tech === tech)
    .sort((a, b) => {
      const kvaA = parseKva(a);
      const kvaB = parseKva(b);
      if (kvaA !== kvaB) return kvaA - kvaB;
      return a.price - b.price;
    });

  if (techPackages.length === 0) return null;

  const numACs = (selectedAppliances['ac1'] || 0) + (selectedAppliances['ac15'] || 0);
  const hasPump = (selectedAppliances['pump'] || 0) > 0;
  const hasFreezerOrMicrowave = (selectedAppliances['freezer'] || 0) > 0 || (selectedAppliances['microwave'] || 0) > 0;

  // Calculate required KVA based on continuous load with 25% safety headroom
  // Inverter Power Rating = KVA * 0.8 PF (e.g. 1.5KVA = 1200W continuous max)
  let requiredKva = (totalWatts * 1.25) / 800;

  // Enforce realistic surge and equipment thresholds:
  if (numACs >= 3 || totalWatts > 5000) {
    requiredKva = Math.max(requiredKva, 10.0);
  } else if (numACs >= 2 || totalWatts > 3200) {
    requiredKva = Math.max(requiredKva, 6.0);
  } else if (numACs >= 1) {
    requiredKva = Math.max(requiredKva, tech === 'tubular' ? 5.0 : 4.0);
  } else if (hasPump || hasFreezerOrMicrowave || totalWatts > 1800) {
    requiredKva = Math.max(requiredKva, 3.5);
  } else if (totalWatts > 800) {
    requiredKva = Math.max(requiredKva, 2.5);
  } else {
    // Light load <= 800W (e.g., 10 bulbs = 100W, 5 bulbs + 5 fans = 425W)
    requiredKva = 1.0;
  }

  // Find the SMALLEST package that meets or exceeds requiredKva
  const suitable = techPackages.find(p => parseKva(p) >= requiredKva);

  if (suitable) {
    return suitable;
  } else {
    // If load exceeds highest package capacity, return the largest available package
    return techPackages[techPackages.length - 1];
  }
};

/**
 * Legacy Fallback
 */
export const calculateHeuristicFallback = (
  selectedAppliances: Record<string, number>,
  goal: string | null,
  tech: 'tubular' | 'lithium',
  catalog: SolarPackage[]
): string => {
  const pkg = getRecommendedPackageByLoad(selectedAppliances, tech, catalog);
  return pkg ? pkg.id : '';
};

/**
 * Converts a SolarPackage object to a standard Product interface for checkout compatibility
 */
export const convertPackageToProduct = (pkg: SolarPackage): any => {
  return {
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
};

/**
 * Returns comprehensive 4-mode usage profiles (Max Load, Average Load, Daytime Solar, Night Battery)
 * for any given SolarPackage.
 */
export const getPackageUsageModes = (pkg: SolarPackage): UsageModes => {
  if (pkg.usageModes) return pkg.usageModes;

  const isLithium = pkg.tech === 'lithium';
  const kvaNum = parseFloat(pkg.kva) || 1.5;

  if (kvaNum <= 2.0) {
    return {
      max: {
        mode: 'max',
        title: 'Maximum Simultaneous Load (Peak)',
        badge: 'Peak Surge Capacity',
        badgeColor: 'rose',
        runtime: '2 – 3 Hours (Battery Only)',
        loadItems: [
          '10–12 LED Bulbs (10W each)',
          '3 Standing or Ceiling Fans',
          '1 Smart TV + Decoder + Sound Bar',
          'Laptops & Wi-Fi Routers',
          'All Phone Chargers'
        ],
        advice: 'Running all items simultaneously on battery only will drain the storage faster. Use max load when solar panels are actively generating power during the day.'
      },
      average: {
        mode: 'average',
        title: 'Recommended Continuous Load',
        badge: 'Recommended Safe Operation',
        badgeColor: 'blue',
        runtime: '6 – 8 Hours Continuous',
        loadItems: [
          '5–8 LED Bulbs',
          '2 Standing Fans',
          '1 Smart TV + Decoder',
          'Wi-Fi Router & Laptop Charger'
        ],
        advice: 'Ideal for continuous household energy consumption without over-discharging the battery.'
      },
      day: {
        mode: 'day',
        title: 'Daytime Solar Direct Mode',
        badge: 'Sunlight Hours (9 AM – 4 PM)',
        badgeColor: 'amber',
        runtime: 'Unlimited during Sunlight',
        loadItems: [
          'All 10 LED Bulbs + 3 Fans',
          '1 Smart TV + Sound System',
          'Laptops, Printers, Wi-Fi',
          'Simultaneous Battery Recharging'
        ],
        advice: 'During peak sunshine, your solar panels run your home appliances directly while replenishing battery storage.'
      },
      night: {
        mode: 'night',
        title: 'Night-Time Battery Preservation Mode',
        badge: 'Overnight Backup (8 PM – 6 AM)',
        badgeColor: 'indigo',
        runtime: '8 – 10 Hours Overnight',
        loadItems: [
          '4 Essential Security LED Bulbs',
          '2 Standing / Ceiling Fans',
          '1 Smart TV (for 3-4 hrs) or Wi-Fi Router',
          'Phone Chargers'
        ],
        advice: 'Turn off non-essential lights to guarantee smooth 100% uninterrupted power until morning sunrise.'
      }
    };
  } else if (kvaNum <= 3.5) {
    const isExtended = pkg.batteries >= 4;
    return {
      max: {
        mode: 'max',
        title: 'Maximum Simultaneous Load (Peak)',
        badge: 'Peak Surge Capacity',
        badgeColor: 'rose',
        runtime: isExtended ? '3 – 4 Hours (Battery Only)' : '2 – 3 Hours (Battery Only)',
        loadItems: [
          '15–20 LED Bulbs',
          '4–5 Standing Fans',
          '2 Smart TVs + Decoders',
          '1 Inverter Refrigerator OR 1 Deep Freezer',
          '1HP Water Pumping Machine'
        ],
        advice: 'Water pumps should ideally be turned on during peak daytime hours when solar PV output is active to conserve night battery power.'
      },
      average: {
        mode: 'average',
        title: 'Recommended Continuous Load',
        badge: 'Recommended Safe Operation',
        badgeColor: 'blue',
        runtime: isExtended ? '9 – 11 Hours Continuous' : '6 – 7 Hours Continuous',
        loadItems: [
          '10–12 LED Bulbs',
          '3 Standing Fans',
          '1 Smart TV + Sound System',
          '1 Inverter Refrigerator',
          'Wi-Fi Router & Laptops'
        ],
        advice: 'Provides steady, flicker-free power for your entire apartment or bungalow without stressing the inverter.'
      },
      day: {
        mode: 'day',
        title: 'Daytime Solar Direct Mode',
        badge: 'Sunlight Hours (9 AM – 4 PM)',
        badgeColor: 'amber',
        runtime: 'Unlimited during Sunlight',
        loadItems: [
          'Full Building Lighting + 5 Fans',
          '2 Smart TVs',
          '1 Inverter Refrigerator AND 1 Deep Freezer',
          '1HP Water Pump (Pumping water during daytime)',
          'Simultaneous Solar Array Battery Charging'
        ],
        advice: 'Your solar panels generate high daytime wattage to power heavy inductive items.'
      },
      night: {
        mode: 'night',
        title: 'Night-Time Battery Preservation Mode',
        badge: 'Overnight Backup (8 PM – 6 AM)',
        badgeColor: 'indigo',
        runtime: isExtended ? '10 – 12 Hours Overnight' : '8 – 9 Hours Overnight',
        loadItems: [
          '6 Security & Indoor LED Bulbs',
          '3 Standing Fans',
          '1 Inverter Refrigerator (Eco setting)',
          '1 Smart TV + Wi-Fi Router'
        ],
        advice: 'Keep refrigerator door closed overnight to minimize compressor start cycles and prolong battery health.'
      }
    };
  } else if (kvaNum <= 5.0 && !isLithium) {
    return {
      max: {
        mode: 'max',
        title: 'Maximum Simultaneous Load (Peak)',
        badge: 'Peak Surge Capacity',
        badgeColor: 'rose',
        runtime: '1.5 – 2.5 Hours (Battery Only)',
        loadItems: [
          '1 Inverter Air Conditioner (1.0HP to 1.5HP)',
          '15–20 LED Bulbs',
          '4 Standing Fans',
          '2 Smart TVs',
          '1 Inverter Refrigerator & 1 Deep Freezer',
          '1HP Water Pumping Machine'
        ],
        advice: 'Air conditioners draw significant power. Run ACs primarily during sunny daytime hours when solar panels carry the load.'
      },
      average: {
        mode: 'average',
        title: 'Recommended Continuous Load',
        badge: 'Recommended Safe Operation',
        badgeColor: 'blue',
        runtime: pkg.batteries >= 4 ? '8 – 10 Hours Continuous' : '5 – 6 Hours Continuous',
        loadItems: [
          '15 LED Bulbs',
          '4 Standing / Ceiling Fans',
          '2 Smart TVs',
          '1 Inverter Refrigerator',
          '1 Deep Freezer',
          'Workstations & Wi-Fi'
        ],
        advice: 'Turning off the AC at night yields extended battery hours for refrigeration, lighting, and fans till dawn.'
      },
      day: {
        mode: 'day',
        title: 'Daytime Solar Direct Mode',
        badge: 'Sunlight Hours (9 AM – 4 PM)',
        badgeColor: 'amber',
        runtime: 'Unlimited during Sunlight',
        loadItems: [
          '1 Inverter Air Conditioner (1.5HP)',
          '1 Inverter Refrigerator & 1 Deep Freezer',
          '1HP Water Pump',
          '2 Smart TVs + All Fans & Lighting',
          'Full Solar PV Battery Charging'
        ],
        advice: 'Solar PV directly powers your 1.5HP inverter AC during daytime peak sun without draining your battery bank.'
      },
      night: {
        mode: 'night',
        title: 'Night-Time Battery Preservation Mode',
        badge: 'Overnight Backup (8 PM – 6 AM)',
        badgeColor: 'indigo',
        runtime: pkg.batteries >= 4 ? '10 – 12 Hours Overnight' : '8 – 9 Hours Overnight',
        loadItems: [
          '8 Security LED Bulbs',
          '3 Standing Fans',
          '1 Inverter Refrigerator + 1 Deep Freezer',
          '1 Smart TV & CCTV Security'
        ],
        advice: 'Run AC for 1-2 hours to cool the room before sleep, then switch to fan mode for 10+ hours battery life.'
      }
    };
  } else if (kvaNum <= 5.0 && isLithium) {
    return {
      max: {
        mode: 'max',
        title: 'Maximum Simultaneous Load (Peak)',
        badge: 'Peak Surge Capacity',
        badgeColor: 'rose',
        runtime: '2.5 – 3.5 Hours (Battery Only)',
        loadItems: [
          '1 Inverter Air Conditioner (1.5HP)',
          '15–20 LED Bulbs',
          '4 Standing Fans',
          '2 Smart TVs',
          '1 Inverter Refrigerator OR 1 Deep Freezer',
          '1HP Water Pumping Machine'
        ],
        advice: 'Lithium battery supports deep discharge without degradation. For maximum night hours, turn AC off at bedtime.'
      },
      average: {
        mode: 'average',
        title: 'Recommended Continuous Load',
        badge: 'Recommended Safe Operation',
        badgeColor: 'blue',
        runtime: '8 – 10 Hours Continuous',
        loadItems: [
          '12–15 LED Bulbs',
          '4 Standing / Ceiling Fans',
          '2 Smart TVs',
          '1 Inverter Refrigerator',
          'Wi-Fi Routers & Laptops'
        ],
        advice: 'Continuous 500W–700W load allows the 5kWh Lithium battery to run comfortably for 8–10 hours.'
      },
      day: {
        mode: 'day',
        title: 'Daytime Solar Direct Mode',
        badge: 'Sunlight Hours (9 AM – 4 PM)',
        badgeColor: 'amber',
        runtime: 'Unlimited during Sunlight',
        loadItems: [
          '1 Inverter Air Conditioner (1.5HP)',
          '1 Inverter Refrigerator',
          '1HP Water Pumping Machine',
          'All Home Lighting & Fans',
          'Fast 1C Lithium Solar Recharging'
        ],
        advice: 'High-power 550W panels recharge the 5kWh Lithium battery to 100% within 3 hours of morning sunshine.'
      },
      night: {
        mode: 'night',
        title: 'Night-Time Battery Preservation Mode',
        badge: 'Overnight Backup (8 PM – 6 AM)',
        badgeColor: 'indigo',
        runtime: '10 – 12 Hours Overnight',
        loadItems: [
          '8 Security & Room LED Bulbs',
          '3 Standing Fans',
          '1 Inverter Refrigerator',
          '1 Smart TV + CCTV Security Cameras'
        ],
        advice: 'Lithium Smart BMS protects battery overnight with zero memory effect and 100% steady voltage output.'
      }
    };
  } else if (kvaNum <= 6.0) {
    const is15kWh = pkg.batteryInfo.includes('15KWH');
    return {
      max: {
        mode: 'max',
        title: 'Maximum Simultaneous Load (Peak)',
        badge: 'Peak Surge Capacity',
        badgeColor: 'rose',
        runtime: is15kWh ? '3.5 – 4.5 Hours' : '2.5 – 3 Hours',
        loadItems: [
          '2 Inverter Air Conditioners (1.5HP each)',
          '25–30 LED Bulbs',
          '6–8 Standing Fans',
          '3 Smart TVs + Sound System',
          '1 Inverter Refrigerator & 1 Deep Freezer',
          '1 Microwave Oven & 1HP Water Pump'
        ],
        advice: 'Heavy surge loads (microwaves & water pumps) run smoothly without dipping system voltage.'
      },
      average: {
        mode: 'average',
        title: 'Recommended Continuous Load',
        badge: 'Recommended Safe Operation',
        badgeColor: 'blue',
        runtime: is15kWh ? '12 – 14 Hours Continuous' : '8 – 10 Hours Continuous',
        loadItems: [
          '1 Inverter Air Conditioner (1.5HP)',
          '15–20 LED Bulbs',
          '4 Standing Fans',
          '2 Smart TVs',
          '1 Refrigerator + 1 Deep Freezer',
          'Laptops & Wi-Fi'
        ],
        advice: 'Running 1 AC alongside full home refrigeration and entertainment provides 10+ hours continuous night power.'
      },
      day: {
        mode: 'day',
        title: 'Daytime Solar Direct Mode',
        badge: 'Sunlight Hours (9 AM – 4 PM)',
        badgeColor: 'amber',
        runtime: 'Unlimited during Sunlight',
        loadItems: [
          '2 Inverter Air Conditioners (1.5HP each)',
          '1 Refrigerator & 1 Deep Freezer',
          '1HP Water Pump & Washing Machine',
          'All Building Lighting & Workstations',
          'Full Solar Array Battery Recharging'
        ],
        advice: 'Up to 12x 550W panels generate over 6,000 Watts of direct solar energy during peak sunshine hours.'
      },
      night: {
        mode: 'night',
        title: 'Night-Time Battery Preservation Mode',
        badge: 'Overnight Backup (8 PM – 6 AM)',
        badgeColor: 'indigo',
        runtime: is15kWh ? '12 – 15 Hours Overnight' : '10 – 12 Hours Overnight',
        loadItems: [
          '1 Inverter AC (Bedroom - overnight)',
          '10 LED Bulbs',
          '3 Standing Fans',
          '1 Refrigerator & 1 Deep Freezer',
          'Smart TV & CCTV Security'
        ],
        advice: 'With 10KWH/15KWH Lithium storage, you can comfortably run 1 bedroom AC all night long.'
      }
    };
  } else {
    return {
      max: {
        mode: 'max',
        title: 'Maximum Simultaneous Load (Peak)',
        badge: 'Peak Surge Capacity',
        badgeColor: 'rose',
        runtime: '3.5 – 5 Hours (Battery Only)',
        loadItems: [
          '3 to 4 Inverter Air Conditioners (1.5HP each)',
          '40–50 LED Bulbs',
          '10 Standing Fans',
          '4 Smart TVs',
          '2 Inverter Refrigerators & 2 Deep Freezers',
          'Microwave Oven, Washing Machine, 1HP Water Pump'
        ],
        advice: 'Ideal for large duplexes, commercial offices, medical centers, or estates requiring heavy power.'
      },
      average: {
        mode: 'average',
        title: 'Recommended Continuous Load',
        badge: 'Recommended Safe Operation',
        badgeColor: 'blue',
        runtime: '10 – 12 Hours Continuous',
        loadItems: [
          '2 Inverter Air Conditioners (1.5HP each)',
          '25–30 LED Bulbs',
          '6 Standing Fans',
          '3 Smart TVs',
          '2 Refrigerators & 1 Deep Freezer',
          'Office Computers, Servers, CCTV'
        ],
        advice: 'Provides commercial-grade uninterrupted clean power without grid reliance or noise.'
      },
      day: {
        mode: 'day',
        title: 'Daytime Solar Direct Mode',
        badge: 'Sunlight Hours (9 AM – 4 PM)',
        badgeColor: 'amber',
        runtime: 'Unlimited during Sunlight',
        loadItems: [
          'All 4 Air Conditioners (1.5HP each)',
          'Full Building Lighting & Fans',
          '2 Refrigerators & 2 Deep Freezers',
          'Commercial Equipment / Workshop Tools / Water Pumps',
          'Direct High-Current Solar Battery Charge'
        ],
        advice: 'Generates up to 6.6kW of daytime solar energy to run heavy commercial loads directly from the sun.'
      },
      night: {
        mode: 'night',
        title: 'Night-Time Battery Preservation Mode',
        badge: 'Overnight Backup (8 PM – 6 AM)',
        badgeColor: 'indigo',
        runtime: '12 – 14 Hours Overnight',
        loadItems: [
          '2 Inverter Air Conditioners (Master Bedrooms)',
          '15 Security & Indoor LED Bulbs',
          '4 Standing Fans',
          '2 Refrigerators & 1 Deep Freezer',
          'CCTV Security & Gate Automation'
        ],
        advice: 'Enjoy quiet 24/7 power all through the night without turning on a diesel generator.'
      }
    };
  }
};


