import { useEffect, useMemo, useRef } from "react";
import * as echarts from "echarts";
import { cn } from "@/lib/utils";

export type BrandPieDatum = {
  name: string;
  depotCount: number;
  productQuantity: number;
  stockQuantity?: number;
};

interface BrandPieChartProps {
  data: BrandPieDatum[];
  height?: number | string;
  className?: string;
  loading?: boolean;
}

const COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#ec489a",
  "#f43f5e",
  "#f97316",
  "#eab308",
  "#10b981",
  "#06b6d4",
  "#6366f1",
  "#d946ef",
];

const getCssVar = (varName: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || undefined;

const isDarkMode = () =>
  document.documentElement.classList.contains("dark") ||
  document.documentElement.getAttribute("data-theme") === "dark";

export function BrandPieChart({
  data,
  height = 280,
  className,
  loading = false,
}: BrandPieChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  const rows = useMemo(
    () =>
      data
        .map((item) => {
          const productQty =
            item.productQuantity > 0 ? item.productQuantity : (item.stockQuantity ?? 0);
          return {
            name: item.name,
            depotCount: item.depotCount,
            productQuantity: productQty,
            value: item.depotCount > 0 ? item.depotCount : productQty,
          };
        })
        .filter((d) => d.value > 0)
        .sort((a, b) => b.value - a.value),
    [data],
  );

  const buildOption = () => {
    const textColor = getCssVar("--foreground") || "#09090b";
    const mutedColor = getCssVar("--muted-foreground") || "#71717a";
    const cardColor = getCssVar("--card") || "#ffffff";
    const bgColor = getCssVar("--background") || "#ffffff";
    const borderColor = isDarkMode() ? "rgba(255,255,255,0.12)" : bgColor;

    return {
      tooltip: {
        trigger: "item",
        backgroundColor: cardColor,
        borderColor,
        borderWidth: 0.5,
        textStyle: { color: textColor, fontSize: 12 },
        formatter: (params: any) => {
          const d = params.data || {};
          return [
            `<strong>${params.name}</strong>`,
            `Depots: ${Number(d.depotCount ?? 0).toLocaleString()}`,
            `Product qty: ${Number(d.productQuantity ?? 0).toLocaleString()}`,
          ].join("<br/>");
        },
      },
      series: [
        {
          name: "Brand Distribution",
          type: "pie",
          radius: ["52%", "78%"],
          center: ["50%", "50%"],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 6,
            borderColor,
            borderWidth: 2,
          },
          label: { show: false },
          labelLine: { show: false },
          emphasis: {
            scale: true,
            scaleSize: 4,
          },
          data: rows,
          color: COLORS.map((c) => `${c}cc`),
        },
      ],
      graphic:
        rows.length === 0
          ? [
              {
                type: "text",
                left: "center",
                top: "middle",
                style: {
                  text: loading ? "Loading…" : "No data",
                  fill: mutedColor,
                  fontSize: 12,
                },
              },
            ]
          : [
              {
                type: "text",
                left: "center",
                top: "42%",
                style: {
                  text: String(rows.reduce((s, r) => s + r.depotCount, 0)),
                  fill: textColor,
                  fontSize: 20,
                  fontWeight: 600,
                  align: "center",
                },
              },
              {
                type: "text",
                left: "center",
                top: "54%",
                style: {
                  text: "depots",
                  fill: mutedColor,
                  fontSize: 11,
                  align: "center",
                },
              },
            ],
    };
  };

  useEffect(() => {
    if (!chartRef.current) return;
    chartInstance.current = echarts.init(chartRef.current);
    chartInstance.current.setOption(buildOption());
    const handleResize = () => chartInstance.current?.resize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      chartInstance.current?.dispose();
    };
  }, []);

  useEffect(() => {
    chartInstance.current?.setOption(buildOption(), true);
  }, [rows, loading]);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      chartInstance.current?.setOption(buildOption(), true);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });
    return () => observer.disconnect();
  }, [rows, loading]);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div ref={chartRef} className="mx-auto w-full max-w-[220px]" style={{ height: 180 }} />

      {rows.length > 0 && (
        <ul className="max-h-[120px] space-y-1.5 overflow-y-auto px-1">
          {rows.map((row, i) => (
            <li
              key={row.name}
              className="flex items-center justify-between gap-2 text-[11px] leading-none"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2 w-2 shrink-0 rounded-sm"
                  style={{ background: COLORS[i % COLORS.length] }}
                />
                <span className="truncate text-foreground">{row.name}</span>
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {row.depotCount.toLocaleString()} depots
                <span className="mx-1 opacity-40">·</span>
                {row.productQuantity.toLocaleString()} qty
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
