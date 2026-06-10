import { createFileRoute } from "@tanstack/react-router";
import { Bell, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { PageHeader, Surface, SectionTitle, StatusBadge } from "@/components/ui-kit";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Brand Depot" },
      { name: "description", content: "System notifications, alerts, and operational signals." },
    ],
  }),
  component: NotificationsPage,
});

const items = [
  { id: "n1", icon: AlertTriangle, tone: "warning" as const, title: "Helix Outpost — failed visit", body: "Mikael Brandt reported the site closed at arrival.", ts: "08:11", unread: true },
  { id: "n2", icon: Info, tone: "info" as const, title: "Q3 regional report ready", body: "Auto-generated and distributed to 12 stakeholders.", ts: "07:00", unread: true },
  { id: "n3", icon: CheckCircle2, tone: "success" as const, title: "Coverage threshold restored", body: "Region: West returned above 70% coverage.", ts: "Yesterday", unread: true },
  { id: "n4", icon: Info, tone: "muted" as const, title: "Maintenance window scheduled", body: "Sunday 02:00–02:30 UTC. Expect brief read-only mode.", ts: "2d ago", unread: false },
  { id: "n5", icon: AlertTriangle, tone: "warning" as const, title: "API key rotation required", body: "Service account `depot-sync` key expires in 5 days.", ts: "3d ago", unread: false },
];

function NotificationsPage() {
  return (
    <>
      <PageHeader
        title="Notifications"
        description="Operational alerts and system events delivered to your console."
        actions={
          <button className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-[12px] text-foreground hover:border-border-strong">
            Mark all read
          </button>
        }
      />

      <Surface padded={false}>
        <div className="border-b border-border px-4 py-3">
          <SectionTitle title="Inbox" meta={`${items.filter((i) => i.unread).length} unread`} />
        </div>
        <ul className="divide-y divide-border">
          {items.map((n) => {
            const Icon = n.icon;
            return (
              <li key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20">
                <div className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-md ${
                  n.tone === "warning" ? "bg-warning/10 text-warning" :
                  n.tone === "success" ? "bg-success/10 text-success" :
                  n.tone === "info" ? "bg-primary/10 text-primary" :
                  "bg-muted text-muted-foreground"
                }`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-foreground">{n.title}</span>
                    {n.unread && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                  </div>
                  <div className="mt-0.5 text-[12px] text-muted-foreground">{n.body}</div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className="text-[11px] text-muted-foreground">{n.ts}</span>
                  <StatusBadge tone={n.tone}>{n.tone}</StatusBadge>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="flex items-center justify-center border-t border-border p-3">
          <button className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground">
            <Bell className="h-3 w-3" /> View archive
          </button>
        </div>
      </Surface>
    </>
  );
}
