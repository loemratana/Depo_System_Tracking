// DateRangePicker.tsx
"use client";

import { forwardRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Filter } from "lucide-react";
import MonthAndYearCalendar from "./MonthAndYearCalendar";

// ✅ Forward ref to the button so PopoverTrigger can use it
const FilterChip = forwardRef<HTMLButtonElement, { children: React.ReactNode }>(
    ({ children }, ref) => (
        <button
            ref={ref}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-[12px] font-medium text-foreground hover:border-border-strong"
        >
            {children}
        </button>
    )
);
FilterChip.displayName = "FilterChip";

export function DateRangePicker() {
    const [open, setOpen] = useState(false);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger>
                <button className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-[12px] font-medium text-foreground hover:border-border-strong">
                    <Filter className="h-3 w-3" /> Last 7 days
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
                <MonthAndYearCalendar onClose={() => setOpen(false)} />
            </PopoverContent>
        </Popover>
    );
}