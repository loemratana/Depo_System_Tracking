import React from 'react';
import { useDropzone } from 'react-dropzone';
import { ScanLine } from 'lucide-react';

interface IdCardDropzoneProps {
  onDrop: (files: File[]) => void;
  isDisabled?: boolean;
}

export const IdCardDropzone: React.FC<IdCardDropzoneProps> = ({ onDrop, isDisabled }) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png'] },
    maxFiles: 1,
    disabled: isDisabled,
  });

  return (
    <div
      {...getRootProps()}
      className={`
        relative flex items-center gap-3 px-4 py-3 rounded-md border cursor-pointer
        transition-colors duration-150 select-none
        ${isDragActive
          ? 'border-zinc-400 bg-zinc-100 dark:border-zinc-500 dark:bg-zinc-800'
          : 'border-dashed border-zinc-300 dark:border-zinc-600 hover:border-zinc-400 dark:hover:border-zinc-500 bg-transparent'
        }
        ${isDisabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}
      `}
    >
      <input {...getInputProps()} />
      <ScanLine className="h-4 w-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
      <div>
        <p className="text-[12px] font-medium text-zinc-600 dark:text-zinc-300">
          {isDragActive ? 'Drop image here' : 'Scan ID card — drag or click to upload'}
        </p>
        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">JPEG or PNG, used for OCR auto-fill</p>
      </div>
    </div>
  );
};