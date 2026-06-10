import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogIn, Edit3, Shield, Clock, MoreVertical, FileText } from "lucide-react";
import type { ActivityLog } from "../types/userProfile.types";

interface ActivityTabContentProps {
  activities: ActivityLog[];
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case "login":
      return <LogIn className="h-4 w-4 text-primary" />;
    case "update":
      return <Edit3 className="h-4 w-4 text-emerald-600" />;
    case "security":
      return <Shield className="h-4 w-4 text-rose-600" />;
    case "action":
      return <FileText className="h-4 w-4 text-sky-600" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
};

const getActivityBadgeVariant = (type: string) => {
  switch (type) {
    case "login":
      return "default";
    case "update":
      return "secondary";
    case "security":
      return "destructive";
    case "action":
      return "outline";
    default:
      return "default";
  }
};

const formatTime = (timestamp: string) => {
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
};

export function ActivityTabContent({ activities }: ActivityTabContentProps) {
  return (
    <div className="space-y-6">
      {/* Header card – simplified */}
      <Card className="p-4 border-border bg-card/30 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/5 text-primary">
          <Clock className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Activity Timeline</h2>
          <p className="text-[11px] text-muted-foreground">Recent actions and login history</p>
        </div>
      </Card>

      {/* Activity list */}
      <div className="space-y-5">
        {activities && activities.length > 0 ? (
          activities.map((activity, index) => (
            <div key={activity.id} className="relative flex gap-4">
              {/* Timeline connector line */}
              {index !== activities.length - 1 && (
                <div className="absolute left-[23px] top-12 h-[calc(100%+1rem)] w-px bg-border/60" />
              )}

              {/* Timeline node */}
              <div className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-background shadow-sm">
                {getActivityIcon(activity.type)}
              </div>

              {/* Activity card */}
              <Card className="flex-1 p-4 border-border hover:border-border-strong transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-foreground">{activity.title}</h3>
                      <Badge
                        variant={getActivityBadgeVariant(activity.type)}
                        className="text-[10px] uppercase tracking-wider px-1.5 py-0"
                      >
                        {activity.type}
                      </Badge>
                    </div>
                    <p className="text-[12px] text-muted-foreground leading-relaxed">
                      {activity.description}
                    </p>
                  </div>
                  <button className="p-1 rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                    <MoreVertical className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Timestamp row */}
                <div className="mt-3 pt-3 flex items-center gap-3 text-[10px] text-muted-foreground border-t border-border/40">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    <span>{formatTime(activity.timestamp)}</span>
                  </div>
                  <span className="text-border">•</span>
                  <span>{new Date(activity.timestamp).toLocaleString()}</span>
                </div>
              </Card>
            </div>
          ))
        ) : (
          <Card className="p-10 text-center border-dashed border-border bg-muted/5">
            <div className="flex flex-col items-center gap-3">
              <div className="p-2 rounded-full bg-muted/30">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground/70">No activity yet</p>
              <p className="text-[11px] text-muted-foreground">Your activity will appear here</p>
            </div>
          </Card>
        )}
      </div>

      {/* Load more (if needed) */}
      {activities && activities.length > 0 && (
        <div className="flex justify-center pt-2">
          <button className="px-4 py-1.5 text-[11px] font-medium rounded-md border border-border bg-background text-foreground hover:bg-muted transition-colors">
            Load More Activity
          </button>
        </div>
      )}
    </div>
  );
}
