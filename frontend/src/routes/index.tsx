import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { KpiCard } from "../features/dasbhaordKpi/ui/KpiCard";        // <-- existing KpiCard
import { useDashboard } from "../features/dasbhaordKpi/hook/useDashboard"; // adjust path
import { Skeleton } from "@/components/ui/skeleton";
import { DateRangePicker } from "../components/ui/DateRangePicker";
import {
  Warehouse,
  Users,
  MapPin,
  Package,
  Clock,
  Globe2,
  ArrowUpRight,
  Filter,
  Download,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader, Surface, SectionTitle, StatusBadge, FilterChip } from "@/components/ui-kit";
import { activity, regionalCoverage, visitTrend, productCoverage, visits } from "@/features/_data/mock";
import { useState, useEffect } from "react";
import { fetchAssignmentTrend } from "@/features/dasbhaordKpi/services/dashboardService";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Brand Depot" },
      { name: "description", content: "Real-time overview of depots, handlers, and field visits across regions." },
    ],
  }),
  component: DashboardPage,
});

const tooltipStyle = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: 6,
  padding: "8px 10px",
  boxShadow: "0 4px 12px -4px rgba(0,0,0,.12)",
  fontSize: 11.5,
  color: "var(--color-popover-foreground)",
};

function DashboardPage() {
  const { data, loading, error, refetch } = useDashboard();
  const formatNumber = (num: number) => num.toLocaleString();


  // State for assignment trend
  const [assignmentTrend, setAssignmentTrend] = useState([]);
  const [trendLoading, setTrendLoading] = useState(true);
  const [trendError, setTrendError] = useState(null);

  // Fetch assignment trend on mount
  useEffect(() => {
    const loadTrend = async () => {
      try {
        setTrendLoading(true);
        const trendData = await fetchAssignmentTrend();
        setAssignmentTrend(trendData);
        setTrendError(null);
      } catch (err) {
        console.error('Failed to load assignment trend:', err);
        setTrendError(err);
      } finally {
        setTrendLoading(false);
      }
    };
    loadTrend();
  }, []);

  // Transform for chart
  const chartData = assignmentTrend.map(item => ({
    day: item.month,
    assignment: item.count,
    completed: 0,
  }));





  return (
    <>
      <PageHeader
        title="Operations overview"
        description="Live signal across depots, handlers, and field visits — updated 2 minutes ago."
        actions={
          <>
            <DateRangePicker />
            <button className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-[12px] font-medium text-foreground hover:border-border-strong">
              <Download className="h-3 w-3" /> Export
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {/* 1. Brand Depots */}
        {loading ? (
          <Skeleton className="h-28 w-full rounded-lg" />
        ) : (
          <KpiCard
            label="Brand Depots"
            value={data ? formatNumber(data.brandDepots) : '—'}
            icon={Warehouse}
          />
        )}

        {/* 2. Handlers */}
        {loading ? (
          <Skeleton className="h-28 w-full rounded-lg" />
        ) : (
          <KpiCard
            label="Handlers"
            value={data ? formatNumber(data.handlers) : '—'}
            icon={Users}
          />
        )}

        {/* 3. Expired Depots */}
        {loading ? (
          <Skeleton className="h-28 w-full rounded-lg" />
        ) : (
          <KpiCard
            label="Expired Depots"
            value={data ? formatNumber(data.expiredDepots) : '—'}
            icon={MapPin}
          />
        )}

        {/* 4. Product Coverage (mock) */}
        <KpiCard
          label="Product Coverage"
          value="86%"
          delta="+0.9pp"
          trend="up"
          icon={Package}
        />

        {/* 5. Pending Assign (mock) */}
        <KpiCard
          label="Pending Assign"
          value="47"
          delta="-12"
          trend="down"
          icon={Clock}
          hint="below threshold"
        />
      </div>

      {/* Show error message with retry if API fails */}
      {error && (
        <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          Failed to load metrics: {error.message}
          <button onClick={refetch} className="ml-3 underline">
            Retry
          </button>
        </div>
      )}

      {/* Rest of your dashboard (charts, tables, etc.) remains unchanged */}
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
        {/* ... */}
      </div>

      {/* Charts */}
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Surface className="lg:col-span-2">
          <SectionTitle
            title="Monthly Assignment"
            meta="last 6 months"   // ← changed from "last 7 days"
            action={
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-3 rounded-sm bg-primary" /> Total assignments
                </span>
                {/* Remove Completed legend if not available */}
              </div>
            }
          />
          <div className="h-[230px]">
            {trendLoading ? (
              <div className="flex h-full items-center justify-center">
                <Skeleton className="h-32 w-full" />
              </div>
            ) : trendError ? (
              <div className="flex h-full items-center justify-center text-xs text-red-500">
                Failed to load trend data.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" stroke="var(--color-muted-foreground)" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--color-muted-foreground)" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "var(--color-border-strong)" }} />
                  <Area type="monotone" dataKey="assignment" stroke="var(--color-primary)" strokeWidth={1.5} fill="url(#g1)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Surface>

        <Surface>
          <SectionTitle title="Regional coverage" meta="this quarter" />
          <div className="h-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regionalCoverage} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="region" stroke="var(--color-muted-foreground)" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={36} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--color-muted)" }} />
                <Bar dataKey="coverage" fill="var(--color-primary)" radius={[3, 3, 0, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Surface>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Surface className="lg:col-span-2">
          <SectionTitle title="Product coverage trend" meta="6 weeks" />
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={productCoverage} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="week" stroke="var(--color-muted-foreground)" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={36} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "var(--color-border-strong)" }} />
                <Line type="monotone" dataKey="core" stroke="var(--color-primary)" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="premium" stroke="var(--color-chart-2)" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="seasonal" stroke="var(--color-chart-3)" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex items-center gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-3 rounded-sm bg-primary" /> Core</span>
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-3 rounded-sm bg-chart-2" /> Premium</span>
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-3 rounded-sm bg-chart-3" /> Seasonal</span>
          </div>
        </Surface>

        <Surface>
          <SectionTitle title="Live activity" action={<a className="text-[11px] text-primary hover:underline" href="/activity">View all <ArrowUpRight className="inline h-3 w-3" /></a>} />
          <ul className="-mx-1 max-h-[260px] space-y-px overflow-y-auto pr-1">
            {activity.slice(0, 6).map((e) => (
              <li
                key={e.id}
                className="rounded-md px-2 py-2 text-[12px] hover:bg-muted/60"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{e.actor}</span>
                  <span className="text-[10.5px] text-muted-foreground">{e.ts}</span>
                </div>
                <div className="text-muted-foreground">
                  {e.action} <span className="text-foreground/80">{e.target}</span>
                </div>
              </li>
            ))}
          </ul>
        </Surface>
      </div>

      {/* Active visits */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.05 }}
      >
        <Surface className="mt-3">
          <SectionTitle title="Active field visits" meta="updated just now" action={<a className="text-[11px] text-primary hover:underline" href="/visits">Open visits</a>} />
          <div className="overflow-hidden rounded-md border border-border">
            <table className="w-full text-[12px]">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left font-medium">Depo</th>
                  <th className="px-3 py-2 text-left font-medium">Handler</th>
                  <th className="px-3 py-2 text-left font-medium">Region</th>
                  <th className="px-3 py-2 text-left font-medium">Started</th>
                  <th className="px-3 py-2 text-left font-medium">GPS</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {visits.filter((v) => v.status === "active" || v.status === "scheduled").map((v) => (
                  <tr key={v.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-3 py-2 text-foreground">{v.depo}</td>
                    <td className="px-3 py-2 text-foreground/80">{v.handler}</td>
                    <td className="px-3 py-2 text-muted-foreground">{v.region}</td>
                    <td className="px-3 py-2 text-muted-foreground">{v.startedAt}</td>
                    <td className="px-3 py-2">
                      {v.gps ? <StatusBadge tone="success" dot>verified</StatusBadge> : <StatusBadge tone="muted">pending</StatusBadge>}
                    </td>
                    <td className="px-3 py-2">
                      {v.status === "active" ? (
                        <StatusBadge tone="info" dot>active</StatusBadge>
                      ) : (
                        <StatusBadge tone="default">scheduled</StatusBadge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Surface>
      </motion.div>
    </>
  );
}
