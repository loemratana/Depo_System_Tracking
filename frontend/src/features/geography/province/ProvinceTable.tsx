// src/features/geography/province/ProvinceTable.tsx
import React from 'react';
import { MapPin, Building2, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { ActionMenu } from '../components/ActionMenu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Province } from './province.types';
import { cn } from "@/lib/utils";

interface ProvinceTableProps {
  provinces: Province[];
  isLoading: boolean;
  selectedProvinceId: string | null;
  onSelectProvince: (id: string) => void;
  onEditProvince: (province: Province) => void;
  onDeleteProvince: (province: Province) => void;
  // Pagination props
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

// Columns: Province | Code | Depots | Created | Actions
const COLS = 5;

const SkeletonRow: React.FC = () => (
  <TableRow className="border-border/50">
    <TableCell className="py-3 px-4">
      <div className="flex items-center gap-2.5">
        <Skeleton className="h-7 w-7 rounded-md shrink-0" />
        <Skeleton className="h-4 w-28" />
      </div>
    </TableCell>
    <TableCell className="py-3 px-4"><Skeleton className="h-5 w-14 rounded" /></TableCell>
    <TableCell className="py-3 px-4 text-right pr-8"><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
    <TableCell className="py-3 px-4"><Skeleton className="h-4 w-20" /></TableCell>
    <TableCell className="py-3 px-4 w-[50px]" />
  </TableRow>
);

const TableHeadRow: React.FC = () => (
  <TableRow className="hover:bg-transparent border-none">
    <TableHead className="h-11 text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/40 first:rounded-tl-lg">
      Province
    </TableHead>
    <TableHead className="h-11 text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/40">
      Code
    </TableHead>
    <TableHead className="h-11 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right pr-8 bg-muted/40">
      Depots
    </TableHead>
    <TableHead className="h-11 text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/40">
      Created
    </TableHead>
    <TableHead className="h-11 w-[50px] bg-muted/40 last:rounded-tr-lg" />
  </TableRow>
);

export const ProvinceTable: React.FC<ProvinceTableProps> = ({
  provinces,
  isLoading,
  selectedProvinceId,
  onSelectProvince,
  onEditProvince,
  onDeleteProvince,
  pageIndex,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
}) => {
  const totalPages = Math.ceil(totalCount / pageSize);
  const startItem = totalCount === 0 ? 0 : pageIndex * pageSize + 1;
  const endItem = Math.min((pageIndex + 1) * pageSize, totalCount);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Table>
          <TableHeader className="bg-muted/50 sticky top-0 z-10 backdrop-blur-sm border-b border-border">
            <TableHeadRow />
          </TableHeader>
          <TableBody>
            {[...Array(pageSize)].map((_, i) => <SkeletonRow key={i} />)}
          </TableBody>
        </Table>
      </div>
    );
  }

  // Empty state (no provinces and totalCount === 0)
  if (provinces.length === 0 && totalCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center mb-5 border border-border/50 shadow-sm">
          <MapPin className="w-8 h-8 text-muted-foreground/40" />
        </div>
        <h3 className="text-base font-semibold text-foreground">No provinces found</h3>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-[250px] mx-auto">
          Get started by adding your first province to the system.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Table>
          <TableHeader className="bg-muted/50 sticky top-0 z-10 backdrop-blur-sm border-b border-border shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            <TableHeadRow />
          </TableHeader>
          <TableBody>
            {provinces.map((province) => {
              const isSelected = selectedProvinceId === province.id;
              return (
                <TableRow
                  key={province.id}
                  onClick={() => onSelectProvince(province.id)}
                  className={cn(
                    "group cursor-pointer transition-all border-b border-border/40",
                    isSelected
                      ? "bg-primary/5"
                      : "hover:bg-muted/30"
                  )}
                >
                  {/* Province name */}
                  <TableCell className="py-2.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        "p-2 rounded-lg transition-colors shrink-0",
                        isSelected
                          ? "bg-primary/10 text-primary"
                          : "bg-muted/50 text-muted-foreground group-hover:bg-muted"
                      )}>
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[13px] font-semibold text-foreground tracking-tight">
                        {province.name}
                      </span>
                    </div>
                  </TableCell>

                  {/* Code */}
                  <TableCell className="py-2.5 px-4">
                    <span className="text-xs font-medium bg-muted/40 px-2 py-1 rounded-md border border-border/40 text-foreground uppercase tracking-wider">
                      {province.code}
                    </span>
                  </TableCell>

                  {/* Depot count */}
                  <TableCell className="py-2.5 text-right pr-8">
                    <div className="flex items-center justify-end gap-1.5">
                      <Building2 className="w-3 h-3 text-muted-foreground/50" />
                      <span className="text-[12px] font-medium tabular-nums text-muted-foreground group-hover:text-foreground transition-colors">
                        {province.depotCount ?? 0}
                      </span>
                    </div>
                  </TableCell>

                  {/* Created date */}
                  <TableCell className="py-2.5 px-4">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                      <span className="text-[11px] text-muted-foreground">
                        {province.createdAt
                          ? new Date(province.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                          : '—'}
                      </span>
                    </div>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="py-2.5 px-2 w-[50px]">
                    <ActionMenu
                      onEdit={() => onEditProvince(province)}
                      onDelete={() => onDeleteProvince(province)}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 bg-muted/10">
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium text-foreground">{startItem}</span> to{" "}
              <span className="font-medium text-foreground">{endItem}</span> of{" "}
              <span className="font-medium text-foreground">{totalCount}</span> results
            </p>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => onPageSizeChange(Number(value))}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 50].map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pageIndex - 1)}
              disabled={pageIndex === 0}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Previous</span>
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (pageIndex < 2) {
                  pageNum = i + 1;
                } else if (pageIndex > totalPages - 3) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = pageIndex - 1 + i;
                }
                if (pageNum < 1 || pageNum > totalPages) return null;
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === pageIndex + 1 ? "default" : "outline"}
                    size="sm"
                    onClick={() => onPageChange(pageNum - 1)}
                    className="h-8 w-8 p-0"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pageIndex + 1)}
              disabled={pageIndex + 1 >= totalPages}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Next</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};