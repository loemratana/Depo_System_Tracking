// features/brand/components/DepotsTab.tsx
import React from "react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui-kit";
import { ArrowRight, MapPin, Warehouse } from "lucide-react";
import { useDepotsByBrand } from "@/features/brand/hooks/useBrands";

interface DepotsTabProps {
  brandId: number;
}

export function DepotsTab({ brandId }: DepotsTabProps) {
  const { data, isLoading, isError } = useDepotsByBrand(brandId);

  // Safely ensure data is an array
  const depots = Array.isArray(data) ? data : [];


  // Loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-border">
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <Card className="border-border">
        <CardContent className="py-12 text-center text-destructive text-sm">
          Failed to load depots. Please try again.
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (depots.length === 0) {
    return (
      <Card className="border-border">
        <CardContent className="py-14 flex flex-col items-center gap-3 text-muted-foreground">
          <Warehouse className="h-10 w-10 opacity-25" />
          <p className="text-sm">No depots are assigned to this brand yet.</p>
        </CardContent>
      </Card>
    );
  }

  // Render depots
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {depots.map((depot) => (
        <Card
          key={depot.id}
          className="border-border hover:shadow-md hover:border-primary/30 transition-all duration-200"
        >
          <CardContent className="p-4 ">
            <div className="flex items-start justify-between gap-3">
              {/* Left: icon + info */}
              <div className="flex items-start gap-3 min-w-0">
                <div className="mt-0.5 shrink-0 h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Warehouse className="h-4 w-4" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <h4 className="font-semibold text-sm text-foreground truncate">
                    {depot.name}
                  </h4>
                  {depot.code && (
                    <span className="font-mono text-[10px] bg-muted/60 px-1.5 py-0.5 rounded border text-muted-foreground">
                      {depot.code}
                    </span>
                  )}
                  <p className="flex items-center gap-1 text-xs text-muted-foreground pt-0.5">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {/* Use region or province or district only */}
                    {[depot.district, depot.region || depot.province].filter(Boolean).join(", ") || "—"}
                  </p>
                </div>
              </div>

              {/* Right: status badge + view link */}
              <div className="flex flex-col items-end gap-2 shrink-0">
                <StatusBadge tone={depot.status === "active" ? "success" : "muted"}>
                  {depot.status?.toUpperCase() ?? "ACTIVE"}
                </StatusBadge>
                <Button variant="ghost" size="sm" asChild className="h-7 px-2 text-xs">
                  <Link to={`/depos/${depot.id}`}>
                    View <ArrowRight className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}