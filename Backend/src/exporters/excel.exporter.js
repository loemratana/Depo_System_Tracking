import ExcelJS from 'exceljs';
import { BaseExporter } from './base.exporter.js';
import reportConfig from '../config/report.config.js';

export class ExcelExporter extends BaseExporter {
    async export() {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Depots', {
            properties: { tabColor: { argb: 'FF2C3E50' } },
        });

        // ── Styled header ──
        const headers = ['Code', 'Name', 'Province', 'District', 'Status', 'Expiry Date'];
        const headerRow = worksheet.addRow(headers);
        headerRow.height = reportConfig.excel.headerHeight;
        headerRow.font = reportConfig.excel.headerFont;
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2C3E50' } };
        headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
        headerRow.font.color = { argb: 'FFFFFFFF' };

        // ── Data rows ──
        this.data.depots.forEach((depot) => {
            const row = worksheet.addRow([
                depot.code || '—',
                depot.name,
                depot.provinceName || '—',
                depot.districtName || '—',
                depot.status || '—',
                depot.expiryDate || '—',
            ]);
            row.height = reportConfig.excel.rowHeight;
            row.font = reportConfig.excel.font;
            row.getCell(6).numFmt = reportConfig.excel.dateFormat;
        });

        // ── Totals row ──
        const totalRow = worksheet.addRow([
            'TOTAL',
            '',
            '',
            '',
            '',
            this.data.totalDepots,
        ]);
        totalRow.font = { bold: true };
        totalRow.getCell(6).numFmt = '#,##0';

        // ── Auto-width ──
        worksheet.columns.forEach((col) => {
            let maxLength = 10;
            col.eachCell({ includeEmpty: true }, (cell) => {
                const val = cell.value?.toString() || '';
                if (val.length > maxLength) maxLength = val.length;
            });
            col.width = Math.min(maxLength + 2, 40);
        });

        // ── Freeze header row ──
        worksheet.views = [{ state: 'frozen', ySplit: 1 }];

        // ── AutoFilter ──
        worksheet.autoFilter = {
            from: 'A1',
            to: `F${worksheet.rowCount}`,
        };

        // ── Summary sheet ──
        const summarySheet = workbook.addWorksheet('Summary');
        summarySheet.addRow(['Metric', 'Value']);
        summarySheet.addRow(['Total Depots', this.data.totalDepots]);
        summarySheet.addRow(['Active', this.data.activeDepots]);
        summarySheet.addRow(['Expiring Soon', this.data.expiringSoon]);

        // ── Write buffer ──
        return await workbook.xlsx.writeBuffer();
    }

    getContentType() {
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }

    getFileName() {
        return `depot_report_${Date.now()}.xlsx`;
    }
}