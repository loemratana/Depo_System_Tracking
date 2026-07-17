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
  Settings as SettingsIcon,
} from "lucide-react";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { UserAvatar } from "@/components/ui/user-avatar";
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
  profile: "Profile",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  manager: "Manager",
  field_agent: "Field Agent",
  viewer: "Viewer",
};

export function AppHeader() {
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const segments = pathname.split("/").filter(Boolean);
  const crumbs = segments.length === 0 ? ["Dashboard"] : segments.map((s) => LABELS[s] ?? s);

  const roleLabel = user?.role ? (ROLE_LABELS[user.role] ?? user.role.replace("_", " ")) : "Member";

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border/80 bg-background/90 px-5 backdrop-blur-md">
      <div className="flex min-w-0 items-center gap-2 text-[13px]">
        <button className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-600 text-[10px] font-bold text-white">
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
              <span className={cn(i === crumbs.length - 1 && "font-medium text-foreground")}>
                {c}
              </span>
            </span>
          ))}
        </nav>
      </div>

      <div className="ml-auto flex w-full max-w-sm items-center">
        <div className="group relative w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search depos, handlers, reports…"
            className="h-9 w-full rounded-lg border border-border/70 bg-surface pl-9 pr-12 text-[12.5px] text-foreground shadow-sm placeholder:text-muted-foreground/70 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            ⌘K
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={toggle}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <Link
          to="/notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-background" />
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ml-1 flex items-center gap-2.5 rounded-lg border border-border/70 bg-card py-1 pl-1 pr-2.5 shadow-sm transition-all hover:border-blue-500/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30">
              <UserAvatar
                src={user?.avatar}
                name={user?.name}
                email={user?.email}
                id={user?.id}
                size="sm"
              />
              <div className="hidden text-left leading-tight md:block">
                <div className="max-w-[120px] truncate text-xs font-semibold text-foreground">
                  {user?.name || "Guest"}
                </div>
                <div className="max-w-[120px] truncate text-[10px] capitalize text-muted-foreground">
                  {roleLabel}
                </div>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-72 rounded-xl p-0 shadow-lg">
            <div className="border-b border-border/70 bg-gradient-to-br from-blue-600 to-sky-600 px-4 py-4">
              <div className="flex items-center gap-3">
                <UserAvatar
                  src={user?.avatar}
                  name={user?.name}
                  email={user?.email}
                  id={user?.id}
                  size="lg"
                  className="border-2 border-white/30 shadow-md"
                  fallbackClassName="bg-white/20 backdrop-blur"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{user?.name || "Guest"}</p>
                  <p className="truncate text-xs text-blue-100">{user?.email}</p>
                  <div className="mt-1.5">
                    <span className="inline-flex rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                      {roleLabel}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-1.5">
              <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Account
              </DropdownMenuLabel>
              <DropdownMenuItem asChild className="cursor-pointer rounded-lg">
                <Link to="/profile" className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600">
                    <User className="h-3.5 w-3.5 text-white" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">My Profile</p>
                    <p className="text-[10px] text-muted-foreground">View and edit your profile</p>
                  </div>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer rounded-lg">
                <Link to="/settings" className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-600">
                    <SettingsIcon className="h-3.5 w-3.5 text-white" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">Settings</p>
                    <p className="text-[10px] text-muted-foreground">Preferences and notifications</p>
                  </div>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="my-1" />

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm text-red-600 outline-none transition-colors hover:bg-red-50 focus:bg-red-50 dark:hover:bg-red-950/30">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-red-600">
                      <LogOut className="h-3.5 w-3.5 text-white" />
                    </span>
                    <div className="text-left">
                      <p className="font-medium">Sign out</p>
                      <p className="text-[10px] text-muted-foreground">End your current session</p>
                    </div>
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-w-[380px] rounded-xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Sign out?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to sign out? You'll need to sign in again to access your
                      dashboard.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="gap-2">
                    <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => logout()}
                      className="rounded-lg bg-red-600 hover:bg-red-700"
                    >
                      Sign out
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {user?.lastLogin && (
              <div className="border-t border-border/70 px-4 py-2 text-center text-[10px] text-muted-foreground">
                Last login: {new Date(user.lastLogin).toLocaleString()}
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
