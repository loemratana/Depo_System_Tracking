import React from 'react';
import { Loader2, X, ImageIcon } from 'lucide-react';

interface OCRPreviewProps {
  imageUrl: string | null;
  isExtracting: boolean;
  error: string | null;
  onClear: () => void;
}

export const OCRPreview: React.FC<OCRPreviewProps> = ({ imageUrl, isExtracting, error, onClear }) => {
  if (!imageUrl) return null;

  return (
    <div className="flex items-start gap-3 px-3 py-2.5 rounded-md bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
      <div className="shrink-0 w-10 h-10 rounded border border-zinc-200 dark:border-zinc-700 overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
        <img src={imageUrl} alt="ID" className="w-full h-full object-cover" />
      </div>

      <div className="flex-1 min-w-0">
        {isExtracting ? (
          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span className="text-[12px]">Extracting data with OCR...</span>
          </div>
        ) : error ? (
          <p className="text-[12px] text-red-500 dark:text-red-400">{error}</p>
        ) : (
          <p className="text-[12px] text-zinc-500 dark:text-zinc-400">ID card uploaded. Fields auto-filled below.</p>
        )}
        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 truncate">{imageUrl.slice(-40)}</p>
      </div>

      <button
        onClick={onClear}
        className="shrink-0 p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};