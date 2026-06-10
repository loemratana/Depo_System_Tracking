import React from "react";
import {
  Search,
  Filter,
  ArrowUpDown,
  MoreHorizontal,
  ExternalLink,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HandledDepot } from "../../types/employee.types";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface HandledDepotsTableProps {
  depots: HandledDepot[];
}

export const HandledDepotsTable: React.FC<HandledDepotsTableProps> = ({ depots }) => {
  const getStatusBadge = (status: HandledDepot["assignmentStatus"]) => {
    switch (status) {
      case "assigned":
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-600  dark:bg-blue-500/10 dark:text-blue-400 text-[9px] uppercase font-black tracking-tight px-1 h-4 shadow-none py-3"
          >
            Assigned
          </Badge>
        );
      case "completed":
        return (
          <Badge
            variant="outline"
            className="bg-emerald-50 text-emerald-600  dark:bg-emerald-500/10 dark:text-emerald-400 text-[9px] uppercase font-black tracking-tight px-1.5 h-4 shadow-none py-3"
          >
            Completed
          </Badge>
        );
      case "pending":
        return (
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 text-[9px] uppercase font-black tracking-tight px-1.5 h-4 shadow-none"
          >
            Pending
          </Badge>
        );
      case "overdue":
        return (
          <Badge
            variant="outline"
            className="bg-red-50 text-red-600 border-red-100 dark:bg-red-500/10 dark:text-red-400 text-[9px] uppercase font-black tracking-tight px-1.5 h-4 shadow-none"
          >
            Overdue
          </Badge>
        );
    }
  };

  const getCoverageBadge = (status: HandledDepot["coverageStatus"]) => {
    switch (status) {
      case "full":
        return (
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
            <CheckCircle2 className="h-3 w-3" /> Full
          </div>
        );
      case "partial":
        return (
          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-[11px] font-bold">
            <Clock className="h-3 w-3" /> Partial
          </div>
        );
      case "at_risk":
        return (
          <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 text-[11px] font-bold">
            <AlertCircle className="h-3 w-3" /> At Risk
          </div>
        );
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
          <Input
            placeholder="Search handled depots..."
            className="pl-8.5 h-8 text-[11px] border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus-visible:ring-1 focus-visible:ring-zinc-300 shadow-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 gap-2 text-[11px] font-bold border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-none"
          >
            <Filter className="h-3 w-3 text-zinc-500" />
            Filters
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 gap-2 text-[11px] font-bold border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-none"
          >
            <ArrowUpDown className="h-3 w-3 text-zinc-500" />
            Sort
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-950">
        <Table>
          <TableHeader className="bg-zinc-50/50 dark:bg-zinc-900/50">
            <TableRow className="hover:bg-transparent border-zinc-200 dark:border-zinc-800 h-9">
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-400 h-9 py-0">
                Depot Name
              </TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-400 h-9 py-0">
                Location
              </TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-400 h-9 py-0">
                Status
              </TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-400 h-9 py-0 text-center">
                Managed Items
              </TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-400 h-9 py-0">
                Frequency
              </TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-400 h-9 py-0">
                Last Visit
              </TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-400 h-9 py-0 text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {depots.map((depot) => (
              <TableRow
                key={`${depot.id}-${depot.code}`}
                className="border-zinc-100 dark:border-zinc-800/60 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors h-12"
              >
                <TableCell className="py-2">
                  <div className="flex items-center gap-3">
                    <Building2 color="#68c11f" />

                    <div className="flex flex-col">
                      <span className="text-[12px] font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
                        {depot.name}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-tighter">
                        {depot.code}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-2">
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                    <MapPin className="h-2.5 w-2.5" />
                    {depot.district}, {depot.province}
                  </div>
                </TableCell>
                <TableCell className="py-2">
                  <div className="flex flex-col gap-1">
                    {getStatusBadge(depot.assignmentStatus)}
                    {getCoverageBadge(depot.coverageStatus)}
                  </div>
                </TableCell>
                <TableCell className="py-2 text-center">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 leading-tight">
                      {depot.productsManaged} Products
                    </span>
                    <span className="text-[9px] font-medium text-zinc-400">
                      {depot.activeTasks} Active Tasks
                    </span>
                  </div>
                </TableCell>
                <TableCell className="py-2">
                  <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                    {depot.visitFrequency}
                  </span>
                </TableCell>
                <TableCell className="py-2">
                  <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                    {depot.lastVisit}
                  </span>
                </TableCell>
                <TableCell className="py-2 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                    >
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between text-[10px] font-medium text-zinc-400 px-1 uppercase tracking-wider">
        <span>{depots.length} entries assigned</span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-6 text-[10px] font-bold px-2" disabled>
            Prev
          </Button>
          <div className="h-3 w-[1px] bg-zinc-200 dark:bg-zinc-800 mx-1" />
          <Button variant="ghost" size="sm" className="h-6 text-[10px] font-bold px-2">
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};
