// src/services/telegram/telegram.excel.js
import ExcelJS from 'exceljs';

export async function generateDailyExcel(data) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Depot System';
  const sheet = workbook.addWorksheet('Daily Sales');

  // Title
  sheet.addRow(['Daily Sales Report']);
  sheet.mergeCells('A1:F1');
  sheet.getCell('A1').font = { size: 16, bold: true };
  sheet.getCell('A1').alignment = { horizontal: 'center' };

  // Headers
  const headers = ['Product', 'SKU', 'Employee', 'Depot', 'Quantity Sold', 'Revenue ($)'];
  const headerRow = sheet.addRow(headers);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };
  headerRow.alignment = { horizontal: 'center' };

  // Data
  data.rows.forEach(row => {
    sheet.addRow([
      row.productName,
      row.productSku,
      row.employeeName,
      row.depotName,
      row.quantitySold,
      row.revenue,
    ]);
  });

  // Totals row
  const totalRow = sheet.addRow([
    'TOTAL',
    '',
    '',
    '',
    data.totalQuantity,
    data.totalRevenue,
  ]);
  totalRow.font = { bold: true };
  totalRow.getCell(5).numFmt = '#,##0';
  totalRow.getCell(6).numFmt = '$#,##0.00';

  // Auto widths
  sheet.columns.forEach(col => {
    let max = 10;
    col.eachCell({ includeEmpty: true }, cell => {
      const val = cell.value?.toString() || '';
      if (val.length > max) max = val.length;
    });
    col.width = max + 2;
  });

  return workbook.xlsx.writeBuffer();
}

// Similar for weekly, monthly KPI, low stock – just adjust headers and data structure.
// I’ll include them but they follow the same pattern.
export async function generateWeeklyExcel(data) {
  // Same as daily, just rename sheet
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Weekly Sales');
  // ... identical structure, using data.rows, data.totalQuantity, data.totalRevenue
  return workbook.xlsx.writeBuffer();
}

export async function generateMonthlyKPIExcel(data) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('KPI Summary');
  sheet.addRow(['Monthly KPI Report']);
  // Headers: Employee, Depot, Target, Actual, Achievement %, Status
  const headers = ['Employee', 'Depot', 'Target', 'Actual', 'Achievement %', 'Status'];
  // ... add rows from data.rows, then summary at bottom
  return workbook.xlsx.writeBuffer();
}

export async function generateLowStockExcel(data) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Low Stock');
  sheet.addRow(['Low Stock Alert']);
  const headers = ['Product', 'SKU', 'Depot', 'Current Stock', 'Min Stock', 'Deficit'];
  // ... add rows
  return workbook.xlsx.writeBuffer();
}