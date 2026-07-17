import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { getAvatarUrl, getInitials } from "@/lib/avatar";

const sizeClasses = {
  xs: "h-7 w-7 text-[10px]",
  sm: "h-8 w-8 text-[11px]",
  md: "h-10 w-10 text-xs",
  lg: "h-12 w-12 text-sm",
  xl: "h-20 w-20 text-lg",
  "2xl": "h-28 w-28 text-2xl",
} as const;

interface UserAvatarProps {
  src?: string | null;
  name?: string;
  email?: string;
  id?: string | number;
  size?: keyof typeof sizeClasses;
  className?: string;
  fallbackClassName?: string;
  showRing?: boolean;
}

export function UserAvatar({
  src,
  name,
  email,
  id,
  size = "md",
  className,
  fallbackClassName,
  showRing = false,
}: UserAvatarProps) {
  const avatarSrc = getAvatarUrl({ src, name, email, id });
  const initials = getInitials(name, email?.[0]?.toUpperCase() ?? "U");

  return (
    <Avatar
      className={cn(
        sizeClasses[size],
        showRing && "ring-2 ring-blue-600/20 ring-offset-2 ring-offset-background",
        className,
      )}
    >
      <AvatarImage src={avatarSrc} alt={name || "User avatar"} className="object-cover" />
      <AvatarFallback
        className={cn(
          "bg-blue-600 font-bold text-white",
          fallbackClassName,
        )}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
