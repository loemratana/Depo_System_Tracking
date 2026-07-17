import { PDFExporter } from '../../exporters/pdf.exporter.js';
import { ExcelExporter } from '../../exporters/excel.exporter.js';

export class ReportService {
    constructor(dataBuilder) {
        this.dataBuilder = dataBuilder;
    }

    async exportReport(format, filters) {
        const reportData = await this.dataBuilder.buildReportData(filters);

        let exporter;
        switch (format.toLowerCase()) {
            case 'pdf':
                exporter = new PDFExporter(reportData);
                break;
            case 'xlsx':
            case 'excel':
                exporter = new ExcelExporter(reportData);
                break;
            default:
                throw new Error(`Unsupported format: ${format}`);
        }

        const buffer = await exporter.export();
        return {
            buffer,
            fileName: exporter.getFileName(),
            contentType: exporter.getContentType(),
        };
    }
}