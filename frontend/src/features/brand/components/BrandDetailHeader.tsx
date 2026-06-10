import React from "react";
import { ArrowLeft, Edit2, Trash2, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Brand } from "../types/brand.types";

interface BrandDetailHeaderProps {
  brand: Brand;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function BrandDetailHeader({ brand, onBack, onEdit, onDelete }: BrandDetailHeaderProps) {
  return (
    <div className="border-b border-border bg-card/15 py-4 px-6 select-none">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Left: Navigation and Name */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="h-8 px-2.5 text-[11px] gap-1.5 border-border-strong text-muted-foreground hover:text-foreground font-semibold shrink-0 cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back</span>
          </Button>

          {/* Brand Logo / Avatar */}
          <div className="relative h-11 w-11 shrink-0">
            {brand.logoUrl ? (
              <img
                src={brand.logoUrl}
                alt={brand.name}
                className="h-11 w-11 rounded-lg object-contain border border-border/60 bg-white p-1 shadow-sm"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = "flex";
                }}
              />
            ) : null}
            <span
              style={{ display: brand.logoUrl ? "none" : "flex" }}
              className="h-11 w-11 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-sm font-bold text-primary uppercase shadow-sm"
            >
              {brand.name.split(" ").map((n: string) => n[0]).join("").substring(0, 2)}
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-bold tracking-tight text-foreground">{brand.name}</h1>
              <span className="font-mono text-[11px] font-bold bg-muted border border-border px-1.5 py-0.5 rounded text-muted-foreground leading-none">
                {brand.code}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-none">
              Operational profile registry details and system mappings log
            </p>
          </div>
        </div>

        {/* Right: Operations */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="text-[11px] h-8 gap-1.5 border-border-strong text-foreground hover:bg-muted font-semibold cursor-pointer"
          >
            <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Edit Profile</span>
          </Button>

          <Button
            onClick={onDelete}
            size="sm"
            variant="ghost"
            className="
              text-[11px] h-8 gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/5
              font-semibold cursor-pointer
            "
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete Brand</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
export default BrandDetailHeader;
