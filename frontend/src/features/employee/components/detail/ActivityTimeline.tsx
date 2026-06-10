import React from "react";
import { Clock, MapPin, ClipboardCheck, UserCog, FileUp } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Activity {
  id: number;
  title: string;
  description: string;
  timestamp: string;
  icon: React.ReactNode;
}

const mockActivities: Activity[] = [
  {
    id: 1,
    title: "Completed Visit",
    description: "Completed inventory check at Brand Depot Battambang Center.",
    timestamp: "2 hours ago",
    icon: <ClipboardCheck className="h-3.5 w-3.5" />,
  },
  {
    id: 2,
    title: "New Assignment",
    description: "Assigned to handle Siem Reap Provincial Depot.",
    timestamp: "5 hours ago",
    icon: <MapPin className="h-3.5 w-3.5" />,
  },
  {
    id: 3,
    title: "Profile Updated",
    description: "Emergency contact information updated by HR Admin.",
    timestamp: "Yesterday at 4:30 PM",
    icon: <UserCog className="h-3.5 w-3.5" />,
  },
  {
    id: 4,
    title: "Report Submitted",
    description: "Monthly operational coverage report submitted for Q2.",
    timestamp: "May 12, 2026",
    icon: <FileUp className="h-3.5 w-3.5" />,
  },
];

const ActivityItem: React.FC<{ activity: Activity; isLast: boolean }> = ({ activity, isLast }) => (
  <div className="relative flex gap-3 pb-4">
    {!isLast && (
      <div className="absolute left-[11px] top-7 bottom-0 w-[1px] bg-zinc-100 dark:bg-zinc-800" />
    )}
    <div className="relative z-10 h-6 w-6 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex items-center justify-center shrink-0">
      <div className="text-zinc-400">{activity.icon}</div>
    </div>
    <div className="flex flex-col pt-0.5">
      <p className="text-[12px] font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
        {activity.title}
      </p>
      <p className="text-[11px] text-zinc-500 mt-0.5">{activity.description}</p>
      <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mt-1.5">
        {activity.timestamp}
      </span>
    </div>
  </div>
);

export const ActivityTimeline: React.FC = () => {
  return (
    <Card className="shadow-none border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
      <CardHeader className="pb-4">
        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
          Operational History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {mockActivities.map((activity, index) => (
            <ActivityItem
              key={activity.id}
              activity={activity}
              isLast={index === mockActivities.length - 1}
            />
          ))}
        </div>
        <Button
          variant="ghost"
          className="w-full mt-2 h-8 text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-900"
        >
          View Full Audit Log
        </Button>
      </CardContent>
    </Card>
  );
};
