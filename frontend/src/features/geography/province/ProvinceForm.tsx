// src/features/geography/province/ProvinceForm.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { StatusBadge } from '@/components/ui-kit';
import type { Province } from './province.types';

interface ProvinceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingProvince: Province | null;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
}

export const ProvinceForm: React.FC<ProvinceFormProps> = ({
  open,
  onOpenChange,
  editingProvince,
  onSubmit,
  isSubmitting,
}) => {
  const [formData, setFormData] = React.useState({
    name: '',
    code: '',
    status: 'active' as const,
  });

  React.useEffect(() => {
    if (editingProvince) {
      setFormData({
        name: editingProvince.name,
        code: editingProvince.code,
        status: editingProvince.status,
      });
    } else {
      setFormData({ name: '', code: '', status: 'active' });
    }
  }, [editingProvince, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 400 }}
        className="relative w-full max-w-md bg-white shadow-xl h-full overflow-auto"
      >
        <div className="sticky top-0 bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-base font-medium text-zinc-900">
            {editingProvince ? 'Edit province' : 'New province'}
          </h2>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 rounded hover:bg-zinc-100 transition-colors"
          >
            <X className="w-4 h-4 text-zinc-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">Province name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Ontario"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">Province code</label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 text-sm font-mono border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., ON"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">Status</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="active"
                  checked={formData.status === 'active'}
                  onChange={() => setFormData({ ...formData, status: 'active' })}
                  className="w-3.5 h-3.5 text-blue-600"
                />
                <StatusBadge status="active" />
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="inactive"
                  checked={formData.status === 'inactive'}
                  onChange={() => setFormData({ ...formData, status: 'inactive' })}
                  className="w-3.5 h-3.5 text-blue-600"
                />
                <StatusBadge status="inactive" />
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-200">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2 text-sm font-medium text-white bg-zinc-900 rounded-md hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Saving...' : editingProvince ? 'Save changes' : 'Create province'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};