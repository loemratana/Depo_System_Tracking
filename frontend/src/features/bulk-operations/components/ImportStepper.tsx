import React from "react";
import { cn } from "@/lib/utils";
import { Check, Upload, ShieldCheck, FileSpreadsheet, Play, CheckCircle } from "lucide-react";
import { ImportStep } from "../types";

interface ImportStepperProps {
  currentStep: ImportStep;
  className?: string;
}

export function ImportStepper({ currentStep, className }: ImportStepperProps) {
  const steps: { key: ImportStep; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "upload", label: "Upload Source", icon: Upload },
    { key: "validate", label: "Schema Validation", icon: ShieldCheck },
    { key: "preview", label: "Resolve Changes", icon: FileSpreadsheet },
    { key: "complete", label: "Execution Summary", icon: CheckCircle },
  ];

  const getStepStatus = (stepKey: ImportStep, currentIndex: number, targetIndex: number) => {
    if (currentIndex > targetIndex) return "completed";
    if (currentIndex === targetIndex) return "active";
    return "pending";
  };

  const currentIdx = steps.findIndex((s) => s.key === currentStep);

  return (
    <div className={cn("w-full py-4 border-b border-border bg-card/40 backdrop-blur-sm px-6", className)}>
      <div className="mx-auto max-w-5xl flex items-center justify-between">
        {steps.map((step, idx) => {
          const status = getStepStatus(step.key, currentIdx, idx);
          const Icon = step.icon;

          return (
            <React.Fragment key={step.key}>
              {/* Step */}
              <div className="flex items-center gap-3 group">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border text-[12px] font-semibold transition-all duration-300",
                    status === "completed"
                      ? "bg-primary border-primary text-primary-foreground shadow-[0_0_12px_rgba(var(--primary),0.2)]"
                      : status === "active"
                      ? "bg-background border-primary text-foreground ring-2 ring-primary/20"
                      : "bg-background border-border text-muted-foreground"
                  )}
                >
                  {status === "completed" ? (
                    <Check className="h-4 w-4 stroke-[2.5]" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <div className="hidden sm:block text-left">
                  <p
                    className={cn(
                      "text-[12px] font-medium transition-colors duration-200",
                      status === "active"
                        ? "text-foreground font-semibold"
                        : status === "completed"
                        ? "text-foreground/90"
                        : "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 capitalize leading-none mt-0.5">
                    Step {idx + 1}
                  </p>
                </div>
              </div>

              {/* Line connector */}
              {idx < steps.length - 1 && (
                <div className="flex-1 mx-4 h-[1px] bg-border relative overflow-hidden">
                  <div
                    className={cn(
                      "absolute top-0 left-0 h-full bg-primary transition-all duration-500 ease-in-out",
                      status === "completed" ? "w-full" : "w-0"
                    )}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
