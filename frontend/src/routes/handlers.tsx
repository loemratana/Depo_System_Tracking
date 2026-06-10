import { createFileRoute } from "@tanstack/react-router";
import { MoreHorizontal, MessageSquare, MapPin } from "lucide-react";
import { PageHeader, Surface, SectionTitle, StatusBadge, KpiCard } from "@/components/ui-kit";
import { handlers } from "@/features/_data/mock";

export const Route = createFileRoute("/handlers")({
  head: () => ({
    meta: [
      { title: "Handlers — Brand Depot" },
      { name: "description", content: "Workforce management for field handlers — productivity, online status, and assignments." },
    ],
  }),
  component: HandlersPage,
});

function HandlersPage() {
  const online = handlers.filter((h) => h.online).length;
  const avgProd = Math.round(handlers.reduce((s, h) => s + h.productivity, 0) / handlers.length);

  return (
    <>
      <PageHeader title="Handlers" description="Field personnel, assignments, and live productivity signal." />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Total handlers" value={handlers.length} />
        <KpiCard label="Online now" value={online} delta={`${Math.round((online / handlers.length) * 100)}%`} trend="up" />
        <KpiCard label="Visits today" value={handlers.reduce((s, h) => s + h.visitsToday, 0)} />
        <KpiCard label="Avg productivity" value={`${avgProd}%`} delta="+1.2pp" trend="up" />
      </div>

      <Surface className="mt-3" padded={false}>
        <div className="border-b border-border px-4 py-3">
          <SectionTitle title="Personnel directory" meta={`${handlers.length} active`} />
        </div>
        <ul className="divide-y divide-border">
          {handlers.map((h) => (
            <li key={h.id} className="grid grid-cols-12 items-center gap-3 px-4 py-3 text-[12.5px] hover:bg-muted/20">
              <div className="col-span-4 flex items-center gap-3">
                <div className="relative">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-[11px] font-semibold text-primary ring-1 ring-primary/20">
                    {h.avatar}
                  </div>
                  <span
                    className={`absolute -right-0.5 -bottom-0.5 h-2 w-2 rounded-full ring-2 ring-card ${h.online ? "bg-success" : "bg-muted-foreground/40"
                      }`}
                  />
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-foreground">{h.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {h.online ? "Online" : "Offline"} · ID {h.id}
                  </div>
                </div>
              </div>
              <div className="col-span-2 flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="h-3 w-3" /> {h.region}
              </div>
              <div className="col-span-1 text-muted-foreground tabular-nums">{h.depos} depos</div>
              <div className="col-span-1 text-muted-foreground tabular-nums">{h.visitsToday} today</div>
              <div className="col-span-3 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full ${h.productivity >= 85 ? "bg-success" : h.productivity >= 65 ? "bg-primary" : "bg-warning"}`}
                    style={{ width: `${h.productivity}%` }}
                  />
                </div>
                <span className="w-10 text-right tabular-nums text-muted-foreground">{h.productivity}%</span>
              </div>
              <div className="col-span-1 flex items-center justify-end gap-1">
                <StatusBadge tone={h.productivity >= 85 ? "success" : h.productivity >= 65 ? "info" : "warning"}>
                  {h.productivity >= 85 ? "high" : h.productivity >= 65 ? "steady" : "watch"}
                </StatusBadge>
                <button className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                  <MessageSquare className="h-3.5 w-3.5" />
                </button>
                <button className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </Surface>
    </>
  );
}
