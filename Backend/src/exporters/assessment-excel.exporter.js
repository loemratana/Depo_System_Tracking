import ExcelJS from 'exceljs';
import { BaseExporter } from './base.exporter.js';
import reportConfig from '../config/report.config.js';

const QUALIFICATION_LABEL = {
    excellent: 'Excellent',
    good: 'Good',
    needs_improvement: 'Needs Improvement',
    weak: 'Weak (Need to Review)',
};

const GROUP_LABEL = {
    brand: 'Brand',
    province: 'Province',
    district: 'District',
};

const HEADERS = [
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
    'Evaluation Date',
];
const COLUMN_COUNT = HEADERS.length;
const DATE_COLUMN = HEADERS.indexOf('Evaluation Date') + 1;
const LAST_COLUMN_LETTER = String.fromCharCode('A'.charCodeAt(0) + COLUMN_COUNT - 1);

export class AssessmentExcelExporter extends BaseExporter {
    async export() {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Evaluations', {
            properties: { tabColor: { argb: 'FF2C3E50' } },
        });

        // ── Styled header ── (no ID or Status — internal/raw fields, not
        // useful in an exported report)
        const headerRow = worksheet.addRow(HEADERS);
        headerRow.height = reportConfig.excel.headerHeight;
        headerRow.font = { ...reportConfig.excel.headerFont, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2C3E50' } };
        headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

        if (this.data.groupBy && this.data.groups) {
            this.writeGrouped(worksheet, this.data.groupBy, this.data.groups);
        } else {
            this.data.assessments.forEach((a) => this.addAssessmentRow(worksheet, a));
        }

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
            to: `${LAST_COLUMN_LETTER}${worksheet.rowCount}`,
        };

        // ── Write buffer ──
        return await workbook.xlsx.writeBuffer();
    }

    // One full-width row per group: label, evaluation count, average score —
    // same summary the on-screen grouped view shows — followed by that
    // group's evaluations (already sorted highest score first).
    writeGrouped(worksheet, groupBy, groups) {
        groups.forEach((group) => {
            const rowNumber = worksheet.rowCount + 1;
            const label = `${GROUP_LABEL[groupBy]}: ${group.label}  —  ${group.count} evaluation${group.count === 1 ? '' : 's'}  —  ${group.averageScore ?? '—'} avg /10`;
            const groupRow = worksheet.addRow([label]);
            worksheet.mergeCells(`A${rowNumber}:${LAST_COLUMN_LETTER}${rowNumber}`);
            groupRow.height = reportConfig.excel.headerHeight;
            groupRow.font = { ...reportConfig.excel.font, bold: true };
            groupRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8ECEF' } };
            groupRow.alignment = { vertical: 'middle' };

            group.assessments.forEach((a) => this.addAssessmentRow(worksheet, a));
        });
    }

    addAssessmentRow(worksheet, a) {
        const row = worksheet.addRow([
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
            a.assessmentDate,
        ]);
        row.height = reportConfig.excel.rowHeight;
        row.font = reportConfig.excel.font;
        row.getCell(DATE_COLUMN).numFmt = reportConfig.excel.dateFormat;
    }

    getContentType() {
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }

    getFileName() {
        return `depot_evaluations_${Date.now()}.xlsx`;
    }
}
