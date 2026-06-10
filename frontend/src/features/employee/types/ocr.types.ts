export interface ExtractedData {
    khmerName: string;
    englishName: string;
    employeeCode: string;
    dateOfBirth: string;   // ISO format: YYYY-MM-DD
    placeOfBirth: string;
    address: string;
    sex: string;           // 'Male' | 'Female' | ''
    expiryDate: string;    // ISO format: YYYY-MM-DD
    nationality: string;   // e.g. 'KHM'
}

export interface OCRExtractionResult {
    success: boolean;
    data: ExtractedData;
    error?: string;
}