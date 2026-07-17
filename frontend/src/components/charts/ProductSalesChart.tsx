import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface ChartData {
  labels: string[];
  quantities: number[];
  revenues: number[];
}

interface ProductSalesChartProps {
  data?: ChartData;
  loading?: boolean;
  title?: string;
}

const ProductSalesChart: React.FC<ProductSalesChartProps> = ({
  data,
  loading = false,
  title = 'Sales',
}) => {
  const chartData = React.useMemo(() => {
    if (!data || !data.labels || data.labels.length === 0) return [];
    return data.labels.map((label, index) => ({
      name: label,
      quantity: Number(data.quantities[index]) || 0,
      revenue: Number(data.revenues[index]) || 0,
    }));
  }, [data]);

  // Use CSS variables for theming – they will adapt to dark/light mode
  const colors = {
    axis: 'var(--color-muted-foreground)',
    axisLabel: 'var(--color-foreground)',
    grid: 'var(--color-border)',
    quantity: 'var(--color-primary)',
    revenue: 'var(--color-chart-2)',
    tooltipBg: 'var(--color-popover)',
    tooltipBorder: 'var(--color-border)',
    tooltipText: 'var(--color-popover-foreground)',
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const quantityItem = payload.find((p: any) => p.dataKey === 'quantity');
      const revenueItem = payload.find((p: any) => p.dataKey === 'revenue');
      if (!quantityItem || !revenueItem) return null;

      const qty = Number(quantityItem.value);
      const rev = Number(revenueItem.value);
      if (isNaN(rev)) return null;

      return (
        <div
          className="rounded-md border px-3 py-2 text-sm shadow-lg"
          style={{
            backgroundColor: colors.tooltipBg,
            borderColor: colors.tooltipBorder,
            color: colors.tooltipText,
          }}
        >
          <p className="font-medium">{label}</p>
          <p>
            <span style={{ color: colors.quantity }}>●</span> Quantity:{' '}
            <span className="font-bold">{qty} units</span>
          </p>
          <p>
            <span style={{ color: colors.revenue }}>●</span> Revenue:{' '}
            <span className="font-bold">${rev.toFixed(2)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex h-full min-h-[200px] items-center justify-center rounded-lg border border-border bg-background">
        <span className="text-muted-foreground">Loading chart…</span>
      </div>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div className="flex h-full min-h-[200px] items-center justify-center rounded-lg border border-border bg-background">
        <span className="text-muted-foreground">No sales data available</span>
      </div>
    );
  }

  return (
    <div className="h-full w-full rounded-lg border border-border bg-background p-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          barGap={2}
          barCategoryGap="20%"
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={colors.grid}
            vertical={false}
          />
          <XAxis
            dataKey="name"
            stroke={colors.axis}
            tick={{ fill: colors.axisLabel, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="left"
            orientation="left"
            stroke={colors.axis}
            tick={{ fill: colors.axisLabel, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke={colors.axis}
            tick={{ fill: colors.axisLabel, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={40}
            tickFormatter={(v) => `$${v}`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(128,128,128,0.15)' }} />
          <Legend
            wrapperStyle={{ color: colors.axisLabel, fontSize: 11 }}
            formatter={(value) => <span style={{ color: colors.axisLabel }}>{value}</span>}
          />
          <Bar
            yAxisId="left"
            dataKey="quantity"
            name="Quantity"
            radius={[3, 3, 0, 0]}
            barSize={18}
            fill={colors.quantity}
            label={{
              position: 'top',
              formatter: (v: number) => v,
              fill: colors.axisLabel,
              fontSize: 10,
              offset: 2,
            }}
          />
          <Bar
            yAxisId="right"
            dataKey="revenue"
            name="Revenue"
            radius={[3, 3, 0, 0]}
            barSize={18}
            fill={colors.revenue}
            label={{
              position: 'top',
              formatter: (v: number) => `$${v}`,
              fill: colors.axisLabel,
              fontSize: 10,
              offset: 2,
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ProductSalesChart;