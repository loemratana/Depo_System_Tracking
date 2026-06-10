import { Link, useRouterState } from "@tanstack/react-router";
import { 
  Bell, 
  ChevronDown, 
  Moon, 
  Search, 
  Sun, 
  ChevronRight,
  LogOut, 
  User, 
  Settings as SettingsIcon 
} from "lucide-react";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const LABELS: Record<string, string> = {
  "": "Dashboard",
  depos: "Brand Depos",
  visits: "Visits",
  products: "Products",
  handlers: "Handlers",
  reports: "Reports",
  analytics: "Analytics",
  activity: "Activity Log",
  notifications: "Notifications",
  settings: "Settings",
};

export function AppHeader() {
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const segments = pathname.split("/").filter(Boolean);
  const crumbs = segments.length === 0 ? ["Dashboard"] : segments.map((s) => LABELS[s] ?? s);

  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "??";

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-background/80 px-5 backdrop-blur">
      {/* Workspace + breadcrumb */}
      <div className="flex min-w-0 items-center gap-2 text-[13px]">
        <button className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-muted-foreground hover:bg-muted hover:text-foreground">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-foreground/10 text-[10px] font-semibold">
            {user?.workspace.substring(0, 2).toUpperCase() || "BD"}
          </span>
          <span className="font-medium text-foreground">{user?.workspace || "Brand Depot"}</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
        <span className="text-muted-foreground/40">/</span>
        <nav className="flex items-center gap-1 text-muted-foreground">
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3 opacity-50" />}
              <span className={cn(i === crumbs.length - 1 && "text-foreground")}>{c}</span>
            </span>
          ))}
        </nav>
      </div>

      {/* Search */}
      <div className="ml-auto flex w-full max-w-sm items-center">
        <div className="group relative w-full">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search depos, handlers, reports…"
            className="h-8 w-full rounded-md border border-border bg-surface pl-8 pr-12 text-[12.5px] text-foreground placeholder:text-muted-foreground/70 focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
          <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px] text-muted-foreground">
            ⌘K
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={toggle}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </button>
        <Link
          to="/notifications"
          className="relative flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Bell className="h-3.5 w-3.5" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary ring-2 ring-background" />
        </Link>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ml-1 flex items-center gap-2 rounded-md border border-border bg-surface px-1.5 py-1 pr-2 hover:border-border-strong">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/15 text-[10px] font-semibold text-primary">
                {userInitials}
              </div>
              <div className="hidden text-left leading-tight md:block">
                <div className="text-[11.5px] font-medium">{user?.name || "Guest"}</div>
                <div className="text-[10px] text-muted-foreground capitalize">
                  {user?.role.replace("_", " ") || "Member"}
                </div>
              </div>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-lg">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.name}</p>
                <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/settings" className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/settings" className="cursor-pointer">
                <SettingsIcon className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button 
                  className="flex w-full cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm text-destructive outline-none transition-colors hover:bg-destructive/10 focus:bg-destructive/10"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-[360px]">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-lg">Sign out?</AlertDialogTitle>
                  <AlertDialogDescription className="text-sm">
                    Are you sure you want to sign out of your session? You will need to sign in again to access your dashboard.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-4 gap-2">
                  <AlertDialogCancel className="h-9 text-sm">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => logout()}
                    className="h-9 bg-destructive text-sm text-destructive-foreground hover:bg-destructive/90"
                  >
                    Sign out
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
