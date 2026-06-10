import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Format a number with commas
export const formatNumber = (num?: number) => {
  if (num === undefined || num === null) return '—';
  return num.toLocaleString();
};

// Group depots by province
export const groupByProvince = (depots: any[]) => {
  const grouped: Record<string, any[]> = {};
  depots.forEach(depot => {
    const province = depot.city || depot.province || depot.district?.province?.name || 'Unknown';
    if (!grouped[province]) grouped[province] = [];
    grouped[province].push(depot);
  });
  return grouped;
};

// Export to Excel (grouped sheets or single sheet with province column)
export const exportToExcel = (depots: any[], fileName = 'depots_export', group = true) => {
  const workbook = XLSX.utils.book_new();
  
  if (group) {
    const grouped = groupByProvince(depots);
    for (const [province, items] of Object.entries(grouped)) {
      const worksheet = XLSX.utils.json_to_sheet(items);
      XLSX.utils.book_append_sheet(workbook, worksheet, province.slice(0, 31)); // sheet name max 31 chars
    }
  } else {
    const worksheet = XLSX.utils.json_to_sheet(depots);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'All Depots');
  }
  
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

// Export to PDF (grouped with headers)
export const exportToPDF = (depots: any[], title = 'Depots Report', group = true) => {
  const doc = new jsPDF();
  let yOffset = 20;
  const pageHeight = doc.internal.pageSize.height;
  
  // Add title
  doc.setFontSize(18);
  doc.text(title, 14, yOffset);
  yOffset += 10;
  
  // Group data
  const grouped = group ? groupByProvince(depots) : { 'All Depots': depots };
  
  for (const [province, items] of Object.entries(grouped)) {
    // Check if we need a new page
    if (yOffset > pageHeight - 60) {
      doc.addPage();
      yOffset = 20;
    }
    
    // Province header
    doc.setFontSize(14);
    doc.text(province, 14, yOffset);
    yOffset += 6;
    
    // Table for this province
    const tableData = items.map(depot => [
      depot.code || '—',
      depot.name,
      depot.phone || '—',
      depot.status || 'active',
      depot.district?.name || '—',
    ]);
    
    autoTable(doc, {
      startY: yOffset,
      head: [['Code', 'Name', 'Phone', 'Status', 'District']],
      body: tableData,
      margin: { left: 14, right: 14 },
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 9 },
    });
    
    // Update yOffset for next province (get last table Y position)
    const lastTable = (doc as any).lastAutoTable;
    yOffset = lastTable.finalY + 10;
  }
  
  doc.save(`${title.replace(/\s/g, '_')}.pdf`);
};