import React from "react";
import {
  LayoutGrid,
  CalendarCheck,
  CheckCircle2,
  BarChart3,
  Map,
  Clock,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  trend?: {
    value: string;
    positive: boolean;
  };
  icon: React.ReactNode;
}

const KPICard: React.FC<KPICardProps> = ({ title, value, trend, icon }) => (
  <Card className="shadow-none border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden">
    <CardContent className="p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="p-1.5 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-zinc-400">
          {icon}
        </div>
        {trend && (
          <div
            className={cn(
              "flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter",
              trend.positive
                ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10"
                : "text-amber-600 bg-amber-50 dark:bg-amber-500/10",
            )}
          >
            <TrendingUp className={cn("h-2.5 w-2.5", !trend.positive && "rotate-180")} />
            {trend.value}
          </div>
        )}
      </div>
      <div className="space-y-0.5">
        <p className="text-[9px] font-black uppercase tracking-[0.15em] text-zinc-400 dark:text-zinc-500">
          {title}
        </p>
        <h3 className="text-[18px] font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          {value}
        </h3>
      </div>
    </CardContent>
  </Card>
);

interface EmployeeKPIData {
  employeeId: number;
  employeeName: string;
  totalDepots: number;
  expiredDepots: number;
  performanceScore:number;
  coverage:number;
}

interface Props {
  data: EmployeeKPIData;
}

export const EmployeeKPIs: React.FC<Props> = ({ data }) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard
  title="Total Depots"
  value={data.totalDepots}
  icon={<LayoutGrid className="h-3.5 w-3.5" />}
/>
<KPICard
  title="Expired Depots"
  value={data.expiredDepots}
  icon={<CalendarCheck className="h-3.5 w-3.5" />}
/>
    
      <KPICard
        title="Perf. Score"
        value={`${data.performanceScore}/100`}
        icon={<BarChart3 className="h-3.5 w-3.5" />}
      />
      <KPICard
        title="Coverage"
        value={`${data.coverage}%`}
        icon={<Map className="h-3.5 w-3.5" />}
      />
    </div>
  );
};
