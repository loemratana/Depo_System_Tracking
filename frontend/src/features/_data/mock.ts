// Centralized mock data so the UI feels populated and consistent across pages.

export type Region = "North" | "South" | "East" | "West" | "Central";
export type DepoStatus = "active" | "attention" | "inactive";

export interface BrandDepo {
  id: string;
  code: string;
  name: string;
  district: string;
  region: Region;
  handler: string;
  visitsThisMonth: number;
  coverage: number;
  status: DepoStatus;
  lastVisit: string;
}

export interface Handler {
  id: string;
  name: string;
  region: Region;
  online: boolean;
  depos: number;
  visitsToday: number;
  productivity: number;
  avatar: string;
}

export interface Visit {
  id: string;
  depo: string;
  handler: string;
  status: "completed" | "active" | "failed" | "scheduled";
  startedAt: string;
  duration: string;
  region: Region;
  gps: boolean;
  notes?: string;
}

export interface ActivityEvent {
  id: string;
  actor: string;
  action: string;
  target: string;
  category: "auth" | "data" | "security" | "system";
  ip: string;
  ts: string;
}

export const REGIONS: Region[] = ["North", "South", "East", "West", "Central"];

export const depos: BrandDepo[] = [
  { id: "d_001", code: "BD-1042", name: "Aurora Distribution Hub", district: "Berlin Mitte", region: "Central", handler: "Lena Hofmann", visitsThisMonth: 28, coverage: 96, status: "active", lastVisit: "2h ago" },
  { id: "d_002", code: "BD-1043", name: "Helix Outpost", district: "Hamburg Nord", region: "North", handler: "Mikael Brandt", visitsThisMonth: 19, coverage: 81, status: "attention", lastVisit: "1d ago" },
  { id: "d_003", code: "BD-1044", name: "Northwind Depot", district: "Bremen", region: "North", handler: "Anya Vogel", visitsThisMonth: 22, coverage: 88, status: "active", lastVisit: "5h ago" },
  { id: "d_004", code: "BD-1045", name: "Stratos Logistics", district: "Munich Süd", region: "South", handler: "Tom Richter", visitsThisMonth: 31, coverage: 94, status: "active", lastVisit: "30m ago" },
  { id: "d_005", code: "BD-1046", name: "Pioneer Warehouse", district: "Stuttgart", region: "South", handler: "Klara Engel", visitsThisMonth: 12, coverage: 64, status: "attention", lastVisit: "3d ago" },
  { id: "d_006", code: "BD-1047", name: "Meridian Field Hub", district: "Cologne West", region: "West", handler: "Jonas Becker", visitsThisMonth: 26, coverage: 90, status: "active", lastVisit: "1h ago" },
  { id: "d_007", code: "BD-1048", name: "Atlas Service Point", district: "Düsseldorf", region: "West", handler: "Sara König", visitsThisMonth: 8, coverage: 52, status: "inactive", lastVisit: "11d ago" },
  { id: "d_008", code: "BD-1049", name: "Cobalt Ops Center", district: "Dresden", region: "East", handler: "Felix Roth", visitsThisMonth: 24, coverage: 87, status: "active", lastVisit: "4h ago" },
  { id: "d_009", code: "BD-1050", name: "Vector Trading Post", district: "Leipzig", region: "East", handler: "Mira Schulz", visitsThisMonth: 17, coverage: 78, status: "active", lastVisit: "7h ago" },
  { id: "d_010", code: "BD-1051", name: "Quantum Depot", district: "Frankfurt", region: "Central", handler: "David Lang", visitsThisMonth: 30, coverage: 92, status: "active", lastVisit: "1h ago" },
  { id: "d_011", code: "BD-1052", name: "Beacon Field Office", district: "Nuremberg", region: "South", handler: "Hannah Krüger", visitsThisMonth: 14, coverage: 71, status: "attention", lastVisit: "2d ago" },
  { id: "d_012", code: "BD-1053", name: "Summit Hub", district: "Hannover", region: "North", handler: "Erik Sommer", visitsThisMonth: 21, coverage: 84, status: "active", lastVisit: "6h ago" },
];

export const handlers: Handler[] = [
  { id: "h_01", name: "Lena Hofmann", region: "Central", online: true, depos: 6, visitsToday: 4, productivity: 94, avatar: "LH" },
  { id: "h_02", name: "Mikael Brandt", region: "North", online: true, depos: 5, visitsToday: 3, productivity: 81, avatar: "MB" },
  { id: "h_03", name: "Anya Vogel", region: "North", online: false, depos: 4, visitsToday: 2, productivity: 88, avatar: "AV" },
  { id: "h_04", name: "Tom Richter", region: "South", online: true, depos: 7, visitsToday: 5, productivity: 96, avatar: "TR" },
  { id: "h_05", name: "Klara Engel", region: "South", online: false, depos: 3, visitsToday: 1, productivity: 64, avatar: "KE" },
  { id: "h_06", name: "Jonas Becker", region: "West", online: true, depos: 5, visitsToday: 4, productivity: 90, avatar: "JB" },
  { id: "h_07", name: "Sara König", region: "West", online: false, depos: 2, visitsToday: 0, productivity: 52, avatar: "SK" },
  { id: "h_08", name: "Felix Roth", region: "East", online: true, depos: 6, visitsToday: 3, productivity: 87, avatar: "FR" },
];

export const visits: Visit[] = [
  { id: "v_201", depo: "Aurora Distribution Hub", handler: "Lena Hofmann", status: "active", startedAt: "10:42", duration: "ongoing", region: "Central", gps: true, notes: "Inventory audit & shelf restock" },
  { id: "v_202", depo: "Quantum Depot", handler: "David Lang", status: "completed", startedAt: "09:15", duration: "48m", region: "Central", gps: true, notes: "Compliance check passed" },
  { id: "v_203", depo: "Stratos Logistics", handler: "Tom Richter", status: "completed", startedAt: "08:30", duration: "1h 12m", region: "South", gps: true },
  { id: "v_204", depo: "Helix Outpost", handler: "Mikael Brandt", status: "failed", startedAt: "08:05", duration: "—", region: "North", gps: false, notes: "Site closed at arrival" },
  { id: "v_205", depo: "Meridian Field Hub", handler: "Jonas Becker", status: "active", startedAt: "11:20", duration: "ongoing", region: "West", gps: true },
  { id: "v_206", depo: "Cobalt Ops Center", handler: "Felix Roth", status: "scheduled", startedAt: "14:00", duration: "—", region: "East", gps: false },
  { id: "v_207", depo: "Northwind Depot", handler: "Anya Vogel", status: "completed", startedAt: "07:50", duration: "55m", region: "North", gps: true },
  { id: "v_208", depo: "Beacon Field Office", handler: "Hannah Krüger", status: "scheduled", startedAt: "15:30", duration: "—", region: "South", gps: false },
];

export const activity: ActivityEvent[] = [
  { id: "a1", actor: "Lena Hofmann", action: "checked in to", target: "Aurora Distribution Hub", category: "data", ip: "10.42.18.4", ts: "11:48" },
  { id: "a2", actor: "system", action: "rotated API key for", target: "depot-sync-service", category: "security", ip: "—", ts: "11:32" },
  { id: "a3", actor: "Tom Richter", action: "submitted visit report for", target: "Stratos Logistics", category: "data", ip: "10.40.2.91", ts: "10:09" },
  { id: "a4", actor: "admin@brand-depot.io", action: "updated access policy", target: "Region: South", category: "auth", ip: "172.16.0.12", ts: "09:42" },
  { id: "a5", actor: "system", action: "completed nightly sync", target: "warehouse pipeline", category: "system", ip: "—", ts: "03:00" },
  { id: "a6", actor: "Mikael Brandt", action: "marked failed visit at", target: "Helix Outpost", category: "data", ip: "10.41.7.22", ts: "08:11" },
];

export const visitTrend = [
  { day: "Mon", visits: 142, completed: 128 },
  { day: "Tue", visits: 168, completed: 151 },
  { day: "Wed", visits: 159, completed: 144 },
  { day: "Thu", visits: 184, completed: 170 },
  { day: "Fri", visits: 201, completed: 188 },
  { day: "Sat", visits: 96, completed: 89 },
  { day: "Sun", visits: 64, completed: 60 },
];

export const regionalCoverage = [
  { region: "North", coverage: 84 },
  { region: "South", coverage: 79 },
  { region: "East", coverage: 81 },
  { region: "West", coverage: 71 },
  { region: "Central", coverage: 93 },
];

export const productCoverage = [
  { week: "W1", core: 72, premium: 54, seasonal: 31 },
  { week: "W2", core: 78, premium: 58, seasonal: 36 },
  { week: "W3", core: 81, premium: 63, seasonal: 42 },
  { week: "W4", core: 85, premium: 68, seasonal: 48 },
  { week: "W5", core: 88, premium: 72, seasonal: 55 },
  { week: "W6", core: 90, premium: 76, seasonal: 61 },
];
