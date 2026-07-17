import React, { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Search,
  MoreHorizontal,
  ExternalLink,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Clock,
  Building2,
  UserMinus,
  Eye,
  Tag,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HandledDepot } from "../../types/employee.types";

interface HandledDepotsTableProps {
  depots: HandledDepot[];
  onUnassign?: (depotId: number) => void;
  isUnassigning?: boolean;
}

export const HandledDepotsTable: React.FC<HandledDepotsTableProps> = ({
  depots,
  onUnassign,
  isUnassigning = false,
}) => {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return depots;
    return depots.filter((d) =>
      [d.name, d.code, d.province, d.district, d.brandName]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [depots, search]);

  const getStatusBadge = (status: HandledDepot["assignmentStatus"]) => {
    switch (status) {
      case "assigned":
        return (
          <Badge
            variant="outline"
            className="border-blue-200 bg-blue-50 text-[9px] font-semibold uppercase tracking-wide text-blue-700"
          >
            Assigned
          </Badge>
        );
      case "completed":
        return (
          <Badge
            variant="outline"
            className="border-emerald-200 bg-emerald-50 text-[9px] font-semibold uppercase tracking-wide text-emerald-700"
          >
            Inactive
          </Badge>
        );
      case "pending":
        return (
          <Badge
            variant="outline"
            className="border-amber-200 bg-amber-50 text-[9px] font-semibold uppercase tracking-wide text-amber-700"
          >
            Pending
          </Badge>
        );
      case "overdue":
        return (
          <Badge
            variant="outline"
            className="border-red-200 bg-red-50 text-[9px] font-semibold uppercase tracking-wide text-red-700"
          >
            Expired
          </Badge>
        );
      default:
        return null;
    }
  };

  const getCoverageBadge = (status: HandledDepot["coverageStatus"]) => {
    switch (status) {
      case "full":
        return (
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600">
            <CheckCircle2 className="h-3 w-3" /> Healthy
          </div>
        );
      case "partial":
        return (
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-600">
            <Clock className="h-3 w-3" /> Expiring soon
          </div>
        );
      case "at_risk":
        return (
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-red-600">
            <AlertCircle className="h-3 w-3" /> At risk
          </div>
        );
      default:
        return null;
    }
  };

  const locationLabel = (depot: HandledDepot) => {
    const parts = [depot.district, depot.province].filter(Boolean);
    return parts.length ? parts.join(", ") : depot.address || "—";
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search handled depots..."
            className="h-8 bg-background pl-8 text-xs shadow-none"
          />
        </div>
        <span className="text-[11px] text-muted-foreground">
          {filtered.length} of {depots.length} depot{depots.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-9 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Depot
              </TableHead>
              <TableHead className="h-9 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Location
              </TableHead>
              <TableHead className="h-9 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Brand
              </TableHead>
              <TableHead className="h-9 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Status
              </TableHead>
              <TableHead className="h-9 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Products
              </TableHead>
              <TableHead className="h-9 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Assigned
              </TableHead>
              <TableHead className="h-9 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-sm text-muted-foreground">
                  No depots assigned to this employee.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((depot) => (
                <TableRow key={depot.id} className="h-12">
                  <TableCell className="py-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-600 text-white">
                        <Building2 className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-xs font-semibold text-foreground">
                          {depot.name}
                        </span>
                        <span className="font-mono text-[10px] uppercase tracking-tight text-muted-foreground">
                          {depot.code || `ID-${depot.id}`}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{locationLabel(depot)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-foreground">
                      <Tag className="h-3 w-3 text-muted-foreground" />
                      {depot.brandName || "—"}
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
                      <span className="text-[11px] font-semibold tabular-nums text-foreground">
                        {depot.productsManaged}
                      </span>
                      <span className="text-[9px] text-muted-foreground">
                        {depot.staffCount ?? 0} staff
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className="text-[11px] text-muted-foreground">
                      {depot.assignedAt
                        ? new Date(depot.assignedAt).toLocaleDateString()
                        : depot.lastVisit || "—"}
                    </span>
                  </TableCell>
                  <TableCell className="py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        asChild
                      >
                        <Link to="/depos/$id" params={{ id: String(depot.id) }} title="View depot">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuLabel className="text-xs">Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link
                              to="/depos/$id"
                              params={{ id: String(depot.id) }}
                              className="flex cursor-pointer items-center gap-2"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View depot
                            </Link>
                          </DropdownMenuItem>
                          {onUnassign && (
                            <DropdownMenuItem
                              className="gap-2 text-destructive focus:text-destructive"
                              disabled={isUnassigning}
                              onClick={() => onUnassign(depot.id)}
                            >
                              <UserMinus className="h-3.5 w-3.5" />
                              Unassign
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
