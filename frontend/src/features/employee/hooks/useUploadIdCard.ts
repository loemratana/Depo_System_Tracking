import { useState } from 'react';

export const useUploadIdCard = () => {
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const onDrop = (acceptedFiles: File[]) => {
        const uploadedFile = acceptedFiles[0];
        if (uploadedFile) {
            setFile(uploadedFile);
            const url = URL.createObjectURL(uploadedFile);
            setPreviewUrl(url);
        }
    };

    const clearUpload = () => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        setFile(null);
        setPreviewUrl(null);
    };

    return { file, previewUrl, onDrop, clearUpload };
};