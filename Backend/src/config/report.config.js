export default {
    pdf: {
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
        headerTemplate: '<span class="title">Depot Report</span>',
        footerTemplate: '<span class="pageNumber">Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>',
    },
    excel: {
        rowHeight: 20,
        headerHeight: 30,
        font: { name: 'Arial', size: 11 },
        headerFont: { name: 'Arial', size: 12, bold: true },
        currencyFormat: '#,##0.00',
        dateFormat: 'dd/mm/yyyy',
    },
    // queue: {
    //     redis: { host: 'localhost', port: 6379 },
    //     concurrency: 5,
    // },
};