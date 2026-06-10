// components/ui/KpiCard.tsx
import { LucideIcon } from 'lucide-react';

interface KpiCardProps {
    label: string;
    value: string | number;
    icon: LucideIcon;
    delta?: string;
    trend?: 'up' | 'down' | 'flat';
    hint?: string;
}

export function KpiCard({ label, value, icon: Icon, delta, trend, hint }: KpiCardProps) {
    const trendColor =
        trend === 'up'
            ? 'text-green-600 dark:text-green-400'
            : trend === 'down'
                ? 'text-red-600 dark:text-red-400'
                : 'text-gray-500 dark:text-gray-400';

    const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';

    return (
        <div className="rounded-lg border border-gray-200 bg-white p-4  dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between">
                <Icon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                {hint && <span className="text-xs text-gray-500 dark:text-gray-400">{hint}</span>}
            </div>
            <div className="mt-2">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">
                    {typeof value === 'number' ? value.toLocaleString() : value}
                </p>
                {delta && (
                    <p className={`text-xs ${trendColor}`}>
                        {trendIcon} {delta}
                    </p>
                )}
            </div>
        </div>
    );
}