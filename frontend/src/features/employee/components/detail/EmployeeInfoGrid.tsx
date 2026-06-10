import React from "react";
import {
  User,
  Briefcase,
  MapPin,
  Mail,
  Phone,
  Calendar,
  CreditCard,
  Fingerprint,
  Building2,
  ShieldCheck,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Employee } from "../../types/employee.types";
import { Separator } from "@/components/ui/separator";

interface InfoItemProps {
  label: string;
  value: string | number | React.ReactNode;
  icon: React.ReactNode;
}

const InfoItem: React.FC<InfoItemProps> = ({ label, value, icon }) => (
  <div className="flex items-start gap-3 py-2.5">
    <div className="mt-0.5 text-zinc-400">{icon}</div>
    <div className="space-y-0.5">
      <p className="text-[9px] font-black uppercase tracking-[0.1em] text-zinc-400">{label}</p>
      <div className="text-[13px] font-medium text-zinc-900 dark:text-zinc-100">
        {value || <span className="text-zinc-300 dark:text-zinc-700 italic">Not provided</span>}
      </div>
    </div>
  </div>
);

interface EmployeeInfoGridProps {
  employee: Employee;
}

export const EmployeeInfoGrid: React.FC<EmployeeInfoGridProps> = ({ employee }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="shadow-none border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <CardHeader className="pb-2">
          <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
            Personal Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
          <InfoItem
            label="Khmer Name"
            value={employee.khmerName}
            icon={<User className="h-3.5 w-3.5" />}
          />
          <InfoItem
            label="English Name"
            value={employee.englishName}
            icon={<User className="h-3.5 w-3.5" />}
          />
          <InfoItem
            label="Gender"
            value={employee.gender}
            icon={<Fingerprint className="h-3.5 w-3.5" />}
          />
          <InfoItem
            label="Date of Birth"
            value={employee.dateOfBirth}
            icon={<Calendar className="h-3.5 w-3.5" />}
          />
          <InfoItem label="Phone" value={employee.phone} icon={<Phone className="h-3.5 w-3.5" />} />
          <InfoItem label="Email" value={employee.email} icon={<Mail className="h-3.5 w-3.5" />} />
        </CardContent>
      </Card>

      <Card className="shadow-none border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <CardHeader className="pb-2">
          <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
            Employment Details
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
          <InfoItem
            label="Employee Code"
            value={employee.employeeCode}
            icon={<Fingerprint className="h-3.5 w-3.5" />}
          />
          <InfoItem
            label="Department"
            value={employee.department}
            icon={<Building2 className="h-3.5 w-3.5" />}
          />
          <InfoItem
            label="Position"
            value={employee.position}
            icon={<Briefcase className="h-3.5 w-3.5" />}
          />
          <InfoItem
            label="Hire Date"
            value={employee.hireDate}
            icon={<Calendar className="h-3.5 w-3.5" />}
          />
          <InfoItem
            label="Base Salary"
            value={employee.salary ? `$${Number(employee.salary).toLocaleString()}` : null}
            icon={<CreditCard className="h-3.5 w-3.5" />}
          />
        </CardContent>
      </Card>

      <Card className="shadow-none border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <CardHeader className="pb-2">
          <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
            Workplace Information
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
          <InfoItem
            label="Current Depot"
            value={employee.depot?.name}
            icon={<Building2 className="h-3.5 w-3.5" />}
          />
          <InfoItem
            label="Address"
            value={employee.address}
            icon={<MapPin className="h-3.5 w-3.5" />}
          />
          <InfoItem
            label="Status"
            value={employee.status}
            icon={<ShieldCheck className="h-3.5 w-3.5" />}
          />
          <InfoItem
            label="Joining Date"
            value={employee.createdAt?.split("T")[0]}
            icon={<Calendar className="h-3.5 w-3.5" />}
          />
        </CardContent>
      </Card>
    </div>
  );
};
