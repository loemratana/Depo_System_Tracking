import React, { useState } from "react";
import { cn } from "@/lib/utils";
import {
  MoreHorizontal,
  Eye,
  Edit2,
  Archive,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Brand } from "../types/brand.types";
import { BrandStatusBadge } from "./BrandStatusBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface BrandTableProps {
  brands: Brand[];
  compact: boolean;
  sortBy: string;
  onSortChange: (field: string) => void;
  onView: (brand: Brand) => void;
  onEdit: (brand: Brand) => void;
  onArchive: (id: number) => void;
  onDelete: (brand: Brand) => void;
}

export function BrandTable({
  brands,
  compact,
  sortBy,
  onSortChange,
  onView,
  onEdit,
  onArchive,
  onDelete,
}: BrandTableProps) {
  const renderSortIcon = (field: string) => {
    if (sortBy === field + "_asc")
      return <ArrowUp className="h-3 w-3 ml-1 text-primary shrink-0" />;
    if (sortBy === field + "_desc")
      return <ArrowDown className="h-3 w-3 ml-1 text-primary shrink-0" />;
    return (
      <ArrowUpDown className="h-3 w-3 ml-1 text-muted-foreground/45 group-hover:text-muted-foreground transition-colors shrink-0" />
    );
  };

  const handleHeaderClick = (field: string) => {
    onSortChange(field);
  };

  return (
    <div className="border border-border rounded-lg bg-card/10 overflow-hidden shadow-sm">
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse table-fixed select-text">
          <thead className="bg-card/75 border-b border-border/80 sticky top-0 z-10 select-none">
            <tr>
              <th className="px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-[120px]">
                Brand ID
              </th>

              <th
                onClick={() => handleHeaderClick("name")}
                className="px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-[240px] cursor-pointer hover:bg-muted/10 group transition-all"
              >
                <div className="flex items-center">
                  <span>Brand Name</span>
                  {renderSortIcon("name")}
                </div>
              </th>

              <th className="px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-[140px]">
                Brand Code
              </th>

              <th className="px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-[320px]">
                Description
              </th>

              <th className="px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-[120px]">
                Status
              </th>

              <th
                onClick={() => handleHeaderClick("date")}
                className="px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-[150px] cursor-pointer hover:bg-muted/10 group transition-all"
              >
                <div className="flex items-center">
                  <span>Created At</span>
                  {renderSortIcon("date")}
                </div>
              </th>

              <th className="px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-[80px] text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {brands.map((brand) => (
              <tr key={brand.id} className="hover:bg-muted/10 transition-colors duration-100 group">
                <td className="px-4 text-[12px] font-mono text-muted-foreground/80 py-2">
                  {Number(brand.id)}
                </td>

                <td className="px-4 text-[12px] font-semibold text-foreground py-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Brand Logo / Initials Avatar */}
                    <div className="relative h-7 w-7 shrink-0">
                      {brand.logoUrl ? (
                        <img
                          src={brand.logoUrl}
                          alt={brand.name}
                          className="h-7 w-7 rounded-md object-contain border border-border/50 bg-white p-0.5"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = "flex";
                          }}
                        />
                      ) : null}
                      <span
                        style={{ display: brand.logoUrl ? "none" : "flex" }}
                        className="h-7 w-7 items-center justify-center rounded-md bg-primary/10 border border-primary/20 text-[9px] font-bold text-primary uppercase"
                      >
                        {brand.name
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")
                          .substring(0, 2)}
                      </span>
                    </div>
                    <span className="truncate">{brand.name}</span>
                  </div>
                </td>

                <td className="px-4 text-[12px] font-mono font-semibold text-foreground py-2">
                  {brand.code}
                </td>

                <td
                  className="px-4 text-[12px] text-muted-foreground py-2 truncate"
                  title={brand.description}
                >
                  {brand.description}
                </td>

                <td className="px-4 py-2">
                  <BrandStatusBadge status={brand.status} />
                </td>

                <td className="px-4 text-[11px] text-muted-foreground py-2 font-mono">
                  {brand.createdAt}
                </td>

                <td className="px-4 py-2 text-right relative">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 p-0 hover:bg-muted text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="bg-popover border border-border text-[12px] font-medium text-popover-foreground w-36"
                    >
                      <DropdownMenuItem
                        onClick={() => onView(brand)}
                        className="cursor-pointer gap-2"
                      >
                        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>View Details</span>
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() => onEdit(brand)}
                        className="cursor-pointer gap-2"
                      >
                        <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>Edit Profile</span>
                      </DropdownMenuItem>

                      {brand.status !== "archived" && (
                        <DropdownMenuItem
                          onClick={() => onArchive(brand.id)}
                          className="cursor-pointer gap-2"
                        >
                          <Archive className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>Archive Brand</span>
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuItem
                        onClick={() => onDelete(brand)}
                        className="cursor-pointer gap-2 text-destructive focus:text-destructive focus:bg-destructive/5"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete Brand</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Inject custom height compression styles dynamically */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .overflow-x-auto td {
          padding-top: ${compact ? "0.4rem" : "0.75rem"} !important;
          padding-bottom: ${compact ? "0.4rem" : "0.75rem"} !important;
        }
      `,
        }}
      />
    </div>
  );
}
export default BrandTable;
