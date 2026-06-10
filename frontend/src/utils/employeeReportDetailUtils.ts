import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';

interface Employee {
  id: number;
  khmerName?: string | null;
  englishName?: string | null;
  employeeCode?: string | null;
  phone?: string | null;
  email?: string | null;
  department?: string | null;
  position?: string | null;
  status?: string;
  hireDate?: string | null;
  dateOfBirth?: string | null;
  address?: string | null;
  images?: string | null;
}

interface HandledDepot {
  id: number;
  name: string;
  code?: string;
  province?: string | null;
  district?: string | null;
  status?: string;
  expiryDate?: string | null;
  brands?: string[];
}

interface KPI {
  totalDepots: number;
  expiredDepots: number;
}

/**
 * Export employee details and assigned depots to Excel
 */
export const exportEmployeeToExcel = async (
  employee: Employee,
  handledDepots: HandledDepot[],
  kpi?: KPI
) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(`Employee_${employee.id}`);

  // Helper: style a header cell (dark blue background, white bold text)
  const styleMainHeader = (cell: ExcelJS.Cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2C5F8A' }, // dark blue
    };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  };

  // Helper: style field label (light gray, bold)
  const styleFieldLabel = (cell: ExcelJS.Cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF5F5F5' },
    };
    cell.font = { bold: true, size: 11 };
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    };
  };

  // Helper: style depot table header (blue background, white bold)
  const styleDepotHeader = (cell: ExcelJS.Cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A5F' },
    };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    };
  };

  // Set column widths (two columns for employee info)
  worksheet.getColumn(1).width = 25;
  worksheet.getColumn(2).width = 50;

  // ========== SECTION 1: EMPLOYEE INFORMATION ==========
  // Title row (merged)
  const titleRow = worksheet.addRow(['EMPLOYEE INFORMATION']);
  worksheet.mergeCells(`A${titleRow.number}:B${titleRow.number}`);
  styleMainHeader(titleRow.getCell(1));
  titleRow.height = 24;

  worksheet.addRow([]); // spacer

  // Employee details as key-value pairs
  const details = [
    ['Khmer Name', employee.khmerName || '—'],
    ['English Name', employee.englishName || '—'],
    ['Employee Code', employee.employeeCode || '—'],
    ['Phone', employee.phone || '—'],
    ['Email', employee.email || '—'],
    ['Department', employee.department || '—'],
    ['Position', employee.position || '—'],
    ['Status', employee.status || '—'],
    ['Total Depots', kpi?.totalDepots ?? handledDepots.length],
    ['Expired Depots', kpi?.expiredDepots ?? 0],
  ];

  details.forEach(([field, value]) => {
    const row = worksheet.addRow([field, value]);
    styleFieldLabel(row.getCell(1));
    row.getCell(2).border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  worksheet.addRow([]); // spacer

  // ========== SECTION 2: ASSIGNED DEPOTS ==========
  // Title row (merged across all 7 columns)
  const depotTitleRow = worksheet.addRow(['ASSIGNED DEPOTS']);
  worksheet.mergeCells(`A${depotTitleRow.number}:G${depotTitleRow.number}`);
  styleMainHeader(depotTitleRow.getCell(1));
  depotTitleRow.height = 24;

  worksheet.addRow([]); // spacer

  // Depot table headers
  const depotHeaders = ['Name', 'Code', 'Province', 'District', 'Status', 'Expiry Date', 'Brands'];
  const headerRow = worksheet.addRow(depotHeaders);
  headerRow.eachCell((cell, colNumber) => {
    styleDepotHeader(cell);
    // Adjust column widths
    if (colNumber === 1) worksheet.getColumn(1).width = 28;
    else if (colNumber === 2) worksheet.getColumn(2).width = 15;
    else if (colNumber === 3) worksheet.getColumn(3).width = 20;
    else if (colNumber === 4) worksheet.getColumn(4).width = 20;
    else if (colNumber === 5) worksheet.getColumn(5).width = 12;
    else if (colNumber === 6) worksheet.getColumn(6).width = 18;
    else if (colNumber === 7) worksheet.getColumn(7).width = 28;
  });
  headerRow.height = 22;

  // Depot rows
  if (handledDepots.length === 0) {
    const noRow = worksheet.addRow(['No depots assigned.', '', '', '', '', '', '']);
    noRow.getCell(1).font = { italic: true };
  } else {
    handledDepots.forEach((depot, idx) => {
      const row = worksheet.addRow([
        depot.name || '—',
        depot.code || '—',
        depot.province || '—',
        depot.district || '—',
        depot.status || '—',
        depot.expiryDate ? new Date(depot.expiryDate).toLocaleDateString() : '—',
        depot.brands?.join(', ') || '—',
      ]);

      // Alternate row background for readability
      if (idx % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF9F9F9' },
          };
        });
      }

      // Add borders
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });
  }

  // Write file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `employee_${employee.id}_report.xlsx`;
  link.click();
  URL.revokeObjectURL(link.href);
};


/**
 * Export employee details and assigned depots to PDF
 */
export const exportEmployeeToPDF = (
  employee: Employee,
  handledDepots: HandledDepot[],
  kpi?: KPI
) => {
  const doc = new jsPDF();
  let yOffset = 20;
  const pageHeight = doc.internal.pageSize.height;

  // Title
  doc.setFontSize(18);
  doc.text('Employee Report', 14, yOffset);
  yOffset += 10;

  // Employee details as key‑value table
  const empData = [
    ['Khmer Name', employee.khmerName || '—'],
    ['English Name', employee.englishName || '—'],
    ['Employee Code', employee.employeeCode || '—'],
    ['Phone', employee.phone || '—'],
    ['Email', employee.email || '—'],
    ['Department', employee.department || '—'],
    ['Position', employee.position || '—'],
    ['Status', employee.status || '—'],
    ['Total Depots', kpi?.totalDepots ?? handledDepots.length],
    ['Expired Depots', kpi?.expiredDepots ?? 0],
  ];

  autoTable(doc, {
    startY: yOffset,
    head: [['Field', 'Value']],
    body: empData,
    theme: 'striped',
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    margin: { left: 14, right: 14 },
  });
  yOffset = (doc as any).lastAutoTable.finalY + 10;

  if (yOffset > pageHeight - 60) {
    doc.addPage();
    yOffset = 20;
  }

  // Assigned depots table
  if (!handledDepots.length) {
    doc.text('No depots assigned.', 14, yOffset);
  } else {
    doc.setFontSize(14);
    doc.text('Assigned Depots', 14, yOffset);
    yOffset += 8;

    const depotData = handledDepots.map(depot => [
      depot.name || '—',
      depot.code || '—',
      depot.province || '—',
      depot.district || '—',
      depot.status || '—',
      depot.expiryDate ? new Date(depot.expiryDate).toLocaleDateString() : '—',
    ]);
    autoTable(doc, {
      startY: yOffset,
      head: [['Name', 'Code', 'Province', 'District', 'Status', 'Expiry Date']],
      body: depotData,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      margin: { left: 14, right: 14 },
    });
  }

  doc.save(`employee_${employee.id}_report.pdf`);
};