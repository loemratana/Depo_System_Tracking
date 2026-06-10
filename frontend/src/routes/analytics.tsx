import { createFileRoute } from "@tanstack/react-router";
import {
  Area, AreaChart, CartesianGrid, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis, RadialBar, RadialBarChart, PolarAngleAxis,
} from "recharts";
import { PageHeader, Surface, SectionTitle, KpiCard } from "@/components/ui-kit";
import { productCoverage, visitTrend } from "@/features/_data/mock";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Brand Depot" },
      { name: "description", content: "Deep performance analytics across visits, regions, and products." },
    ],
  }),
  component: AnalyticsPage,
});

const tooltipStyle = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: 6, padding: "8px 10px", fontSize: 11.5,
  color: "var(--color-popover-foreground)",
};

const radial = [
  { name: "North", value: 84, fill: "var(--color-primary)" },
  { name: "Central", value: 93, fill: "var(--color-chart-2)" },
  { name: "South", value: 79, fill: "var(--color-chart-3)" },
  { name: "East", value: 81, fill: "var(--color-chart-4)" },
  { name: "West", value: 71, fill: "var(--color-chart-5)" },
];

function AnalyticsPage() {
  return (
    <>
      <PageHeader title="Analytics" description="Operational performance signals across regions, handlers, and products." />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Visit success rate" value="94.2%" delta="+0.8pp" trend="up" />
        <KpiCard label="Avg handler load" value="5.4 / day" delta="+0.2" trend="up" />
        <KpiCard label="Failed visits" value="1.6%" delta="-0.4pp" trend="down" />
        <KpiCard label="SLA adherence" value="98.1%" delta="stable" trend="flat" />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Surface className="lg:col-span-2">
          <SectionTitle title="Visit performance" meta="rolling 7-day" />
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={visitTrend} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="ag1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" stroke="var(--color-muted-foreground)" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={36} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "var(--color-border-strong)" }} />
                <Area type="monotone" dataKey="visits" stroke="var(--color-primary)" strokeWidth={1.5} fill="url(#ag1)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Surface>

        <Surface>
          <SectionTitle title="Regional health" />
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart innerRadius="35%" outerRadius="100%" data={radial} startAngle={90} endAngle={-270}>
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar background dataKey="value" cornerRadius={4} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconSize={6} wrapperStyle={{ fontSize: 11, color: "var(--color-muted-foreground)" }} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
        </Surface>
      </div>

      <Surface className="mt-3">
        <SectionTitle title="Product coverage by line" meta="6-week trend" />
        <div className="h-[260px]">
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
      </Surface>
    </>
  );
}
