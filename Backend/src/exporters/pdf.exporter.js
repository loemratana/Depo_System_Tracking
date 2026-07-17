import puppeteer from 'puppeteer';
import path from 'path';
import { compileTemplate } from '../helpers/template.helper.js';
import { BaseExporter } from './base.exporter.js';
import reportConfig from '../config/report.config.js';

export class PDFExporter extends BaseExporter {
    async export() {
        // 1. Compile HTML from Handlebars template
        const templatePath = path.resolve('src/templates/depot-report.hbs');
        const html = await compileTemplate(templatePath, this.data);

        // 2. Launch Puppeteer
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        const page = await browser.newPage();

        // 3. Set content and wait for resources
        await page.setContent(html, { waitUntil: 'networkidle0' });

        // 4. Generate PDF
        const pdfBuffer = await page.pdf({
            format: reportConfig.pdf.format,
            printBackground: reportConfig.pdf.printBackground,
            margin: reportConfig.pdf.margin,
            displayHeaderFooter: reportConfig.pdf.displayHeaderFooter,
            headerTemplate: reportConfig.pdf.headerTemplate,
            footerTemplate: reportConfig.pdf.footerTemplate,
        });

        await browser.close();
        return pdfBuffer;
    }

    getContentType() {
        return 'application/pdf';
    }

    getFileName() {
        return `depot_report_${Date.now()}.pdf`;
    }
}