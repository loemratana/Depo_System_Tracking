import React from "react";
import { AlertTriangle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Brand } from "../types/brand.types";

interface DeleteBrandDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  brand: Brand | null;
}

export function DeleteBrandDialog({ isOpen, onClose, onConfirm, brand }: DeleteBrandDialogProps) {
  if (!brand) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto select-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-[2px]"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", duration: 0.28 }}
            className="
              relative z-10 w-full max-w-md bg-white dark:bg-zinc-950
              border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-2xl
              overflow-hidden flex flex-col
            "
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 h-12 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
              <div className="flex items-center gap-2 text-destructive font-semibold">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <h2 className="text-[12.5px] uppercase tracking-wider">Danger Zone Action</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-2 select-text">
              <h3 className="text-[13px] font-bold text-zinc-900 dark:text-zinc-100">
                Permanently delete {brand.name}?
              </h3>
              <p className="text-[11.5px] text-muted-foreground leading-normal">
                This action is permanent and cannot be undone. Removing **{brand.name}** ({brand.code}) will soft-orphan its associated SKU listings and void all depot assignments inside active system audits.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 px-5 py-3.5 bg-zinc-50 dark:bg-zinc-900/40 border-t border-zinc-100 dark:border-zinc-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="text-[11px] h-8 border-border-strong text-foreground hover:bg-muted font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className="
                  text-[11px] h-8 bg-destructive text-destructive-foreground
                  hover:bg-destructive/90 transition-all font-semibold
                "
              >
                Permanently Expunge
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
export default DeleteBrandDialog;
