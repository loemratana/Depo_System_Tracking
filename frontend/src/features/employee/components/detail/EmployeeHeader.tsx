import React from "react";
import {
  Edit2,
  MoreHorizontal,
  Share2,
  FileText,
  MapPin,
  UserPlus,
  ChevronRight,
  Building2,
  Calendar,
  Circle,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Employee } from "../../types/employee.types";
import { cn } from "@/lib/utils";

interface EmployeeHeaderProps {
  employee: Employee;
  onExportExcel: () => void;
  onExportPDF: () => void;
  onEdit?: () => void;
  onAssign?: () => void;
}

export const EmployeeHeader: React.FC<EmployeeHeaderProps> = ({
  employee,
  onExportExcel,
  onExportPDF,
  onEdit,
  onAssign,
}) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "active":
        return {
          color:
            "text-emerald-600 bg-emerald-50 border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20",
          label: "Active",
        };
      case "suspended":
        return {
          color: "text-red-600 bg-red-50 border-red-100 dark:bg-red-500/10 dark:border-red-500/20",
          label: "Suspended",
        };
      case "on_leave":
        return {
          color:
            "text-amber-600 bg-amber-50 border-amber-100 dark:bg-amber-500/10 dark:border-amber-500/20",
          label: "On Leave",
        };
      default:
        return {
          color:
            "text-zinc-500 bg-zinc-50 border-zinc-100 dark:bg-zinc-500/10 dark:border-zinc-500/20",
          label: status,
        };
    }
  };

  const status = getStatusConfig(employee.status);

  return (
    <div className="flex flex-col space-y-4">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              href="/dashboard"
              className="text-[11px] font-medium text-zinc-500 hover:text-zinc-900"
            >
              Dashboard
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink
              href="/employees"
              className="text-[11px] font-medium text-zinc-500 hover:text-zinc-900"
            >
              Workforce
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="text-[11px] font-medium text-zinc-900 dark:text-zinc-100">
              {employee.khmerName || employee.englishName || "Personnel Detail"}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative group">
            <Avatar className="h-14 w-14 border border-zinc-200 dark:border-zinc-800 shadow-none">
              <AvatarImage
                src={
                  employee.images ||
                  `https://avatar.vercel.sh/${employee.khmerName || employee.englishName || employee.id}.png`
                }
              />
              <AvatarFallback className="bg-zinc-100 text-zinc-500 font-medium text-xs">
                {(employee.khmerName || employee.englishName || "??").slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div
              className={cn(
                "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white dark:border-zinc-950 shadow-sm",
                employee.status === "active" ? "bg-emerald-500" : "bg-zinc-300",
              )}
            />
          </div>

          <div className="flex flex-col space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-[18px] font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                {employee.khmerName || employee.englishName || employee.email || "Unnamed Employee"}
                {employee.khmerName && employee.englishName && (
                  <span className="text-zinc-400 font-medium ml-1">({employee.englishName})</span>
                )}
              </h1>
              <Badge
                variant="outline"
                className={cn(
                  "text-[9px] h-4 px-1.5 font-black uppercase tracking-wider border",
                  status.color,
                )}
              >
                {status.label}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-zinc-500">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[10px] bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-600 dark:text-zinc-400">
                  {employee.employeeCode}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Building2 className="h-3 w-3" />
                <span>{employee.position}</span>
                <span className="text-zinc-300 dark:text-zinc-700 mx-0.5">•</span>
                <span>{employee.department}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3 w-3" />
                <span>{employee.depot?.name || "Unassigned"}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
        <Button
            variant="outline"
            className="h-8 px-3 gap-2 text-[11px] font-bold uppercase tracking-wider border-zinc-200 dark:border-zinc-800 shadow-none"
            onClick={onEdit}   // trigger edit dialog
          >
            <Edit2 className="h-3 w-3 text-zinc-500" />
            Edit Profile
          </Button>
          <Button
            variant="outline"
            className="h-8 px-3 gap-2 text-[11px] font-bold uppercase tracking-wider border-zinc-200 dark:border-zinc-800 shadow-none"
            onClick={onAssign} // trigger assign depot dialog
          >
            <UserPlus className="h-3 w-3 text-zinc-500" />
            Assign Depot
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 border-zinc-200 dark:border-zinc-800 shadow-none"
              >
                <MoreHorizontal className="h-4 w-4 text-zinc-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 p-1">
              <DropdownMenuItem
                className="gap-2 text-[11px] font-medium py-2 cursor-pointer"
                onClick={onExportExcel}
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-green-600" />
                Export to Excel
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2 text-[11px] font-medium py-2 cursor-pointer"
                onClick={onExportPDF}
              >
                <FileText className="h-3.5 w-3.5 text-red-600" />
                Export to PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};