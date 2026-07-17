export class BaseExporter {
    constructor(data, options = {}) {
        this.data = data;
        this.options = options;
    }

    async export() {
        throw new Error('export() must be implemented');
    }

    getFileName() {
        return `report_${Date.now()}`;
    }

    getContentType() {
        return 'application/octet-stream';
    }
}