export type BatteryTech = 'tubular' | 'lithium';

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
      loadSummary: ['Fans', 'TV', 'Decoder', 'Lighting Point', 'Sound System'],
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
      loadSummary: ['Fans', 'TV', 'Decoder', 'Lighting Point', 'Sound System', 'Fridge', 'Pumping Machine'],
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
      loadSummary: ['Fans', 'TV', 'Decoder', 'Lighting Point', 'Sound System', 'Fridge', 'Pumping Machine'],
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
      loadSummary: ['Fans', 'TV', 'Decoder', 'Lighting Point', 'Sound System', 'Fridge', 'Pumping Machine'],
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
      loadSummary: ['Fans', 'TV', 'Decoder', 'Lighting Point', 'Sound System', 'Fridge/Freezer', 'Pumping Machine', 'Microwave'],
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
      loadSummary: ['Fans', 'TV', 'Decoder', 'Lighting Point', 'Sound System', 'Fridge/Freezer', 'Pumping Machine'],
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
      loadSummary: ['Fans', 'TV', 'Decoder', 'Lighting Point', 'Sound System', 'Fridge/Freezer', 'Pumping Machine', 'AC / Microwave'],
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
      loadSummary: ['Fans', 'TV', 'Decoder', 'Lighting Point', 'Sound System', 'Fridge', 'Freezer', 'Pumping Machine', 'AC / Microwave'],
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
      loadSummary: ['Fans', 'TV', 'Decoder', 'Lighting Point', 'Sound System', 'Fridge', 'Freezer', 'Pumping Machine', 'AC', 'Microwave'],
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
      loadSummary: ['Fans', 'TV', 'Decoder', 'Lighting Point', 'Sound System', 'Fridge', 'Freezer', 'Pumping Machine', 'AC', 'Microwave'],
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
