import { Brand, AssignedProduct, AssignedDepot, BrandActivityLog } from "../types/brand.types";

export const INITIAL_BRANDS: Brand[] = [
  {
    id: 1,
    name: "Coca-Cola Cambodia",
    code: "BD-BR-01",
    description: "Primary carbonated soft drinks, water, and juice logistics partnership covering all kingdom-wide warehouses.",
    status: "active",
    createdAt: "2026-01-10 09:30",
  },
  {
    id: 2,
    name: "Heineken Beverage Group",
    code: "BD-BR-02",
    description: "Premium brewery logistics and cold-chain depot operations assignment for national distribution nodes.",
    status: "active",
    createdAt: "2026-02-14 11:15",
  },
  {
    id: 3,
    name: "Cambodia Brewery Limited",
    code: "BD-BR-03",
    description: "Local national brewery distribution agreement overseeing localized and regional depot stocks.",
    status: "active",
    createdAt: "2026-02-28 14:00",
  },
  {
    id: 4,
    name: "PepsiCo Indochina",
    code: "BD-BR-04",
    description: "Snack and carbonated beverage distribution pipelines. Temporarily halted during logistics route optimization.",
    status: "inactive",
    createdAt: "2026-03-05 16:45",
  },
  {
    id: 5,
    name: "Smart Axiata Solutions",
    code: "BD-BR-05",
    description: "Telecommunication physical seed cards, assets, and hardware storage. Archived after transition to direct retail outlets.",
    status: "archived",
    createdAt: "2025-11-20 10:00",
  },
  {
    id: 6,
    name: "Cellcard Brand Ops",
    code: "BD-BR-06",
    description: "Asset tracking for physical marketing items, promotional booths, and regional merchant kits.",
    status: "active",
    createdAt: "2026-04-12 08:30",
  },
  {
    id: 7,
    name: "Unilever Supply Chain",
    code: "BD-BR-07",
    description: "Fast-moving consumer goods (FMCG) storage, regional hygiene products, and soap stock tracking.",
    status: "active",
    createdAt: "2026-04-20 15:20",
  },
  {
    id: 8,
    name: "Nestle Indochina",
    code: "BD-BR-08",
    description: "Premium nutrition items, milk formulas, coffee capsules, and cereals distributed to regional hubs.",
    status: "active",
    createdAt: "2026-05-01 13:10",
  },
  {
    id: 9,
    name: "Tiger Beer Operations",
    code: "BD-BR-09",
    description: "Southeastern Asian premium lager allocation, festival point-of-sale gears, and bulk keg distribution.",
    status: "active",
    createdAt: "2026-05-12 09:00",
  },
];

// Mock relationship maps
export const MOCK_PRODUCTS: Record<number, AssignedProduct[]> = {
  1: [
    { id: 101, name: "Coca-Cola Classic 330ml (Sleek)", sku: "COKE-CLA-330", price: 0.65, quantity: 14400, status: "available" },
    { id: 102, name: "Sprite Lemon-Lime 330ml", sku: "SPRI-LEM-330", price: 0.60, quantity: 8200, status: "available" },
    { id: 103, name: "Fanta Orange 330ml", sku: "FANT-ORA-330", price: 0.60, quantity: 5100, status: "available" },
    { id: 104, name: "Dasani Purified Water 500ml", sku: "DASA-WAT-500", price: 0.25, quantity: 22000, status: "available" },
    { id: 105, name: "Coca-Cola Zero Sugar 330ml", sku: "COKE-ZER-330", price: 0.65, quantity: 0, status: "out_of_stock" },
  ],
  2: [
    { id: 201, name: "Heineken Premium Lager Case x24", sku: "HEIN-LAG-CS24", price: 18.50, quantity: 1200, status: "available" },
    { id: 202, name: "Heineken 0.0 Alcohol Free 330ml", sku: "HEIN-ZER-330", price: 0.85, quantity: 450, status: "available" },
    { id: 203, name: "Tiger Lager Beer Case x24", sku: "TIGE-LAG-CS24", price: 15.20, quantity: 0, status: "out_of_stock" },
  ],
  3: [
    { id: 301, name: "Anchor Smooth Beer 330ml", sku: "ANCH-SMO-330", price: 0.50, quantity: 9800, status: "available" },
    { id: 302, name: "Cambodia Premium Beer Can x24", sku: "CAMB-BEER-CS24", price: 12.00, quantity: 3400, status: "available" },
  ],
  4: [
    { id: 401, name: "Pepsi Cola Cola 330ml", sku: "PEPS-COL-330", price: 0.55, quantity: 0, status: "discontinued" },
    { id: 402, name: "Mirinda Orange 330ml", sku: "MIRI-ORA-330", price: 0.55, quantity: 0, status: "discontinued" },
  ],
  6: [
    { id: 601, name: "Cellcard SIM Card Starter Pack", sku: "CELL-SIM-START", price: 1.00, quantity: 2500, status: "available" },
    { id: 602, name: "Cellcard Top-up Card $2.00", sku: "CELL-TOP-02", price: 2.00, quantity: 12000, status: "available" },
  ],
  7: [
    { id: 701, name: "Sunsilk Co-Creations Shampoo 320ml", sku: "UNIL-SUN-320", price: 2.45, quantity: 680, status: "available" },
    { id: 702, name: "Lux Velvet Touch Soap 85g", sku: "UNIL-LUX-85", price: 0.40, quantity: 1800, status: "available" },
    { id: 703, name: "Clear Cool Sport Shampoo 340ml", sku: "UNIL-CLE-340", price: 2.80, quantity: 950, status: "available" },
  ],
  8: [
    { id: 801, name: "Nescafe Red Cup 200g Jar", sku: "NEST-NES-200", price: 3.10, quantity: 1100, status: "available" },
    { id: 802, name: "Milo Active-Go Chocolate Malt 400g", sku: "NEST-MIL-400", price: 2.75, quantity: 1400, status: "available" },
  ],
  9: [
    { id: 901, name: "Tiger Crystal Lager Beer Can 330ml", sku: "TIGE-CRY-330", price: 0.70, quantity: 6500, status: "available" },
    { id: 902, name: "Tiger Lager Draught Keg 30L", sku: "TIGE-KEG-30L", price: 42.00, quantity: 180, status: "available" },
  ],
};

export const MOCK_DEPOTS: Record<number, AssignedDepot[]> = {
  1: [
    { id: 501, name: "Phnom Penh Central Distribution", code: "PP-DEP-01", region: "Central", district: "Daun Penh", status: "active" },
    { id: 502, name: "Siem Reap Airport Road Depot", code: "SR-DEP-02", region: "North", district: "Siem Reap", status: "active" },
    { id: 503, name: "Sihanoukville Port Gateway Hub", code: "SV-DEP-03", region: "South", district: "Preah Sihanouk", status: "active" },
    { id: 504, name: "Battambang Western Outpost", code: "BT-DEP-04", region: "West", district: "Battambang", status: "active" },
  ],
  2: [
    { id: 501, name: "Phnom Penh Central Distribution", code: "PP-DEP-01", region: "Central", district: "Daun Penh", status: "active" },
    { id: 503, name: "Sihanoukville Port Gateway Hub", code: "SV-DEP-03", region: "South", district: "Preah Sihanouk", status: "active" },
  ],
  3: [
    { id: 501, name: "Phnom Penh Central Distribution", code: "PP-DEP-01", region: "Central", district: "Daun Penh", status: "active" },
    { id: 502, name: "Siem Reap Airport Road Depot", code: "SR-DEP-02", region: "North", district: "Siem Reap", status: "active" },
  ],
  4: [
    { id: 505, name: "Kampong Cham Eastern Transit", code: "KC-DEP-05", region: "East", district: "Kampong Cham", status: "inactive" },
  ],
  6: [
    { id: 501, name: "Phnom Penh Central Distribution", code: "PP-DEP-01", region: "Central", district: "Daun Penh", status: "active" },
    { id: 504, name: "Battambang Western Outpost", code: "BT-DEP-04", region: "West", district: "Battambang", status: "active" },
  ],
  7: [
    { id: 501, name: "Phnom Penh Central Distribution", code: "PP-DEP-01", region: "Central", district: "Daun Penh", status: "active" },
    { id: 502, name: "Siem Reap Airport Road Depot", code: "SR-DEP-02", region: "North", district: "Siem Reap", status: "active" },
    { id: 505, name: "Kampong Cham Eastern Transit", code: "KC-DEP-05", region: "East", district: "Kampong Cham", status: "active" },
  ],
  8: [
    { id: 501, name: "Phnom Penh Central Distribution", code: "PP-DEP-01", region: "Central", district: "Daun Penh", status: "active" },
    { id: 502, name: "Siem Reap Airport Road Depot", code: "SR-DEP-02", region: "North", district: "Siem Reap", status: "active" },
  ],
  9: [
    { id: 501, name: "Phnom Penh Central Distribution", code: "PP-DEP-01", region: "Central", district: "Daun Penh", status: "active" },
    { id: 503, name: "Sihanoukville Port Gateway Hub", code: "SV-DEP-03", region: "South", district: "Preah Sihanouk", status: "active" },
  ],
};

export const MOCK_ACTIVITY_LOGS: Record<number, BrandActivityLog[]> = {
  1: [
    { id: "act_101", action: "Assigned Depots Sync", performedBy: "Tom Richter", timestamp: "2026-05-18 10:14", details: "Linked Sihanoukville Port Gateway Hub under bulk allocation contract." },
    { id: "act_102", action: "Activated SKU Catalog", performedBy: "Lena Hofmann", timestamp: "2026-05-15 11:20", details: "Registered 5 premium soft drink products with stock tracking levels." },
    { id: "act_103", action: "Brand Initialized", performedBy: "admin@brand-depot.io", timestamp: "2026-01-10 09:30", details: "Established brand registry under profile code BD-BR-01." },
  ],
  2: [
    { id: "act_201", action: "Safety Stock Configured", performedBy: "Lena Hofmann", timestamp: "2026-05-12 14:05", details: "Configured cold-chain thresholds for Heineken Lager cases." },
    { id: "act_202", action: "Brand Initialized", performedBy: "admin@brand-depot.io", timestamp: "2026-02-14 11:15", details: "Established brand registry under profile code BD-BR-02." },
  ],
  3: [
    { id: "act_301", action: "Brand Initialized", performedBy: "admin@brand-depot.io", timestamp: "2026-02-28 14:00", details: "Established brand registry under profile code BD-BR-03." },
  ],
  4: [
    { id: "act_401", action: "Status Suspended", performedBy: "admin@brand-depot.io", timestamp: "2026-05-10 16:30", details: "Marked brand suspended during active PepsiCo regional supply re-audit." },
  ],
  6: [
    { id: "act_601", action: "SIM Inventory Setup", performedBy: "Tom Richter", timestamp: "2026-04-15 09:00", details: "Linked prepaid products inventory tracker." },
    { id: "act_602", action: "Brand Initialized", performedBy: "admin@brand-depot.io", timestamp: "2026-04-12 08:30", details: "Established brand registry under profile code BD-BR-06." },
  ],
};
