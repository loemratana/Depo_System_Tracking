import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { KpiCard } from "../features/dasbhaordKpi/ui/KpiCard"; // <-- existing KpiCard
import { useDashboard } from "../features/dasbhaordKpi/hook/useDashboard"; // adjust path
import { Skeleton } from "@/components/ui/skeleton";
import { DateRangePicker, type MonthFilterValue } from "../components/ui/DateRangePicker";
import { MonthlyAssignmentChart } from "../components/charts/MonthlyAssignmentChart";

import {
  Warehouse,
  Users,
  MapPin,
  Package,
  Clock,
  ArrowUpRight,
  Download,
} from "lucide-react";
import { PageHeader, Surface, SectionTitle, StatusBadge } from "@/components/ui-kit";
import { visits } from "@/features/_data/mock";
import { useState, useEffect } from "react";
import {
  fetchAssignmentTrend,
  fetchBrandDistribution,
} from "@/features/dasbhaordKpi/services/dashboardService";
import { BrandPieChart } from "@/components/charts/BrandPieChart";
import type { BrandDistributionItem } from "@/features/dasbhaordKpi/types/dashboard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Brand Depot" },
      {
        name: "description",
        content: "Real-time overview of depots, handlers, and field visits across regions.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { data, loading, error, refetch } = useDashboard();
  const formatNumber = (num: number) => num.toLocaleString();

  const now = new Date();
  const [monthFilter, setMonthFilter] = useState<MonthFilterValue>({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  });
  const [brandRows, setBrandRows] = useState<BrandDistributionItem[]>([]);
  const [brandLoading, setBrandLoading] = useState(true);
  const [brandError, setBrandError] = useState<string | null>(null);

  // State for assignment trend
  const [trendLoading, setTrendLoading] = useState(true);
  const [trendError, setTrendError] = useState<unknown>(null);

  // Fetch assignment trend on mount
  useEffect(() => {
    const loadTrend = async () => {
      try {
        setTrendLoading(true);
        await fetchAssignmentTrend();
        setTrendError(null);
      } catch (err) {
        console.error("Failed to load assignment trend:", err);
        setTrendError(err);
      } finally {
        setTrendLoading(false);
      }
    };
    loadTrend();
  }, []);

  // Brand distribution — refetch when monthly filter changes
  useEffect(() => {
    let cancelled = false;
    const loadBrands = async () => {
      try {
        setBrandLoading(true);
        setBrandError(null);
        const result = await fetchBrandDistribution(monthFilter.year, monthFilter.month);
        if (!cancelled) setBrandRows(result.brands);
      } catch (err) {
        console.error("Failed to load brand distribution:", err);
        if (!cancelled) {
          setBrandError(err instanceof Error ? err.message : "Failed to load brand distribution");
          setBrandRows([]);
        }
      } finally {
        if (!cancelled) setBrandLoading(false);
      }
    };
    loadBrands();
    return () => {
      cancelled = true;
    };
  }, [monthFilter.year, monthFilter.month]);

  const brandPieData = brandRows.map((b) => ({
    name: b.name,
    depotCount: b.depotCount,
    productQuantity: b.productQuantity,
    stockQuantity: b.stockQuantity,
  }));

  // Transform for chart
  const chartData = [
    { name: "Jan", assignments: 4000, completed: 2400 },
    { name: "Feb", assignments: 3000, completed: 1398 },
    { name: "Mar", assignments: 2000, completed: 9800 },
    { name: "Apr", assignments: 2780, completed: 3908 },
    { name: "May", assignments: 1890, completed: 4800 },
    { name: "Jun", assignments: 2390, completed: 3800 },
  ];

  const monthMeta = new Date(monthFilter.year, monthFilter.month - 1).toLocaleString("en-US", {
    month: "short",
    year: "numeric",
  });

  return (
    <>
      <PageHeader
        title="Operations overview"
        className="p-4"
        description="Live signal across depots, handlers, and field visits — updated 2 minutes ago."
        actions={
          <>
            <DateRangePicker value={monthFilter} onChange={setMonthFilter} />
            <button className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-[12px] font-medium text-foreground hover:border-border-strong">
              <Download className="h-3 w-3" /> Export
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5 ">
        {/* 1. Brand Depots */}
        {loading ? (
          <Skeleton className="h-28 w-full rounded-lg" />
        ) : (
          <KpiCard
            label="Brand Depots"
            value={data ? formatNumber(data.brandDepots) : "—"}
            delta="this month"
            trend="up"
            icon={Warehouse}
          />
        )}

        {/* 2. Handlers */}
        {loading ? (
          <Skeleton className="h-28 w-full rounded-lg" />
        ) : (
          <KpiCard
            label="Handlers"
            value={data ? formatNumber(data.handlers) : "—"}
            delta="this month"
            trend="up"
            icon={Users}
          />
        )}

        {/* 3. Total Brands */}
        {loading ? (
          <Skeleton className="h-28 w-full rounded-lg" />
        ) : (
          <KpiCard
            label="Total Brands"
            value={data ? formatNumber(data.expiredDepots) : "—"}
            delta="this month"
            trend="up"
            icon={MapPin}
          />
        )}

        {/* 4. AVG KPI Achievement (mock) */}
        <KpiCard
          label="AVG KPI Achievement"
          value="86%"
          delta="last month"
          trend="up"
          icon={Package}
        />

        {/* 5. Pending Assign (mock) */}
        <KpiCard
          label="Vacancy"
          value="47"
          delta="-12"
          trend="down"
          icon={Clock}
          hint="vacancy"
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
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">{/* ... */}</div>

      {/* Charts */}
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3 ">
        <Surface className="lg:col-span-2 dark:bg-gray-900">
          <SectionTitle
            title="Monthly Assignment"
            meta="last 6 months"
            action={
              <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span
                    className="h-1.5 w-3 rounded-sm"
                    style={{ background: "var(--color-primary)" }}
                  />
                  Assignments
                </span>
                <span className="flex items-center gap-1.5">
                  <span
                    className="h-1.5 w-3 rounded-sm"
                    style={{ background: "var(--color-chart-2)" }}
                  />
                  Completed
                </span>
              </div>
            }
          />
          <div className="h-[230px]">
            <MonthlyAssignmentChart
              data={chartData}
              loading={trendLoading}
              error={trendError ? "Failed to load trend data." : null}
            />
          </div>
        </Surface>

        <Surface className="dark:bg-gray-900">
          <SectionTitle
            title="Brand Distribution"
            meta={monthMeta}
            action={
              <a className="text-[11px] text-primary hover:underline" href="/brands">
                View all <ArrowUpRight className="inline h-3 w-3" />
              </a>
            }
          />
          {brandError ? (
            <p className="px-1 py-8 text-center text-[12px] text-red-600">{brandError}</p>
          ) : (
            <BrandPieChart
              data={brandPieData}
              loading={brandLoading}
            />
          )}
        </Surface>

        
      </div>

      {/* <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3 ">
        <Surface className="lg:col-span-2 dark:bg-gray-900">
          <SectionTitle title="Product coverage trend" meta="6 weeks" />
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">

              <ProductSalesChart
                data={dailySales}
                loading={dailyLoading}
                title="Sales by Day"
              />

            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex items-center gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-3 rounded-sm bg-primary" /> Core
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-3 rounded-sm bg-chart-2" /> Premium
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-3 rounded-sm bg-chart-3" /> Seasonal
            </span>
          </div>
        </Surface>
      </div> */}

      {/* Active visits */}
      {/* <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.05 }}
      >
        <Surface className="mt-3 dark:bg-gray-900">
          <SectionTitle
            title="Active field visits"
            meta="updated just now"
            action={
              <a className="text-[11px] text-primary hover:underline" href="/visits">
                Open visits
              </a>
            }
          />
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
                {visits
                  .filter((v) => v.status === "active" || v.status === "scheduled")
                  .map((v) => (
                    <tr
                      key={v.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-3 py-2 text-foreground">{v.depo}</td>
                      <td className="px-3 py-2 text-foreground/80">{v.handler}</td>
                      <td className="px-3 py-2 text-muted-foreground">{v.region}</td>
                      <td className="px-3 py-2 text-muted-foreground">{v.startedAt}</td>
                      <td className="px-3 py-2">
                        {v.gps ? (
                          <StatusBadge tone="success" dot>
                            verified
                          </StatusBadge>
                        ) : (
                          <StatusBadge tone="muted">pending</StatusBadge>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {v.status === "active" ? (
                          <StatusBadge tone="info" dot>
                            active
                          </StatusBadge>
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
      </motion.div> */}
    </>
  );
}
