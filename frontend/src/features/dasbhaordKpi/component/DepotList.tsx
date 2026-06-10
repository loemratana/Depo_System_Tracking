import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Layers } from 'lucide-react';
import { exportToExcel, exportToPDF } from '@/utils/exportUtils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function DepotList() {
    const { data: depots = [] } = useQuery({ queryKey: ['depots'], queryFn: fetchDepots });
    const [exporting, setExporting] = useState(false);

    const handleExport = async (type: 'excel' | 'pdf', group: boolean) => {
        if (!depots.length) return;
        setExporting(true);
        try {
            if (type === 'excel') {
                exportToExcel(depots, `depots_${new Date().toISOString().slice(0, 19)}`, group);
            } else {
                exportToPDF(depots, 'Depots Master Report', group);
            }
        } catch (err) {
            console.error('Export failed:', err);
        } finally {
            setExporting(false);
        }
    };

    return (
        <div>
            <div className="flex justify-end mb-4">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-[12px] font-medium text-foreground hover:border-border-strong">
                            <Download className="h-3 w-3" /> Export
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
            </div>

            {/* Your table component – assumes `depots` already includes province/district info */}
            <DepotTable data={depots} />
        </div>
    );
}