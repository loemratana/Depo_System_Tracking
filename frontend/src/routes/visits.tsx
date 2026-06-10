import { createFileRoute } from "@tanstack/react-router";
import { Camera, MapPin, Navigation, Clock, CheckCircle2, XCircle, PlayCircle, CalendarClock } from "lucide-react";
import { PageHeader, Surface, SectionTitle, StatusBadge, KpiCard } from "@/components/ui-kit";
import { visits } from "@/features/_data/mock";

export const Route = createFileRoute("/visits")({
  head: () => ({
    meta: [
      { title: "Visits — Brand Depot" },
      { name: "description", content: "Track field visits with check-in, GPS verification, and visit evidence." },
    ],
  }),
  component: VisitsPage,
});

const iconFor = {
  active: PlayCircle,
  completed: CheckCircle2,
  failed: XCircle,
  scheduled: CalendarClock,
} as const;
const toneFor = {
  active: "info",
  completed: "success",
  failed: "danger",
  scheduled: "muted",
} as const;

function MapPlaceholder() {
  return (
    <div className="relative h-[280px] overflow-hidden rounded-md border border-border bg-surface">
      {/* subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      {/* region overlays */}
      <div className="absolute left-[12%] top-[18%] h-24 w-32 rounded-full bg-primary/10 blur-2xl" />
      <div className="absolute right-[18%] top-[40%] h-28 w-40 rounded-full bg-success/10 blur-2xl" />
      <div className="absolute bottom-[14%] left-[34%] h-20 w-28 rounded-full bg-warning/10 blur-2xl" />
      {/* markers */}
      {[
        { x: "22%", y: "28%", tone: "bg-primary" },
        { x: "44%", y: "52%", tone: "bg-primary" },
        { x: "62%", y: "34%", tone: "bg-success" },
        { x: "72%", y: "60%", tone: "bg-warning" },
        { x: "30%", y: "70%", tone: "bg-success" },
        { x: "55%", y: "20%", tone: "bg-primary" },
      ].map((m, i) => (
        <div key={i} className="absolute" style={{ left: m.x, top: m.y }}>
          <span className={`block h-2.5 w-2.5 rounded-full ${m.tone} ring-4 ring-background/60`} />
          <span className={`absolute inset-0 -m-1 animate-ping rounded-full ${m.tone} opacity-30`} />
        </div>
      ))}
      <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-md border border-border bg-background/70 px-2 py-1 text-[11px] text-muted-foreground backdrop-blur">
        <Navigation className="h-3 w-3" /> Field map · live
      </div>
    </div>
  );
}

function VisitsPage() {
  const ordered = [...visits].sort((a, b) => a.startedAt.localeCompare(b.startedAt));

  return (
    <>
      <PageHeader
        title="Visit tracking"
        description="Live timeline of field visits with check-in, GPS verification, and evidence."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Active now" value="2" icon={PlayCircle} hint="2 handlers in field" />
        <KpiCard label="Completed today" value="12" delta="+3" trend="up" icon={CheckCircle2} />
        <KpiCard label="Failed" value="1" trend="down" delta="-2" icon={XCircle} />
        <KpiCard label="Avg duration" value="52m" icon={Clock} />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Surface className="lg:col-span-2">
          <SectionTitle title="Field map" meta="real-time positions" />
          <MapPlaceholder />
        </Surface>

        <Surface>
          <SectionTitle title="Today's timeline" />
          <ol className="relative space-y-3 pl-4">
            <span className="absolute left-[7px] top-1.5 bottom-1.5 w-px bg-border" />
            {ordered.map((v) => {
              const Icon = iconFor[v.status];
              return (
                <li key={v.id} className="relative">
                  <span className="absolute -left-4 top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-border bg-background">
                    <span className={`h-1.5 w-1.5 rounded-full ${
                      v.status === "active" ? "bg-primary" :
                      v.status === "completed" ? "bg-success" :
                      v.status === "failed" ? "bg-destructive" : "bg-muted-foreground/50"
                    }`} />
                  </span>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-foreground">
                        <Icon className="h-3 w-3 text-muted-foreground" />
                        <span className="truncate">{v.depo}</span>
                      </div>
                      <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                        {v.handler} · {v.region} · {v.startedAt}
                      </div>
                    </div>
                    <StatusBadge tone={toneFor[v.status]} dot>{v.status}</StatusBadge>
                  </div>
                </li>
              );
            })}
          </ol>
        </Surface>
      </div>

      <Surface className="mt-3">
        <SectionTitle title="Recent visits" meta="evidence & verification" />
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full text-[12.5px]">
            <thead className="bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left font-medium">Depo</th>
                <th className="px-3 py-2 text-left font-medium">Handler</th>
                <th className="px-3 py-2 text-left font-medium">Started</th>
                <th className="px-3 py-2 text-left font-medium">Duration</th>
                <th className="px-3 py-2 text-left font-medium">GPS</th>
                <th className="px-3 py-2 text-left font-medium">Evidence</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {visits.map((v) => (
                <tr key={v.id} className="border-b border-border/70 last:border-0 hover:bg-muted/30">
                  <td className="px-3 py-2 text-foreground">{v.depo}</td>
                  <td className="px-3 py-2 text-foreground/80">{v.handler}</td>
                  <td className="px-3 py-2 text-muted-foreground">{v.startedAt}</td>
                  <td className="px-3 py-2 text-muted-foreground">{v.duration}</td>
                  <td className="px-3 py-2">
                    {v.gps ? (
                      <span className="inline-flex items-center gap-1 text-success"><MapPin className="h-3 w-3" /> verified</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-muted-foreground"><MapPin className="h-3 w-3" /> none</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Camera className="h-3 w-3" /> 3 photos</span>
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge tone={toneFor[v.status]} dot>{v.status}</StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Surface>
    </>
  );
}
