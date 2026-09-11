import ExcelJS from 'exceljs';
import { BaseExporter } from './base.exporter.js';
import reportConfig from '../config/report.config.js';

const STATUS_LABEL = {
    draft: 'Draft',
    submitted: 'Submitted',
    finalized: 'Finalized',
};

const QUALIFICATION_LABEL = {
    excellent: 'Excellent',
    good: 'Good',
    needs_improvement: 'Needs Improvement',
    weak: 'Weak (Need to Review)',
};

export class AssessmentExcelExporter extends BaseExporter {
    async export() {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Evaluations', {
            properties: { tabColor: { argb: 'FF2C3E50' } },
        });

        // ── Styled header ──
        const headers = [
            'ID',
            'Depot',
            'Brand',
            'Province',
            'District',
            'Cycle',
            'Evaluator',
            'Overall Score',
            'Our Wins',
            'Competitor Wins',
            'Score Rank',
            'Status',
            'Evaluation Date',
        ];
        const headerRow = worksheet.addRow(headers);
        headerRow.height = reportConfig.excel.headerHeight;
        headerRow.font = { ...reportConfig.excel.headerFont, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2C3E50' } };
        headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

        // ── Data rows ── (names only — never raw IDs, except the evaluation's own id)
        this.data.assessments.forEach((a) => {
            const row = worksheet.addRow([
                a.id,
                a.depot?.name || '—',
                a.depot?.brand?.name || '—',
                a.depot?.district?.province?.name || '—',
                a.depot?.district?.name || '—',
                a.cycle?.label || '—',
                a.evaluatorName || a.evaluator?.username || '—',
                a.overallScore != null ? Number(a.overallScore) : null,
                a.ourWinsCount,
                a.competitorWinsCount,
                a.qualificationStatus ? QUALIFICATION_LABEL[a.qualificationStatus] : '—',
                STATUS_LABEL[a.status] || a.status,
                a.assessmentDate,
            ]);
            row.height = reportConfig.excel.rowHeight;
            row.font = reportConfig.excel.font;
            row.getCell(13).numFmt = reportConfig.excel.dateFormat;
        });

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
            to: `M${worksheet.rowCount}`,
        };

        // ── Write buffer ──
        return await workbook.xlsx.writeBuffer();
    }

    getContentType() {
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }

    getFileName() {
        return `depot_evaluations_${Date.now()}.xlsx`;
    }
}
