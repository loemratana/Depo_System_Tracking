import { useState } from 'react';
import { ExtractedData } from '../types/ocr.types';
import { ocrApi } from '../services/ocr.api';

export const useOCRExtraction = () => {
    const [isExtracting, setIsExtracting] = useState(false);
    const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
    const [error, setError] = useState<string | null>(null);

    const extractFromFile = async (file: File) => {
        setIsExtracting(true);
        setError(null);
        try {
            const result = await ocrApi.extractFromIdCard(file);
            if (result.success) {
                setExtractedData(result.data);
            } else {
                setError(result.error || 'OCR extraction failed');
            }
        } catch (err) {
            setError('OCR service error');
            console.error(err);
        } finally {
            setIsExtracting(false);
        }
    };

    const resetExtraction = () => {
        setExtractedData(null);
        setError(null);
    };

    return {
        extractFromFile,
        isExtracting,
        extractedData,
        error,
        resetExtraction,
    };
};