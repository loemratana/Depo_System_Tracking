"use client"

import React, { useState } from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { StatusBadge } from "@/components/ui-kit"
import { MoreHorizontal, Eye, Edit, Tag, ArrowRightLeft, Ban, Package, ArrowUpDown, ChevronDown } from "lucide-react"

import type { Product, ProductStatus } from "../types/product.types"

// Keep ProductData export for backward-compat with existing dialogs
export type { Product as ProductData }

interface ProductTableProps {
  data: Product[]
  onView: (id: number) => void
  onEdit: (id: number) => void
  onAdjustStock: (id: number) => void
  onDelete: (id: number) => void
}

const STATUS_MAP: Record<
  string,
  { label: string; tone: "success" | "destructive" | "neutral" | "warning" }
> = {
  ok: { label: "In Stock", tone: "success" },
  OK: { label: "In Stock", tone: "success" },
  low: { label: "Low Stock", tone: "warning" },
  LOW: { label: "Low Stock", tone: "warning" },
  out_of_stock: { label: "Out of Stock", tone: "destructive" },
  OUT_OF_STOCK: { label: "Out of Stock", tone: "destructive" },
  discontinued: { label: "Discontinued", tone: "neutral" },
  DISCONTINUED: { label: "Discontinued", tone: "neutral" },
}

export const ProductTable: React.FC<ProductTableProps> = ({
  data,
  onView,
  onEdit,
  onAdjustStock,
  onDelete,
}) => {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState({})

  const columns: ColumnDef<Product>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="pl-0 hover:bg-transparent"
          >
            Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 shadow-sm">
            <Package className="h-4 w-4 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{row.original.name}</span>
            {row.original.sku && (
              <span className="text-[11px] font-mono text-muted-foreground">
                {row.original.sku}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "brandId",
      header: "Brand",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.brand?.name ?? "—"}</span>
        </div>
      ),
    },
    {
      accessorKey: "depotId",
      header: "Depot",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.depot?.name ?? "—"}</span>
        </div>
      ),
    },
    {
      accessorKey: "quantity",
      header: () => <div className="text-right">Qty</div>,
      cell: ({ row }) => (
        <div className="text-right font-medium">
          {row.getValue("quantity")}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const s = row.getValue("status") as ProductStatus
        const { label, tone } = STATUS_MAP[s] ?? {
          label: s,
          tone: "neutral" as const,
        }
        return (
          <StatusBadge tone={tone} dot>
            {label}
          </StatusBadge>
        )
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const product = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView(product.id)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(product.id)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Product
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onAdjustStock(product.id)}>
                <Tag className="mr-2 h-4 w-4" />
                Adjust Stock
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete(product.id)}
              >
                <Ban className="mr-2 h-4 w-4" />
                Delete Product
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  return (
    <div className="w-full">
      <div className="mb-3 flex items-center justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs">
              Columns <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                )
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
        <Table>
          <TableHeader className="bg-muted/40">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent border-b border-border/60">
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="border-b border-border/40 last:border-0"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {table.getFilteredSelectedRowModel().rows.length > 0 && (
        <div className="py-2 text-xs text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
      )}
    </div>
  )
}
