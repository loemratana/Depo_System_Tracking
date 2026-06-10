import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreateBrandInput, BrandStatus } from "../types/brand.types";

const brandSchema = z.object({
  name: z.string().min(2, "Brand name must be at least 2 characters").max(100, "Maximum 100 characters"),
  code: z
    .string()
    .min(2, "Brand code must be at least 3 characters")
    .max(20, "Maximum 20 characters")
    .regex(/^[A-Za-z0-9-]+$/, "Only letters, numbers, and hyphens allowed"),
  description: z.string().max(500, "Maximum 500 characters").default(""),
  status: z.enum(["active", "inactive", "archived"]),
});

type FormData = z.infer<typeof brandSchema>;

interface BrandFormProps {
  initialData?: Partial<CreateBrandInput>;
  onSubmit: (data: CreateBrandInput) => void;
  onCancel: () => void;
  submitLabel?: string;
  isSubmitting?: boolean;
}

export function BrandForm({
  initialData,
  onSubmit,
  onCancel,
  submitLabel = "Save Brand",
  isSubmitting = false,
}: BrandFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(brandSchema),
    defaultValues: {
      name: initialData?.name || "",
      code: initialData?.code || "",
      description: initialData?.description || "",
      status: initialData?.status || "active",
    },
  });

  const selectedStatus = watch("status");

  const onFormSubmit = (data: FormData) => {
    onSubmit({
      ...data,
      code: data.code.toUpperCase(),
    });
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4 text-left">
      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="name" className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">
          Brand Name
        </Label>
        <input
          id="name"
          type="text"
          placeholder="e.g. Coca-Cola Indochina"
          {...register("name")}
          className={cn(
            "w-full px-3 py-1.5 text-[12px] bg-background border rounded focus:outline-none focus:ring-1 transition-all",
            errors.name 
              ? "border-destructive focus:ring-destructive" 
              : "border-border-strong focus:ring-primary focus:border-primary"
          )}
        />
        {errors.name && (
          <p className="text-[10px] text-destructive mt-0.5">{errors.name.message}</p>
        )}
      </div>

      {/* Code */}
      <div className="space-y-1.5">
        <Label htmlFor="code" className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">
          Brand Code
        </Label>
        <input
          id="code"
          type="text"
          placeholder="e.g. BD-BR-12"
          {...register("code")}
          className={cn(
            "w-full px-3 py-1.5 text-[12px] font-mono bg-background border rounded focus:outline-none focus:ring-1 transition-all",
            errors.code 
              ? "border-destructive focus:ring-destructive" 
              : "border-border-strong focus:ring-primary focus:border-primary"
          )}
        />
        {errors.code && (
          <p className="text-[10px] text-destructive mt-0.5">{errors.code.message}</p>
        )}
        <p className="text-[9px] text-muted-foreground leading-normal">
          Uppercase letters, numbers, and hyphens only.
        </p>
      </div>

      {/* Status Select */}
      <div className="space-y-1.5">
        <Label htmlFor="status" className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">
          Operational Status
        </Label>
        <Select
          value={selectedStatus}
          onValueChange={(val: BrandStatus) => setValue("status", val)}
        >
          <SelectTrigger className="h-8 text-[12px] bg-background border-border-strong text-foreground font-medium">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent className="bg-popover border border-border text-[12px]">
            <SelectItem value="active">Active Directory</SelectItem>
            <SelectItem value="inactive">Temporarily Inactive</SelectItem>
            <SelectItem value="archived">Permanently Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="description" className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">
          Partnership Description
        </Label>
        <textarea
          id="description"
          rows={4}
          placeholder="Describe partnership coverage, storage requirements, and logistics parameters..."
          {...register("description")}
          className={cn(
            "w-full px-3 py-1.5 text-[12px] bg-background border rounded focus:outline-none focus:ring-1 transition-all resize-none",
            errors.description 
              ? "border-destructive focus:ring-destructive" 
              : "border-border-strong focus:ring-primary focus:border-primary"
          )}
        />
        {errors.description && (
          <p className="text-[10px] text-destructive mt-0.5">{errors.description.message}</p>
        )}
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-end gap-2 pt-4 border-t border-border mt-6">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isSubmitting}
          className="text-[11px] h-8 border-border-strong text-foreground hover:bg-muted"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={isSubmitting}
          className="text-[11px] h-8 bg-primary text-primary-foreground hover:bg-primary/95"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
              <span>Saving...</span>
            </span>
          ) : (
            <span>{submitLabel}</span>
          )}
        </Button>
      </div>
    </form>
  );
}
export default BrandForm;
