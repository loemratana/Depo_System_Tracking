import React from 'react';
import { ExtractedData } from '../../types/ocr.types';
import { Check } from 'lucide-react';

interface ExtractedFieldsProps {
  data: ExtractedData | null;
}

export const ExtractedFields: React.FC<ExtractedFieldsProps> = ({ data }) => {
  if (!data) return null;

  const fields = [
    { label: 'Khmer Name', value: data.khmerName },
    { label: 'English Name', value: data.englishName },
    { label: 'Code/ID', value: data.employeeCode },
    { label: 'Date of Birth', value: data.dateOfBirth },
    { label: 'Sex', value: data.sex },
    { label: 'Nationality', value: data.nationality },
    { label: 'Address', value: data.address },
  ].filter(f => f.value && f.value !== 'Not Found');

  if (fields.length === 0) return null;

  return (
    <div className="flex items-start gap-2 px-3 py-2.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
      <Check className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500 mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">
          OCR Pre-fill
        </p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
          {fields.map(f => (
            <div key={f.label} className="flex items-baseline gap-1.5">
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500 shrink-0">{f.label}</span>
              <span className="text-[12px] text-zinc-700 dark:text-zinc-300 font-medium truncate">{f.value}</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1.5">Fields pre-filled — review before saving.</p>
      </div>
    </div>
  );
};