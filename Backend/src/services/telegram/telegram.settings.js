import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SETTINGS_PATH = path.resolve(__dirname, '../../../data/telegram-settings.json');

/** Catalog matching Settings → Notifications UI */
export const TELEGRAM_REPORT_CATALOG = [
  {
    id: 'license.daily',
    name: 'License alert',
    schedule: 'Daily · 09:00',
    cron: '0 9 * * *',
    description:
      'Expired and expiring licenses (7 / 14 / 30 days) with owner, brand, and supervisor.',
    includesLicense: true,
    defaultEnabled: true,
  },
  {
    id: 'vacancy.daily',
    name: 'Vacancy alert',
    schedule: 'Daily · 09:00',
    cron: '0 9 * * *',
    description: 'Depots marked vacancy or with no assigned supervisor.',
    defaultEnabled: false,
  },
  {
    id: 'kpi.missing.daily',
    name: 'Missing KPI entry',
    schedule: 'Daily · 09:00',
    cron: '0 9 * * *',
    description: 'Depots/brands with no monthly KPI row for the current month.',
    defaultEnabled: false,
  },
  {
    id: 'kpi.weekly.brand',
    name: 'Weekly PO snapshot',
    schedule: 'Weekly · Monday 10:00',
    cron: '0 10 * * 1',
    description: 'Per brand: target vs actual, PO %, available/display averages (MTD).',
    defaultEnabled: false,
  },
  {
    id: 'kpi.weekly.under',
    name: 'Under-performers',
    schedule: 'Weekly · Monday 10:00',
    cron: '0 10 * * 1',
    description: 'Depots under 80% PO % for the current month (MTD).',
    defaultEnabled: false,
  },
  {
    id: 'license.weekly',
    name: 'License week digest',
    schedule: 'Weekly · Monday 10:00',
    cron: '0 10 * * 1',
    description: 'Still expired and newly expiring this week.',
    includesLicense: true,
    defaultEnabled: false,
  },
  {
    id: 'kpi.monthly.brand',
    name: 'Monthly brand report',
    schedule: 'Monthly · 1st 10:00',
    cron: '0 10 1 * *',
    description:
      'Brand totals, above-target count, under-target list, plus license risk line.',
    includesLicense: true,
    defaultEnabled: true,
  },
  {
    id: 'kpi.monthly.depot',
    name: 'Depot scorecard',
    schedule: 'Monthly · 1st 10:00',
    cron: '0 10 1 * *',
    description:
      'Depot × brand scorecard: PO %, available %, display %, under-target list.',
    includesLicense: true,
    defaultEnabled: true,
  },
  {
    id: 'kpi.yearly.brand',
    name: 'Year rollup',
    schedule: 'Yearly · 1 Jan 10:00',
    cron: '0 10 1 1 *',
    description: 'Per brand and top/bottom depots for the year.',
    defaultEnabled: false,
  },
];

function defaultEnabledMap() {
  return Object.fromEntries(
    TELEGRAM_REPORT_CATALOG.map((r) => [r.id, !!r.defaultEnabled]),
  );
}

function ensureSettingsFile() {
  const dir = path.dirname(SETTINGS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(SETTINGS_PATH)) {
    fs.writeFileSync(
      SETTINGS_PATH,
      JSON.stringify({ enabled: defaultEnabledMap() }, null, 2),
      'utf8',
    );
  }
}

export function getTelegramSettings() {
  ensureSettingsFile();
  try {
    const raw = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
    const enabled = { ...defaultEnabledMap(), ...(raw.enabled || {}) };
    return {
      enabled,
      reports: TELEGRAM_REPORT_CATALOG.map((r) => ({
        ...r,
        enabled: !!enabled[r.id],
      })),
      botConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN),
      chatConfigured: Boolean(process.env.ALLOWED_CHAT_IDS?.trim()),
    };
  } catch {
    return {
      enabled: defaultEnabledMap(),
      reports: TELEGRAM_REPORT_CATALOG.map((r) => ({
        ...r,
        enabled: !!r.defaultEnabled,
      })),
      botConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN),
      chatConfigured: Boolean(process.env.ALLOWED_CHAT_IDS?.trim()),
    };
  }
}

export function saveTelegramSettings(partialEnabled = {}) {
  ensureSettingsFile();
  const current = getTelegramSettings();
  const enabled = { ...current.enabled };
  for (const [id, value] of Object.entries(partialEnabled)) {
    if (TELEGRAM_REPORT_CATALOG.some((r) => r.id === id)) {
      enabled[id] = Boolean(value);
    }
  }
  fs.writeFileSync(
    SETTINGS_PATH,
    JSON.stringify({ enabled, updatedAt: new Date().toISOString() }, null, 2),
    'utf8',
  );
  return getTelegramSettings();
}

export function isReportEnabled(reportId) {
  return !!getTelegramSettings().enabled[reportId];
}

export function getReportDef(reportId) {
  return TELEGRAM_REPORT_CATALOG.find((r) => r.id === reportId) || null;
}
