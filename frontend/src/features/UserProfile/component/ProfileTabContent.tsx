import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Surface } from "@/components/ui-kit";
import { UserAvatar } from "@/components/ui/user-avatar";
import { CheckCircle2, AlertCircle, Edit2, X } from "lucide-react";
import { cn } from "@/lib/utils";
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update profile";
      setErrorMessage(message);
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
    <div className="space-y-4">
      {successMessage && (
        <Alert className="border-emerald-600/30 bg-emerald-50 py-2 dark:bg-emerald-950/20">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          <AlertDescription className="text-xs text-emerald-700 dark:text-emerald-400">
            {successMessage}
          </AlertDescription>
        </Alert>
      )}
      {errorMessage && (
        <Alert className="border-red-600/30 bg-red-50 py-2 dark:bg-red-950/20">
          <AlertCircle className="h-3.5 w-3.5 text-red-600" />
          <AlertDescription className="text-xs text-red-700 dark:text-red-400">
            {errorMessage}
          </AlertDescription>
        </Alert>
      )}

      <Surface className="flex items-center gap-4 p-4">
        <UserAvatar
          src={user.avatar}
          name={user.fullName}
          email={user.email}
          id={user.id}
          size="xl"
        />
        <div>
          <p className="text-sm font-semibold text-foreground">Profile Photo</p>
          <p className="text-xs text-muted-foreground">
            Use the camera button on the left sidebar to update your photo.
          </p>
        </div>
      </Surface>

      <Surface padded={false} className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/70 bg-muted/20 px-5 py-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Personal Information</h2>
            <p className="text-xs text-muted-foreground">Manage your profile details</p>
          </div>
          {!isEditing && (
            <Button
              onClick={() => setIsEditing(true)}
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 rounded-lg text-xs"
            >
              <Edit2 className="h-3.5 w-3.5" />
              Edit
            </Button>
          )}
        </div>

        <div className="space-y-5 p-5">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Full Name
              </Label>
              <Input
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                disabled={!isEditing}
                className={cn(
                  "h-9 rounded-lg",
                  !isEditing && "border-transparent bg-muted/30 text-foreground/80",
                )}
              />
            </div>

            <div>
              <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Email Address
              </Label>
              <Input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                disabled={!isEditing}
                className={cn(
                  "h-9 rounded-lg",
                  !isEditing && "border-transparent bg-muted/30 text-foreground/80",
                )}
              />
            </div>

            <div>
              <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Phone Number
              </Label>
              <Input
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                disabled={!isEditing}
                className={cn(
                  "h-9 rounded-lg",
                  !isEditing && "border-transparent bg-muted/30 text-foreground/80",
                )}
              />
            </div>

            <div>
              <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Role
              </Label>
              <Input
                value={user.role}
                disabled
                className="h-9 rounded-lg border-transparent bg-muted/30 text-foreground/60"
              />
              <p className="mt-1 text-[10px] text-muted-foreground">Read-only · contact admin to change</p>
            </div>

            <div>
              <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Member Since
              </Label>
              <Input
                value={new Date(user.joinDate).toLocaleDateString()}
                disabled
                className="h-9 rounded-lg border-transparent bg-muted/30 text-foreground/60"
              />
            </div>
          </div>
        </div>

        {isEditing && (
          <div className="flex items-center justify-end gap-2 border-t border-border/70 bg-muted/10 px-5 py-3">
            <Button onClick={handleCancel} variant="ghost" size="sm" className="h-8 gap-1 text-xs">
              <X className="h-3 w-3" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              size="sm"
              className="h-8 gap-1 rounded-lg bg-blue-600 text-xs hover:bg-blue-700"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}
      </Surface>
    </div>
  );
}
