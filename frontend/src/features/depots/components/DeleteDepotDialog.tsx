// components/depots/DeleteDepotDialog.tsx
import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useDeleteDepot } from '../hooks/useDeleteDepot';
import { Depot } from '../types/depot.types';

interface DeleteDepotDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    depot: Depot;
}

export const DeleteDepotDialog: React.FC<DeleteDepotDialogProps> = ({
    isOpen,
    onClose,
    onSuccess,
    depot
}) => {
    const { deleteDepot, isDeleting } = useDeleteDepot();

    const handleDelete = async () => {
        const success = await deleteDepot(Number(depot.id));
        if (success) {
            onClose();
            onSuccess();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Dialog */}
            <div className="relative z-10 w-full max-w-sm bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-5">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-500" />
                        </div>
                        <div>
                            <h3 className="text-[14px] font-semibold text-zinc-900 dark:text-zinc-100">Delete Depot</h3>
                            <p className="text-[12px] text-zinc-500 dark:text-zinc-400">This action cannot be undone.</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="ml-auto p-1 rounded-md text-zinc-400 hover:text-zinc-500 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="space-y-3 mb-6">
                        <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                            <p className="text-[12px] text-zinc-500 dark:text-zinc-400 mb-1 font-medium uppercase tracking-wider">Depot to delete</p>
                            <p className="text-[14px] font-semibold text-zinc-900 dark:text-zinc-100">
                                {depot.name || 'Unnamed Depot'}
                            </p>
                            <p className="text-[11px] text-zinc-400 dark:text-zinc-500">{depot.code || 'No Code'}</p>
                        </div>
                        <p className="text-[12px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                            Are you sure you want to delete this depot? All associated records will be permanently removed.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="flex-1 h-9 text-[13px] font-medium rounded-md border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="flex-1 h-9 text-[13px] font-medium rounded-md bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 transition-colors shadow-sm shadow-red-200 dark:shadow-none"
                        >
                            {isDeleting ? 'Deleting...' : 'Delete Depot'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};