import React from 'react';

// Simple placeholder – in a real app you would show upload progress
export const UploadProgress: React.FC<{ isUploading?: boolean }> = ({ isUploading }) => {
    if (!isUploading) return null;
    return (
        <div className="mt-2">
            <div className="bg-gray-200 rounded-full h-1.5">
                <div className="bg-blue-600 h-1.5 rounded-full w-3/4 animate-pulse"></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">Uploading...</p>
        </div>
    );
};