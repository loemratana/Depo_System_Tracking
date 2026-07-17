import { Surface, StatusBadge } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { LogIn, Edit3, Shield, Clock, FileText } from "lucide-react";
import type { ActivityLog } from "../types/userProfile.types";

interface ActivityTabContentProps {
  activities: ActivityLog[];
}

const activityConfig: Record<
  string,
  { icon: typeof LogIn; tone: "info" | "success" | "danger" | "warning"; bg: string }
> = {
  login: { icon: LogIn, tone: "info", bg: "bg-blue-600" },
  update: { icon: Edit3, tone: "success", bg: "bg-emerald-600" },
  security: { icon: Shield, tone: "danger", bg: "bg-rose-600" },
  action: { icon: FileText, tone: "warning", bg: "bg-amber-500" },
};

function formatTime(timestamp: string) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function ActivityTabContent({ activities }: ActivityTabContentProps) {
  return (
    <div className="space-y-4">
      <Surface className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
          <Clock className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Activity Timeline</h2>
          <p className="text-xs text-muted-foreground">Recent actions and login history</p>
        </div>
      </Surface>

      <div className="space-y-4">
        {activities.length > 0 ? (
          activities.map((activity, index) => {
            const config = activityConfig[activity.type] ?? {
              icon: Clock,
              tone: "info" as const,
              bg: "bg-slate-500",
            };
            const Icon = config.icon;

            return (
              <div key={activity.id} className="relative flex gap-4">
                {index !== activities.length - 1 && (
                  <div className="absolute left-5 top-12 h-[calc(100%+1rem)] w-px bg-border/60" />
                )}

                <div
                  className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-sm ${config.bg}`}
                >
                  <Icon className="h-4 w-4 text-white" />
                </div>

                <Surface className="flex-1 transition-colors hover:border-border">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">{activity.title}</h3>
                      <StatusBadge tone={config.tone}>{activity.type}</StatusBadge>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {activity.description}
                    </p>
                    <div className="flex items-center gap-2 border-t border-border/50 pt-2 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{formatTime(activity.timestamp)}</span>
                      <span>·</span>
                      <span>{new Date(activity.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                </Surface>
              </div>
            );
          })
        ) : (
          <Surface className="border-dashed py-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted/50">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="mt-3 text-sm font-medium text-foreground">No activity yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Your activity will appear here</p>
          </Surface>
        )}
      </div>

      {activities.length > 0 && (
        <div className="flex justify-center pt-1">
          <Button variant="outline" size="sm" className="h-8 rounded-lg text-xs">
            Load More Activity
          </Button>
        </div>
      )}
    </div>
  );
}
