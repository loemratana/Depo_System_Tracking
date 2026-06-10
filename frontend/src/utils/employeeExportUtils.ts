// src/utils/employeeExportUtils.ts
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper: format a date nicely
const formatDate = (date?: string | Date) => {
  if (!date) return '—';
  const d = new Date(date);
  return d.toLocaleDateString();
};

// Excel export (single sheet, no grouping)
export const exportEmployeesToExcel = (
  employees: any[],
  fileName = 'employees_export'
) => {
  // Prepare rows
  const data = employees.map(emp => ({
    ID: emp.id,
    'Khmer Name': emp.khmerName || '',
    'English Name': emp.englishName || '',
    'Employee Code': emp.employeeCode || '',
    Phone: emp.phone || '',
    Email: emp.email || '',
    Department: emp.department || '',
    Position: emp.position || '',
    Status: emp.status || '',
    'Hire Date': formatDate(emp.hireDate),
    'Date of Birth': formatDate(emp.dateOfBirth),
    Address: emp.address || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees');
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

// PDF export (single table, optional grouping by department)
export const exportEmployeesToPDF = (
  employees: any[],
  title = 'Employees Report',
  groupByDepartment = false
) => {
  const doc = new jsPDF();
  let yOffset = 20;
  const pageHeight = doc.internal.pageSize.height;

  doc.setFontSize(18);
  doc.text(title, 14, yOffset);
  yOffset += 10;

  if (groupByDepartment && employees.length) {
    // Group by department
    const grouped = employees.reduce((acc, emp) => {
      const dept = emp.department || 'Unknown';
      if (!acc[dept]) acc[dept] = [];
      acc[dept].push(emp);
      return acc;
    }, {} as Record<string, any[]>);

    for (const [dept, emps] of Object.entries(grouped)) {
      if (yOffset > pageHeight - 60) {
        doc.addPage();
        yOffset = 20;
      }
      doc.setFontSize(14);
      doc.text(dept, 14, yOffset);
      yOffset += 6;

      const tableData = emps.map(emp => [
        emp.id,
        emp.englishName || emp.khmerName || '—',
        emp.employeeCode || '—',
        emp.phone || '—',
        emp.email || '—',
        emp.position || '—',
        emp.status || '—',
      ]);
      autoTable(doc, {
        startY: yOffset,
        head: [['ID', 'Name', 'Code', 'Phone', 'Email', 'Position', 'Status']],
        body: tableData,
        margin: { left: 14, right: 14 },
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 9 },
      });
      const last = (doc as any).lastAutoTable;
      yOffset = last.finalY + 10;
    }
  } else {
    // Flat table
    const tableData = employees.map(emp => [
      emp.id,
      emp.englishName || emp.khmerName || '—',
      emp.employeeCode || '—',
      emp.phone || '—',
      emp.email || '—',
      emp.department || '—',
      emp.position || '—',
      emp.status || '—',
    ]);
    autoTable(doc, {
      startY: yOffset,
      head: [['ID', 'Name', 'Code', 'Phone', 'Email', 'Department', 'Position', 'Status']],
      body: tableData,
      margin: { left: 14, right: 14 },
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 9 },
    });
  }

  doc.save(`${title.replace(/\s/g, '_')}.pdf`);
};