// src/services/telegram/telegram.excel.js
import ExcelJS from 'exceljs';

async function workbookToBuffer(workbook) {
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function styleHeader(row) {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF3B82F6' },
  };
  row.alignment = { horizontal: 'center' };
}

function autoWidth(sheet) {
  sheet.columns.forEach((col) => {
    let max = 12;
    col.eachCell({ includeEmpty: true }, (cell) => {
      const val = cell.value?.toString() || '';
      if (val.length > max) max = val.length;
    });
    col.width = Math.min(max + 2, 40);
  });
}

function addTitle(sheet, title, cols = 5) {
  sheet.addRow([title]);
  sheet.mergeCells(1, 1, 1, cols);
  sheet.getCell('A1').font = { size: 16, bold: true };
}

/** Daily PO snapshot Excel (attention + MTD summary) */
export async function generateDailyExcel(data) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Depot System';
  const sheet = workbook.addWorksheet('Daily PO Snapshot');

  addTitle(sheet, 'Daily PO Snapshot (MTD)', 5);

  const tva = data.targetVsActual || {};
  sheet.addRow(['Period', data.periodLabel || data.period || '']);
  sheet.addRow(['# Target', tva.totalTarget ?? '']);
  sheet.addRow(['# PO', tva.totalActual ?? '']);
  sheet.addRow(['PO %', tva.attainmentPct ?? '']);
  sheet.addRow(['On/Above Target', tva.onOrAboveTarget ?? '']);
  sheet.addRow(['Under Target', tva.underTarget ?? '']);
  sheet.addRow([]);

  styleHeader(sheet.addRow(['Depot', 'Brand', 'Type', 'Severity', 'Detail']));

  (data.attention || []).forEach((item) => {
    sheet.addRow([
      item.depotName || '',
      item.brandName || '',
      item.type || '',
      item.severity || '',
      item.detail || '',
    ]);
  });

  autoWidth(sheet);
  return workbookToBuffer(workbook);
}

/** Weekly employee rankings Excel */
export async function generateWeeklyExcel(data) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Depot System';
  const sheet = workbook.addWorksheet('Weekly Rankings');

  addTitle(sheet, 'Weekly Employee Rankings (MTD)', 8);

  const s = data.summary || {};
  sheet.addRow(['Period', data.periodLabel || '']);
  sheet.addRow(['Avg PO %', s.averageKpi ?? '']);
  sheet.addRow(['Employees Assessed', s.employeesAssessed ?? '']);
  sheet.addRow(['Above Target', s.aboveTarget ?? '']);
  sheet.addRow(['Below 80%', s.belowThreshold ?? '']);
  sheet.addRow(['Top Performer', s.topPerformer ?? '']);
  sheet.addRow([]);

  styleHeader(
    sheet.addRow([
      'Rank',
      'Employee',
      '# Target',
      '# PO',
      'PO %',
      '% Available',
      '% Volume Display',
      'Depots',
    ]),
  );

  (data.rankings || []).forEach((r) => {
    sheet.addRow([
      r.rank,
      r.employeeName,
      r.poTarget,
      r.poCount,
      r.kpiPercent,
      r.productAvailablePct,
      r.volumeDisplayPct,
      (r.depotNames || []).join(', '),
    ]);
  });

  autoWidth(sheet);
  return workbookToBuffer(workbook);
}

/** Monthly depot × brand KPI Excel */
export async function generateMonthlyKPIExcel(data) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Depot System';
  const sheet = workbook.addWorksheet('Monthly Depot KPI');

  addTitle(sheet, 'Monthly Depot KPI', 8);

  const t = data.totals || {};
  sheet.addRow(['Period', data.periodLabel || data.period || '']);
  sheet.addRow(['# Target', t.totalTarget ?? '']);
  sheet.addRow(['# PO', t.totalPo ?? '']);
  sheet.addRow(['PO %', t.avgPoPercent ?? '']);
  sheet.addRow(['Avg % Available', t.avgAvailable ?? '']);
  sheet.addRow(['Avg % Volume Display', t.avgDisplay ?? '']);
  sheet.addRow([]);

  styleHeader(
    sheet.addRow([
      'Depot',
      'Brand',
      '# PO',
      '# Target',
      'PO %',
      '% Available',
      '% Volume Display',
      'Status',
    ]),
  );

  (data.rows || []).forEach((r) => {
    sheet.addRow([
      r.depotName,
      r.brandName,
      r.poActual,
      r.poTarget,
      r.poPercent,
      r.productAvailablePct,
      r.volumeDisplayPct,
      r.status,
    ]);
  });

  autoWidth(sheet);
  return workbookToBuffer(workbook);
}

/** License alert Excel (expired + windows) */
export async function generateLicenseExcel(data) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Depot System';
  const sheet = workbook.addWorksheet('License Alert');

  addTitle(sheet, data.title || 'License Alert', 6);
  sheet.addRow(['Date', data.dateLabel || '']);
  sheet.addRow(['Expired', data.expired?.length ?? 0]);
  sheet.addRow(['≤7 days', data.d7?.length ?? 0]);
  sheet.addRow(['≤14 days', data.d14?.length ?? 0]);
  sheet.addRow(['≤30 days', data.d30?.length ?? 0]);
  sheet.addRow([]);

  styleHeader(
    sheet.addRow(['Bucket', 'Depot', 'Brand', 'Owner', 'Expiry', 'Days']),
  );

  const push = (bucket, rows) => {
    (rows || []).forEach((r) => {
      sheet.addRow([bucket, r.name, r.brand, r.owner, r.expiry, r.days]);
    });
  };
  push('Expired', data.expired);
  push('≤7 days', data.d7);
  push('≤14 days', data.d14);
  push('≤30 days', data.d30);

  autoWidth(sheet);
  return workbookToBuffer(workbook);
}

/** Vacancy / unassigned Excel */
export async function generateVacancyExcel(data) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Depot System';
  const sheet = workbook.addWorksheet('Vacancy Alert');

  addTitle(sheet, 'Vacancy Alert', 4);
  sheet.addRow(['Date', data.dateLabel || '']);
  sheet.addRow(['Total', data.rows?.length ?? 0]);
  sheet.addRow([]);

  styleHeader(sheet.addRow(['Depot', 'Brand', 'Status', 'Reason']));
  (data.rows || []).forEach((r) => {
    sheet.addRow([r.name, r.brand, r.status, r.reason]);
  });

  autoWidth(sheet);
  return workbookToBuffer(workbook);
}

/** Missing KPI Excel */
export async function generateMissingKpiExcel(data) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Depot System';
  const sheet = workbook.addWorksheet('Missing KPI');

  addTitle(sheet, 'Missing KPI Entry', 5);
  sheet.addRow(['Period', data.period || '']);
  sheet.addRow(['Items', data.rows?.length ?? 0]);
  sheet.addRow([]);

  styleHeader(sheet.addRow(['Depot', 'Brand', 'Type', 'Severity', 'Detail']));
  (data.rows || []).forEach((r) => {
    sheet.addRow([
      r.depotName || '',
      r.brandName || '',
      r.type || '',
      r.severity || '',
      r.detail || '',
    ]);
  });

  autoWidth(sheet);
  return workbookToBuffer(workbook);
}

/** Under-performers Excel */
export async function generateUnderPerformersExcel(data) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Depot System';
  const sheet = workbook.addWorksheet('Under Performers');

  addTitle(sheet, 'Under-performers (PO % < 80)', 6);
  sheet.addRow(['Period', data.period || '']);
  sheet.addRow(['Count', data.rows?.length ?? 0]);
  sheet.addRow([]);

  styleHeader(
    sheet.addRow(['Depot', 'Brand', '# PO', '# Target', 'PO %', 'Status']),
  );
  (data.rows || []).forEach((r) => {
    sheet.addRow([
      r.depotName,
      r.brandName,
      r.poActual,
      r.poTarget,
      r.poPercent,
      r.status || 'Needs Improvement',
    ]);
  });

  autoWidth(sheet);
  return workbookToBuffer(workbook);
}

/** Monthly brand summary Excel */
export async function generateMonthlyBrandExcel(data) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Depot System';
  const sheet = workbook.addWorksheet('Monthly Brand');

  addTitle(sheet, 'Monthly Brand Report', 6);
  sheet.addRow(['Period', data.period || '']);
  const tva = data.targetVsActual || {};
  sheet.addRow(['# Target', tva.totalTarget ?? '']);
  sheet.addRow(['# PO', tva.totalActual ?? '']);
  sheet.addRow(['Attainment %', tva.attainmentPct ?? '']);
  sheet.addRow(['On/Above', tva.onOrAboveTarget ?? '']);
  sheet.addRow(['Under', tva.underTarget ?? '']);
  sheet.addRow([]);

  styleHeader(
    sheet.addRow([
      'Brand',
      'Total PO',
      'Avg Available %',
      'Avg Display %',
      'Vacancy',
      'Expired',
    ]),
  );
  (data.brands || []).forEach((b) => {
    sheet.addRow([
      b.brandName,
      b.totalPo,
      b.avgAvailable,
      b.avgVolumeDisplay,
      b.vacancy,
      b.expired,
    ]);
  });

  if (data.under?.length) {
    sheet.addRow([]);
    styleHeader(sheet.addRow(['Under Target Depot', 'Brand', 'Detail']));
    data.under.forEach((a) => {
      sheet.addRow([a.depotName, a.brandName || '', a.detail || '']);
    });
  }

  autoWidth(sheet);
  return workbookToBuffer(workbook);
}

/** Yearly rollup Excel */
export async function generateYearlyExcel(data) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Depot System';
  const sheet = workbook.addWorksheet('Year Rollup');

  addTitle(sheet, `Year Rollup ${data.year || ''}`, 5);
  sheet.addRow(['Rows', data.rows?.length ?? 0]);
  sheet.addRow([]);

  styleHeader(
    sheet.addRow([
      'Depot',
      'Brand',
      'Total PO',
      'Avg Available %',
      'Avg Display %',
    ]),
  );
  (data.rows || []).forEach((r) => {
    sheet.addRow([
      r.depotName,
      r.brandName,
      r.totalPo,
      r.avgAvailable,
      r.avgDisplay,
    ]);
  });

  autoWidth(sheet);
  return workbookToBuffer(workbook);
}
