import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { IdCardDropzone } from '../upload/IdCardDropzone';
import { OCRPreview } from '../upload/OCRPreview';
import { ExtractedFields } from '../upload/ExtractedFields';
import { EmployeeForm } from '../EmployeeForm';
import { useUploadIdCard } from '../../hooks/useUploadIdCard';
import { useOCRExtraction } from '../../hooks/useOCRExtraction';
import { useCreateEmployee } from '../../hooks/useCreateEmployee';
import { CreateEmployeeInput } from '../../types/employee.types';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface CreateEmployeeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateEmployeeDialog: React.FC<CreateEmployeeDialogProps> = ({ isOpen, onClose, onSuccess }) => {
  const { file, previewUrl, onDrop, clearUpload } = useUploadIdCard();
  const { extractFromFile, isExtracting, extractedData, error: ocrError, resetExtraction } = useOCRExtraction();
  const { createEmployee, isCreating, error } = useCreateEmployee();

  useEffect(() => {
    if (file) extractFromFile(file);
  }, [file]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const handleClose = () => {
    clearUpload();
    resetExtraction();
    onClose();
  };

  const handleFormSubmit = async (data: CreateEmployeeInput) => {
    const result = await createEmployee(data);
    if (result) {
      toast.success("Employee created successfully");
      handleClose();
      onSuccess();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-[2px]"
            onClick={handleClose}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', duration: 0.3, bounce: 0.15 }}
            className="relative z-10 flex flex-col w-full max-w-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden max-h-[85vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 h-14 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
              <div>
                <h2 className="text-[14px] font-semibold text-zinc-800 dark:text-zinc-100">Add Employee</h2>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500">Fill in details or scan an ID card to auto-fill</p>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {error && (
                <div className="flex items-start gap-2 rounded-[6px] border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-[12px] text-destructive">
                  <X className="mt-px h-3.5 w-3.5 flex-shrink-0" />
                  <span className="flex-1">{error}</span>
                </div>
              )}
              {/* OCR section */}
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  ID Card Scan <span className="font-normal normal-case tracking-normal text-zinc-300 dark:text-zinc-600">— optional</span>
                </p>
                <IdCardDropzone onDrop={onDrop} isDisabled={isExtracting} />
                {previewUrl && (
                  <OCRPreview
                    imageUrl={previewUrl}
                    isExtracting={isExtracting}
                    error={ocrError}
                    onClear={clearUpload}
                  />
                )}
                {extractedData && <ExtractedFields data={extractedData} />}
              </div>

              <div className="border-t border-zinc-100 dark:border-zinc-800" />

              {/* Form */}
              <EmployeeForm
                initialData={extractedData || {}}
                onSubmit={handleFormSubmit}
                onCancel={handleClose}
                submitLabel="Create Employee"
                isSubmitting={isCreating}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};