"use client";

import React from "react";
import { Employee } from "../types/employee.types";
import { MoreHorizontal, Pencil, Trash2, Eye, UserRound } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface EmployeeTableProps {
  employees: Employee[];
  onEdit: (emp: Employee) => void;
  onDelete: (id: string) => void;
}

export const EmployeeTable: React.FC<EmployeeTableProps> = ({ employees, onEdit, onDelete }) => {
  return (
    <div className="w-full py-4 px-4">
      <Card className="w-full rounded-md border-0 overflow-hidden pb-0 pt-6 gap-6">
        <CardHeader className="px-6">
          <CardTitle>Employee Directory</CardTitle>
          <CardDescription>Manage and view all employee records</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table className="w-full">
              <TableHeader>
                <TableRow className="hover:bg-transparent!">
                  <TableHead className="p-3 ps-6 w-10">#</TableHead>
                  <TableHead className="p-2">ID</TableHead>
                  <TableHead className="p-2">Employee</TableHead>
                  <TableHead className="p-2">Depot</TableHead>
                  <TableHead className="p-2">Position</TableHead>
                  <TableHead className="p-2">Department</TableHead>
                  <TableHead className="p-2">Contact</TableHead>
                  <TableHead className="p-2">Gender</TableHead>
                  <TableHead className="p-2">Salary</TableHead>
                  <TableHead className="p-2">KPI Score</TableHead>
                  <TableHead className="p-2">Status</TableHead>
                  <TableHead className="p-2">Joined Date</TableHead>
                  <TableHead className="p-3 pe-6 w-12 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody className="divide-y divide-border dark:divide-darkborder">
                {employees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="h-32 text-center text-muted-foreground">
                      No employees found
                    </TableCell>
                  </TableRow>
                ) : (
                  employees.map((emp) => (
                    <TableRow key={emp.id} className="group">
                      {/* Checkbox */}
                      <TableCell className="whitespace-nowrap p-3 ps-6">
                        <Checkbox className="data-[state=checked]:bg-blue-500 dark:data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500 dark:data-[state=checked]:border-blue-500 cursor-pointer" />
                      </TableCell>

                      {/* ID */}
                      <TableCell className="whitespace-nowrap p-2">
                        <span className="font-mono text-xs text-muted-foreground">{emp.id}</span>
                      </TableCell>

                      {/* Employee (Name + Avatar) */}
                      <TableCell className="whitespace-nowrap p-2">
                        <div className="flex items-center gap-3">
                          {emp.images ? (
                            <img
                              src={emp.images}
                              alt={emp.englishName || emp.khmerName || "Employee"}
                              className="h-9 w-9 rounded-full object-cover border border-border"
                              width={36}
                              height={36}
                            />
                          ) : (
                            <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center border border-border">
                              <UserRound className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <div className="truncate max-w-56">
                            <Link
                              to="/employees/$id"
                              params={{ id: String(emp.id) }}
                              className="text-sm font-medium text-foreground hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors"
                            >
                              {emp.khmerName || emp.englishName || emp.email || "Unnamed"}
                            </Link>
                            {emp.khmerName && emp.englishName && (
                              <p className="text-xs text-muted-foreground truncate">
                                {emp.englishName}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Depot */}
                      <TableCell className="whitespace-nowrap p-2">
                        <span className="text-sm text-foreground">
                          {emp._count?.depots > 0 ? `${emp._count.depots} depot(s)` : "UNASSIGNED"}
                        </span>
                      </TableCell>

                      {/* Position */}
                      <TableCell className="whitespace-nowrap p-2">
                        <span className="text-sm text-foreground">{emp.position || "NULL"}</span>
                      </TableCell>

                      {/* Department */}
                      <TableCell className="whitespace-nowrap p-2">
                        <span className="text-sm text-foreground">{emp.department || "NULL"}</span>
                      </TableCell>

                      {/* Contact */}
                      <TableCell className="whitespace-nowrap p-2">
                        <div className="flex flex-col gap-0.5">
                          {emp.phone && (
                            <span className="text-xs text-foreground">{emp.phone}</span>
                          )}
                          {emp.email && (
                            <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                              {emp.email}
                            </span>
                          )}
                          {!emp.phone && !emp.email && (
                            <span className="text-xs text-muted-foreground">NULL</span>
                          )}
                        </div>
                      </TableCell>

                      {/* Gender */}
                      <TableCell className="whitespace-nowrap p-2">
                        <span className="text-sm text-muted-foreground capitalize">
                          {emp.gender || "NULL"}
                        </span>
                      </TableCell>

                      {/* Salary */}
                      <TableCell className="whitespace-nowrap p-2">
                        <span className="text-sm font-medium text-foreground">
                          {emp.salary ? `$${emp.salary.toLocaleString()}` : "NULL"}
                        </span>
                      </TableCell>

                      {/* KPI Score (Mock) */}
                      <TableCell className="whitespace-nowrap p-2">
                        {(() => {
                          const mockKpi = 75 + ((emp.id * 17) % 25);
                          const isHigh = mockKpi >= 90;
                          const isMedium = mockKpi >= 80 && mockKpi < 90;
                          return (
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                                isHigh && "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
                                isMedium && "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
                                !isHigh && !isMedium && "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                              )}
                            >
                              {mockKpi}%
                            </span>
                          );
                        })()}
                      </TableCell>

                      {/* Status Badge */}
                      <TableCell className="whitespace-nowrap p-2">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                            emp.status === "active" &&
                              "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
                            emp.status === "suspended" &&
                              "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400",
                            emp.status === "on_leave" &&
                              "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
                            !emp.status ||
                              (emp.status !== "active" &&
                                emp.status !== "suspended" &&
                                emp.status !== "on_leave" &&
                                "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"),
                          )}
                        >
                          {emp.status?.replace(/_/g, " ") || "NULL"}
                        </span>
                      </TableCell>

                      {/* Joined Date */}
                      <TableCell className="whitespace-nowrap p-2">
                        <span className="text-sm text-muted-foreground">
                          {emp.createdAt
                            ? new Date(emp.createdAt).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })
                            : "NULL"}
                        </span>
                      </TableCell>

                      {/* Actions Dropdown */}
                      <TableCell className="whitespace-nowrap p-3 pe-6">
                        <div className="flex items-center justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <span className="flex justify-center items-center rounded-full p-2 hover:bg-muted cursor-pointer">
                                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                              </span>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem asChild>
                                <Link
                                  to="/employees/$id"
                                  params={{ id: String(emp.id) }}
                                  className="flex items-center gap-2 cursor-pointer"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  <span>View Detail</span>
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => onEdit(emp)}
                                className="flex items-center gap-2 cursor-pointer"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                <span>Edit</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => onDelete(String(emp.id))}
                                className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Delete</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
