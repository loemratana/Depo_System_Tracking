import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis, ResponsiveContainer } from 'recharts';

interface ChartDataPoint {
  name: string;
  assignments: number;
  completed: number;
}

interface MonthlyAssignmentChartProps {
  data: ChartDataPoint[];
  loading?: boolean;
  error?: string | null;
}

export function MonthlyAssignmentChart({ data, loading, error }: MonthlyAssignmentChartProps) {
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-32 w-full animate-pulse rounded bg-muted/30" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-red-500">
        {error}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="gradientAssignments" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.22} />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradientCompleted" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.22} />
            <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="name"
          stroke="var(--color-muted-foreground)"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="var(--color-muted-foreground)"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--color-card)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-foreground)',
            fontSize: 12,
          }}
          cursor={{ stroke: 'var(--color-border-strong)' }}
        />
        <Area
          type="monotone"
          dataKey="assignments"
          stroke="var(--color-primary)"
          strokeWidth={1.5}
          fill="url(#gradientAssignments)"
          fillOpacity={1}
        />
        <Area
          type="monotone"
          dataKey="completed"
          stroke="var(--color-chart-2)"
          strokeWidth={1.5}
          fill="url(#gradientCompleted)"
          fillOpacity={1}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}