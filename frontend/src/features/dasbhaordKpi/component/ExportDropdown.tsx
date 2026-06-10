import React from 'react';
import { Download, FileSpreadsheet, FileText, Layers, Loader2 } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { exportToExcel, exportToPDF } from '@/utils/exportUtils';

interface ExportDropdownProps {
    data: any[];
    disabled?: boolean;
    fileName?: string;
    reportTitle?: string;
}

export const ExportDropdown: React.FC<ExportDropdownProps> = ({
    data,
    disabled = false,
    fileName = 'depots_export',
    reportTitle = 'Depots Report',
}) => {
    const [exporting, setExporting] = React.useState(false);

    const handleExport = async (type: 'excel' | 'pdf', group: boolean) => {
        if (!data.length) return;
        setExporting(true);
        try {
            if (type === 'excel') {
                exportToExcel(data, `${fileName}_${new Date().toISOString().slice(0, 19)}`, group);
            } else {
                exportToPDF(data, reportTitle, group);
            }
        } catch (err) {
            console.error('Export failed:', err);
        } finally {
            setExporting(false);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-[12px] font-medium text-foreground hover:border-border-strong disabled:opacity-50"
                    disabled={disabled || exporting || !data.length}
                >
                    {exporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                    Export
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => handleExport('excel', false)}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel (All)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('excel', true)}>
                    <Layers className="mr-2 h-4 w-4" /> Excel (Group by Province)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('pdf', false)}>
                    <FileText className="mr-2 h-4 w-4" /> PDF (All)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('pdf', true)}>
                    <Layers className="mr-2 h-4 w-4" /> PDF (Group by Province)
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};