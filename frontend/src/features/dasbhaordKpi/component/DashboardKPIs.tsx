// In your existing DashboardPage component
import { useDashboard } from '@/hooks/useDashboard'; // adjust path
import { Skeleton } from '@/components/ui/skeleton'; // or your own loader

function DashboardPage() {
    const { data: dashboardData, loading, error, refetch } = useDashboard();

    // Helper to format numbers with commas
    const formatNumber = (value?: number | null, fallback = '—') => {
        if (value === undefined || value === null) return fallback;
        return value.toLocaleString();
    };

    return (
        <>
            <PageHeader ... /> {/* unchanged */}

            {/* KPIs */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                {/* 1. Brand Depots - from API */}
                {loading ? (
                    <Skeleton className="h-28 w-full rounded-lg" />
                ) : (
                    <KpiCard
                        label="Brand Depots"
                        value={dashboardData ? formatNumber(dashboardData.brandDepots) : '—'}
                        icon={Warehouse}
                    // you can optionally compute a delta if your API provides historical data
                    />
                )}

                {/* 2. Handlers - from API */}
                {loading ? (
                    <Skeleton className="h-28 w-full rounded-lg" />
                ) : (
                    <KpiCard
                        label="Handlers"
                        value={dashboardData ? formatNumber(dashboardData.handlers) : '—'}
                        icon={Users}
                    />
                )}

                {/* 3. Expired Depots - from API */}
                {loading ? (
                    <Skeleton className="h-28 w-full rounded-lg" />
                ) : (
                    <KpiCard
                        label="Expired Depots"
                        value={dashboardData ? formatNumber(dashboardData.expiredDepots) : '—'}
                        icon={MapPin}
                    />
                )}

                {/* 4. Product Coverage - still mock (not in API) */}
                <KpiCard
                    label="Product Coverage"
                    value="86%"
                    delta="+0.9pp"
                    trend="up"
                    icon={Package}
                />

                {/* 5. Pending Assign - still mock */}
                <KpiCard
                    label="Pending Assign"
                    value="47"
                    delta="-12"
                    trend="down"
                    icon={Clock}
                    hint="below threshold"
                />

                {/* 6. User - from API */}
                {loading ? (
                    <Skeleton className="h-28 w-full rounded-lg" />
                ) : (
                    <KpiCard
                        label="User"
                        value={dashboardData?.user !== undefined ? formatNumber(dashboardData.user) : '—'}
                        icon={Globe2}
                    />
                )}
            </div>

            {/* If error occurs, show retry banner */}
            {error && (
                <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                    Failed to load metrics: {error.message}
                    <button onClick={refetch} className="ml-3 underline">
                        Retry
                    </button>
                </div>
            )}

            {/* Rest of your charts and tables stay exactly the same */}
            <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
                {/* ... */}
            </div>
        </>
    );
}