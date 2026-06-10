import React from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BrandForm } from "./BrandForm";
import { CreateBrandInput } from "../types/brand.types";

interface BrandDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateBrandInput) => void;
  initialData?: Partial<CreateBrandInput>;
  title: string;
  subtitle: string;
  isSubmitting?: boolean;
}

export function BrandDrawer({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  title,
  subtitle,
  isSubmitting = false,
}: BrandDrawerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end select-none">
          {/* Glassmorphic Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/35 dark:bg-black/55 backdrop-blur-[1.5px]"
          />

          {/* Slide-over Drawer Panel */}
          <motion.div
            initial={{ x: "100%", opacity: 0.95 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.95 }}
            transition={{ type: "spring", damping: 26, stiffness: 220 }}
            className="
              relative z-10 w-full max-w-md h-full bg-white dark:bg-zinc-950
              border-l border-zinc-200 dark:border-zinc-800 shadow-2xl
              flex flex-col justify-between overflow-hidden
            "
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 h-14 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
              <div>
                <h2 className="text-[14px] font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">{subtitle}</p>
              </div>
              <button
                onClick={onClose}
                className="
                  p-1.5 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200
                  hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer
                "
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto px-6 py-6 select-text">
              <BrandForm
                initialData={initialData}
                onSubmit={onSubmit}
                onCancel={onClose}
                isSubmitting={isSubmitting}
                submitLabel={initialData ? "Save Changes" : "Register Brand"}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
export default BrandDrawer;
