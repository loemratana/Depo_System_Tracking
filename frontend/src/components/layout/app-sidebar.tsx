import * as React from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Warehouse,
  MapPin,
  Package,
  Users,
  FileBarChart2,
  LineChart,
  History,
  Bell,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  Command,
  Layers,
  Tags,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string };

const PRIMARY: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/brands", label: "Brands", icon: Tags },
  { to: "/depos", label: "Brand Depos", icon: Warehouse },
  { to: "/geography", label: "Geography", icon: MapPin },

  { to: "/products", label: "Products", icon: Package },

  // { to: "/handlers", label: "Handlers", icon: Users },
  { to: "/employees", label: "Employees", icon: Users },
  { to: "/visits", label: "Visits", icon: MapPin},
];

const INSIGHTS: NavItem[] = [
  { to: "/reports", label: "Reports", icon: FileBarChart2 },
  { to: "/analytics", label: "Analytics", icon: LineChart },
];

// SYSTEM holds administrative or diagnostic operations like Bulk Import/Export, settings, etc.
const SYSTEM: NavItem[] = [
  { to: "/bulk-operations", label: "Bulk Operations", icon: Layers },
  { to: "/activity", label: "Activity Log", icon: History },
  { to: "/notifications", label: "Notifications", icon: Bell, badge: "3" },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const Section = ({ title, items }: { title: string; items: NavItem[] }) => (
    <div className="px-2">
      {!collapsed && (
        <div className="px-2 pt-4 pb-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">
          {title}
        </div>
      )}
      <ul className="space-y-0.5">
        {items.map((item) => {
          const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                className={cn(
                  "group relative flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-r bg-primary" />
                )}
                <Icon className={cn("h-[15px] w-[15px] shrink-0", active ? "text-foreground" : "text-muted-foreground")} />
                {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                {!collapsed && item.badge && (
                  <span className="rounded bg-muted px-1.5 py-px text-[10px] font-medium text-muted-foreground">
                    {item.badge}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-out",
        collapsed ? "w-[60px]" : "w-[232px]",
      )}
    >
      {/* Brand */}
      <div className={cn("flex h-14 items-center border-b border-sidebar-border", collapsed ? "justify-center px-2" : "px-4")}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-md ring-1 ring-primary/20">
            <img
              src="../image/gb-logo-Photoroom.png"
              alt="Logo"
              className="h-full w-full object-cover"
            />
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="text-[13px] font-semibold tracking-tight">Brand Depot</div>
              <div className="text-[10px] text-muted-foreground">Field Operations</div>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        <Section title="Workspace" items={PRIMARY} />
        <Section title="Insights" items={INSIGHTS} />
        <Section title="System" items={SYSTEM} />
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-2">
        {!collapsed ? (
          <div className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Command className="h-3 w-3" />
              <span>K to search</span>
            </div>
            <button
              onClick={onToggle}
              className="rounded p-1 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              aria-label="Collapse sidebar"
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={onToggle}
            className="flex w-full items-center justify-center rounded p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
            aria-label="Expand sidebar"
          >
            <ChevronsRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </aside>
  );
}
