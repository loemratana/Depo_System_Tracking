import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, Filter, Search, Shield, Database, Server, KeyRound } from "lucide-react";
import { PageHeader, Surface, FilterChip, StatusBadge } from "@/components/ui-kit";
import { activity } from "@/features/_data/mock";

export const Route = createFileRoute("/activity")({
  head: () => ({
    meta: [
      { title: "Activity Log — Brand Depot" },
      { name: "description", content: "Audit trail of system, security, and data events with expandable payload detail." },
    ],
  }),
  component: ActivityPage,
});

const catIcon = {
  auth: KeyRound,
  data: Database,
  security: Shield,
  system: Server,
} as const;
const catTone = {
  auth: "info",
  data: "default",
  security: "warning",
  system: "muted",
} as const;

function ActivityPage() {
  const [open, setOpen] = React.useState<string | null>("a1");
  const [filter, setFilter] = React.useState<string>("all");

  const list = activity.filter((e) => filter === "all" || e.category === filter);

  return (
    <>
      <PageHeader title="Activity log" description="Immutable audit stream — every action, identity, and signal." />

      <Surface padded={false}>
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Filter by actor, action, target…"
              className="h-8 w-full rounded-md border border-border bg-surface pl-8 pr-3 text-[12.5px] focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>All</FilterChip>
            <FilterChip active={filter === "auth"} onClick={() => setFilter("auth")}>Auth</FilterChip>
            <FilterChip active={filter === "data"} onClick={() => setFilter("data")}>Data</FilterChip>
            <FilterChip active={filter === "security"} onClick={() => setFilter("security")}>Security</FilterChip>
            <FilterChip active={filter === "system"} onClick={() => setFilter("system")}>System</FilterChip>
          </div>
          <button className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2 py-1.5 text-[11.5px] text-muted-foreground hover:text-foreground">
            <Filter className="h-3 w-3" /> Advanced
          </button>
        </div>

        <ul className="divide-y divide-border font-mono text-[12px]">
          {list.map((e) => {
            const Icon = catIcon[e.category];
            const isOpen = open === e.id;
            return (
              <li key={e.id}>
                <button
                  onClick={() => setOpen(isOpen ? null : e.id)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/30"
                >
                  {isOpen ? (
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  )}
                  <span className="w-12 text-muted-foreground tabular-nums">{e.ts}</span>
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-muted">
                    <Icon className="h-3 w-3 text-muted-foreground" />
                  </span>
                  <StatusBadge tone={catTone[e.category]}>{e.category}</StatusBadge>
                  <span className="font-sans text-foreground">{e.actor}</span>
                  <span className="font-sans text-muted-foreground">{e.action}</span>
                  <span className="font-sans text-foreground/90">{e.target}</span>
                  <span className="ml-auto text-muted-foreground">{e.ip}</span>
                </button>
                {isOpen && (
                  <div className="border-t border-border bg-muted/20 px-12 py-3 text-[11.5px]">
                    <pre className="whitespace-pre-wrap text-muted-foreground">
                      {JSON.stringify(
                        {
                          event_id: e.id,
                          actor: e.actor,
                          action: e.action,
                          target: e.target,
                          category: e.category,
                          ip: e.ip,
                          timestamp: `2026-05-12T${e.ts}:00Z`,
                          request_id: `req_${e.id}_8c4f`,
                          user_agent: "BrandDepot-Mobile/4.1.2 (iOS 17)",
                        },
                        null,
                        2,
                      )}
                    </pre>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Surface>
    </>
  );
}
