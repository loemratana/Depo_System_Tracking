import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, Edit2, X } from "lucide-react";
import type { UserProfile, ProfileUpdateInput } from "../types/userProfile.types";

interface ProfileTabContentProps {
  user: UserProfile;
  onUpdate?: (data: ProfileUpdateInput) => Promise<void>;
}

export function ProfileTabContent({ user, onUpdate }: ProfileTabContentProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [formData, setFormData] = useState<ProfileUpdateInput>({
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setErrorMessage("");
      setSuccessMessage("");
      if (onUpdate) await onUpdate(formData);
      setSuccessMessage("Profile updated successfully");
      setIsEditing(false);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error: any) {
      setErrorMessage(error?.message || "Failed to update profile");
      setTimeout(() => setErrorMessage(""), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
    });
    setIsEditing(false);
    setErrorMessage("");
  };

  return (
    <div className="space-y-5">
      {/* Alerts – minimal design */}
      {successMessage && (
        <Alert className="border-success/30 bg-success/5 py-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
          <AlertDescription className="text-[11px] text-success">{successMessage}</AlertDescription>
        </Alert>
      )}
      {errorMessage && (
        <Alert className="border-destructive/30 bg-destructive/5 py-2">
          <AlertCircle className="h-3.5 w-3.5 text-destructive" />
          <AlertDescription className="text-[11px] text-destructive">
            {errorMessage}
          </AlertDescription>
        </Alert>
      )}

      <Card className="border-border bg-card shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Personal Information
            </h2>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
              Manage your profile details
            </p>
          </div>
          {!isEditing && (
            <Button
              onClick={() => setIsEditing(true)}
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-[11px]"
            >
              <Edit2 className="h-3.5 w-3.5" />
              Edit
            </Button>
          )}
        </div>

        {/* Form fields */}
        <div className="p-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Full Name – full width on small screens */}
            <div className="md:col-span-2">
              <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5 block">
                Full Name
              </Label>
              <Input
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                disabled={!isEditing}
                className={cn(
                  "h-8 text-sm",
                  !isEditing && "bg-muted/30 border-transparent text-foreground/70",
                )}
              />
            </div>

            <div>
              <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5 block">
                Email Address
              </Label>
              <Input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                disabled={!isEditing}
                className={cn(
                  "h-8 text-sm",
                  !isEditing && "bg-muted/30 border-transparent text-foreground/70",
                )}
              />
            </div>

            <div>
              <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5 block">
                Phone Number
              </Label>
              <Input
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                disabled={!isEditing}
                className={cn(
                  "h-8 text-sm",
                  !isEditing && "bg-muted/30 border-transparent text-foreground/70",
                )}
              />
            </div>

            <div>
              <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5 block">
                Role
              </Label>
              <Input
                value={user.role}
                disabled
                className="h-8 text-sm bg-muted/30 border-transparent text-foreground/60"
              />
              <p className="text-[9px] text-muted-foreground mt-1">Read-only · contact admin</p>
            </div>

            <div>
              <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5 block">
                Member Since
              </Label>
              <Input
                value={new Date(user.joinDate).toLocaleDateString()}
                disabled
                className="h-8 text-sm bg-muted/30 border-transparent text-foreground/60"
              />
            </div>
          </div>
        </div>

        {/* Action buttons (when editing) */}
        {isEditing && (
          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3 bg-muted/5">
            <Button
              onClick={handleCancel}
              variant="ghost"
              size="sm"
              className="h-8 text-[11px] gap-1"
            >
              <X className="h-3 w-3" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              size="sm"
              className="h-8 text-[11px] gap-1"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

// Helper for conditional className (if cn not imported)
import { cn } from "@/lib/utils";
