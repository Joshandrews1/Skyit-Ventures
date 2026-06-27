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
      name: '1.5KVA Starter',
      kva: '1.5KVA',
      description: 'Basic power for essential appliances.',
      price: 948000,
      batteries: 1,
      batteryInfo: '220AH Tubular',
      loadSummary: ['Fans', 'TV', 'Decoder', 'Lighting', 'Sound System'],
      panels: 3,
      cableSize: '4mm²',
      acSupport: 'No AC Support'
    },
    {
      id: 'tub-3.5-std',
      tech: 'tubular',
      name: '3.5KVA (Standard)',
      kva: '3.5KVA',
      description: 'Medium power with standard backup.',
      price: 1782000,
      batteries: 2,
      batteryInfo: '220AH Tubular',
      loadSummary: ['Basic Load', 'Fridge', 'Pumping Machine'],
      panels: 6,
      cableSize: '6mm²',
      acSupport: 'No AC Support'
    },
    {
      id: 'tub-3.5-ext',
      tech: 'tubular',
      name: '3.5KVA (Extended)',
      kva: '3.5KVA',
      description: 'Medium power with extended backup time.',
      price: 2702000,
      batteries: 4,
      batteryInfo: '220AH Tubular',
      loadSummary: ['Basic Load', 'Fridge', 'Pumping Machine'],
      panels: 6,
      cableSize: '6mm²',
      acSupport: 'No AC Support'
    },
    {
      id: 'tub-5.0-std',
      tech: 'tubular',
      name: '5.0KVA (Standard)',
      kva: '5.0KVA',
      description: 'High power for larger homes.',
      price: 1932000,
      batteries: 2,
      batteryInfo: '220AH Tubular',
      loadSummary: ['Basic Load', 'Fridge', 'Pumping Machine'],
      panels: 8,
      cableSize: '10mm²',
      acSupport: 'Supports 1 small Inverter AC (1HP)'
    },
    {
      id: 'tub-5.0-pre',
      tech: 'tubular',
      name: '5.0KVA (Premium)',
      kva: '5.0KVA',
      description: 'Industrial grade backup for heavy appliances.',
      price: 2928000,
      batteries: 4,
      batteryInfo: '220AH Tubular',
      loadSummary: ['Basic Load', 'Fridge', 'Freezer', 'Pumping Machine', 'Microwave'],
      panels: 10,
      cableSize: '10mm²',
      acSupport: 'Supports 1 Inverter AC (1.5HP)'
    }
  ],
  lithium: [
    {
      id: 'li-4.0',
      tech: 'lithium',
      name: '4.0KVA Lithium',
      kva: '4.0KVA',
      description: 'Modern efficiency with rapid charging.',
      price: 2700000,
      batteries: 1,
      batteryInfo: '5KWH Lithium-ion',
      loadSummary: ['Basic Load', 'Fridge', 'Freezer', 'Pumping Machine'],
      panels: 6,
      cableSize: '6mm²',
      acSupport: 'Supports 1 Inverter AC (1.5HP)'
    },
    {
      id: 'li-6.0-10',
      tech: 'lithium',
      name: '6.0KVA (10KWH)',
      kva: '6.0KVA',
      description: 'High-capacity storage for heavy loads.',
      price: 4548000,
      batteries: 2,
      batteryInfo: '10KWH Lithium-ion',
      loadSummary: ['Basic Load', 'Fridge', 'Freezer', 'Pumping Machine', 'AC', 'Microwave'],
      panels: 10,
      cableSize: '10mm²',
      acSupport: 'Supports up to 2 Inverter ACs'
    },
    {
      id: 'li-6.0-15',
      tech: 'lithium',
      name: '6.0KVA (15KWH)',
      kva: '6.0KVA',
      description: 'Maximum backup duration for critical infrastructure.',
      price: 5300000,
      batteries: 3,
      batteryInfo: '15KWH Lithium-ion',
      loadSummary: ['Basic Load', 'Fridge', 'Freezer', 'Pumping Machine', 'AC', 'Microwave'],
      panels: 10,
      cableSize: '10mm²',
      acSupport: 'Supports up to 2 Inverter ACs (Extended Runtime)'
    },
    {
      id: 'li-10.0-hyb',
      tech: 'lithium',
      name: '10.0KVA Hybrid',
      kva: '10.0KVA',
      description: 'Enterprise grade hybrid deployment.',
      price: 5650000,
      batteries: 2,
      batteryInfo: '10KWH Lithium-ion',
      loadSummary: ['Multiple ACs', 'Microwave', 'Complete Smart Home'],
      panels: 12,
      cableSize: '10mm²',
      acSupport: 'Supports 3-4 Inverter ACs'
    },
    {
      id: 'li-10.0-non',
      tech: 'lithium',
      name: '10.0KVA Pro',
      kva: '10.0KVA',
      description: 'Specialized high-capacity industrial installation.',
      price: 6150000,
      batteries: 3,
      batteryInfo: '15KWH Lithium-ion',
      loadSummary: ['Industrial Load', 'Multiple Freezers', 'Server Infrastructure'],
      panels: 12,
      cableSize: '10mm²',
      acSupport: 'Supports 4+ Inverter ACs'
    }
  ]
};

// Define appliances with electrical classifications
export const APPLIANCES = [
  { id: 'bulbs', name: 'LED Bulbs', type: 'basic' },
  { id: 'fans', name: 'Fans', type: 'basic' },
  { id: 'tv', name: 'Smart TV', type: 'basic' },
  { id: 'laptop', name: 'Laptop', type: 'basic' },
  { id: 'fridge', name: 'Inverter Fridge', type: 'medium' },
  { id: 'freezer', name: 'Deep Freezer', type: 'medium' },
  { id: 'microwave', name: 'Microwave', type: 'medium' },
  { id: 'pump', name: 'Water Pump', type: 'heavy' },
  { id: 'ac1', name: '1.0HP Inverter AC', type: 'heavy' },
  { id: 'ac15', name: '1.5HP Inverter AC', type: 'heavy' },
  { id: 'washer', name: 'Washing Machine', type: 'heavy' },
  { id: 'sound', name: 'Sound System', type: 'basic' },
];

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
    return "Heavy appliances detected. These items require a high-capacity system, which will increase the total cost significantly.";
  }
  if (tech === 'tubular') {
    return "Heavy appliances detected. We recommend switching to 'Premium Lithium' batteries for better performance with ACs and Pumps.";
  }
  return null;
};

/**
 * 3. Heuristic sizing algorithm fallback
 */
export const calculateHeuristicFallback = (
  selectedAppliances: Record<string, number>,
  goal: string | null,
  tech: 'tubular' | 'lithium',
  catalog: SolarPackage[]
): string => {
  let recommendedId = "";
  const filteredCatalog = catalog.filter(p => p.tech === tech);
  const isHeavy = hasHeavyLoad(selectedAppliances);

  if (isHeavy) {
    // Heavy loads route to 5KVA minimum, otherwise fall back to the highest available spec
    recommendedId = catalog.find(p => p.tech === tech && parseInt(p.kva) >= 5)?.id 
      || filteredCatalog[filteredCatalog.length - 1]?.id;
  } else if (goal === 'starter') {
    // Smallest package
    recommendedId = filteredCatalog[0]?.id;
  } else {
    // Median capacity package
    recommendedId = filteredCatalog[Math.floor(filteredCatalog.length / 2)]?.id;
  }

  return recommendedId;
};
