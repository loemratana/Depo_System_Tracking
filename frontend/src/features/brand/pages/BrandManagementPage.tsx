import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Download, Plus, ChevronLeft, ChevronRight, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useBrands,
  useCreateBrand,
  useUpdateBrand,
  useDeleteBrand,
  useArchiveBrand,
} from "../hooks/useBrands.ts";
import type { Brand, CreateBrandInput } from "../types/brand.types.ts";
import { BrandFilters } from "../components/BrandFilters";
import { BrandTable } from "../components/BrandTable";
import { BrandDrawer } from "../components/BrandDrawer";
import { DeleteBrandDialog } from "../components/DeleteBrandDialog";
import { SkeletonLoader } from "../components/SkeletonLoader";
import { EmptyState } from "../components/EmptyState";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

export function BrandManagementPage() {
  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const [compact, setCompact] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const navigate = useNavigate();
  // Drawer (create/edit) state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);

  // Delete dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [brandToDelete, setBrandToDelete] = useState<Brand | null>(null);

  // API hooks
  const { data: brandsData, isLoading } = useBrands(
    searchQuery,
    statusFilter === "All" ? undefined : statusFilter.toLowerCase(),
  );
  const brands = brandsData?.data ?? []; // ensure array
  const createBrand = useCreateBrand();
  const updateBrand = useUpdateBrand();
  const deleteBrand = useDeleteBrand();
  const archiveBrand = useArchiveBrand();

  // Client‑side filtering & sorting (since API already supports search/status, but we keep sorting here)
  const filteredBrands = useMemo(() => {
    if (!brands.length) return [];

    let result = [...brands];

    if (sortBy === "newest") {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === "oldest") {
      result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else if (sortBy === "name_asc") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "name_desc") {
      result.sort((a, b) => b.name.localeCompare(a.name));
    }

    return result;
  }, [brands, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredBrands.length / itemsPerPage));

  const paginatedBrands = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredBrands.slice(start, start + itemsPerPage);
  }, [filteredBrands, currentPage, itemsPerPage]);

  // Handlers
  const handleSortChange = (field: string) => {
    if (field === "name") {
      setSortBy((prev) => (prev === "name_asc" ? "name_desc" : "name_asc"));
    } else if (field === "date") {
      setSortBy((prev) => (prev === "newest" ? "oldest" : "newest"));
    }
  };

  const triggerCreate = () => {
    setEditingBrand(null);
    setIsDrawerOpen(true);
  };

  const triggerEdit = (brand: Brand) => {
    setEditingBrand(brand);
    setIsDrawerOpen(true);
  };

  const triggerDelete = (brand: Brand) => {
    setBrandToDelete(brand);
    setIsDeleteDialogOpen(true);
  };

  const handleArchive = (brand: Brand) => {

    archiveBrand.mutate({ id: brand.id });
  };

  const handleCreateSubmit = async (data: CreateBrandInput) => {
    if (editingBrand) {
      const id = Number(editingBrand.id);
      if (isNaN(id)) {
        toast.error("Invalid brand ID");
        return;
      }
      await updateBrand.mutateAsync({ id, ...data });
    } else {
      await createBrand.mutateAsync(data);
    }
    setIsDrawerOpen(false);
    setEditingBrand(null);
  };

  const handleConfirmDelete = async () => {
    if (!brandToDelete) return;
    await deleteBrand.mutateAsync(brandToDelete.id);
    setIsDeleteDialogOpen(false);
    setBrandToDelete(null);
  };

  const handleDownloadTemplate = () => {
    const csvContent =
      "data:text/csv;charset=utf-8,Brand Name,Brand Code,Description,Status\nHeineken Asia,BD-BR-20,Premium European lager distribution partnership,active\n";
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", "brand_registry_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Excel template downloaded successfully.");
  };

  return (
    <div className="flex-1 min-h-screen bg-background">
      <header className="border-b border-border bg-card/15 py-4 px-6 select-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-5 w-5 rounded bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Layers className="h-3 w-3 text-primary" />
              </span>
              <h1 className="text-lg font-bold tracking-tight text-foreground">
                Brand Directories
              </h1>
            </div>
            <p className="text-[12px] text-muted-foreground mt-1 leading-none">
              Register FMCG logistics partners, configure SKUs, and track operational coverage
              audits. Total:{" "}
              <span className="font-semibold text-foreground/80">
                {brands.length} brand entries
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="text-[11px] h-8 gap-1.5 border-border-strong text-foreground hover:bg-muted font-semibold"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Get Excel Template</span>
            </Button>
            <Button
              onClick={triggerCreate}
              size="sm"
              className="text-[11px] h-8 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/95 font-semibold"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Brand</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="px-6 py-6 space-y-6">
        <BrandFilters
          searchQuery={searchQuery}
          onSearchChange={(val) => {
            setSearchQuery(val);
            setCurrentPage(1);
          }}
          statusFilter={statusFilter}
          onStatusFilterChange={(val) => {
            setStatusFilter(val);
            setCurrentPage(1);
          }}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          compact={compact}
          onCompactToggle={setCompact}
        />

        {isLoading ? (
          <SkeletonLoader rows={compact ? 8 : 6} columns={7} />
        ) : filteredBrands.length > 0 ? (
          <div className="space-y-4">
            <BrandTable
              brands={paginatedBrands}
              compact={compact}
              sortBy={sortBy}
              onSortChange={handleSortChange}
              onView={(brand) => navigate({ to: "/brands/$id", params: { id: String(brand.id) } })}
              onEdit={triggerEdit}
              onArchive={handleArchive}
              onDelete={triggerDelete}
            />

            {/* Pagination */}
            <div className="flex items-center justify-between select-none text-[11px] text-muted-foreground border border-border rounded-lg bg-card/15 px-4 py-2.5 shadow-sm">
              <div>
                Showing{" "}
                <span className="font-semibold text-foreground">
                  {(currentPage - 1) * itemsPerPage + 1}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-foreground">
                  {Math.min(currentPage * itemsPerPage, filteredBrands.length)}
                </span>{" "}
                of <span className="font-semibold text-foreground">{filteredBrands.length}</span>{" "}
                brand profiles
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="h-7 w-7 p-0 border-border-strong text-foreground hover:bg-muted shrink-0 disabled:opacity-50"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                  let pageNum = i + 1;
                  if (totalPages > 5 && currentPage > 3) {
                    pageNum = currentPage - 2 + i;
                    if (pageNum > totalPages) return null;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className={cn(
                        "h-7 w-7 p-0 shrink-0 font-semibold",
                        currentPage === pageNum
                          ? "bg-primary text-primary-foreground hover:bg-primary"
                          : "border-border-strong text-foreground hover:bg-muted",
                      )}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <>
                    <span className="text-muted-foreground">…</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      className="h-7 w-7 p-0 border-border-strong text-foreground hover:bg-muted"
                    >
                      {totalPages}
                    </Button>
                  </>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="h-7 w-7 p-0 border-border-strong text-foreground hover:bg-muted shrink-0 disabled:opacity-50"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <EmptyState
            title={searchQuery ? "No matches found" : "No brands listed"}
            description={
              searchQuery
                ? `Your filter matches 0 results for "${searchQuery}". Try auditing your keywords.`
                : "No brands registered under this status. Add a brand partner profile to establish logs."
            }
          />
        )}
      </main>

      <BrandDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSubmit={handleCreateSubmit}
        initialData={editingBrand || undefined}
        title={editingBrand ? "Edit Brand Details" : "Register Brand"}
        subtitle={editingBrand ? "Modify core profile details" : "Register brand partner"}
      />

      <DeleteBrandDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setBrandToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        brand={brandToDelete}
      />
    </div>
  );
}

export default BrandManagementPage;
