import type { ImportRow } from "../types";

export type VerifyRowPayload = {
  rowNumber: number;
  data?: Record<string, unknown>;
  errors?: string[];
};

function formatDateValue(val: unknown): string {
  if (val == null || val === "") return "";
  if (val instanceof Date) return val.toISOString().split("T")[0];
  if (typeof val === "string") return val.includes("T") ? val.split("T")[0] : val;
  return String(val);
}

export function mapErrorsToFields(errors: string[]): Record<string, string> {
  const mapped: Record<string, string> = {};
  for (const errStr of errors) {
    const lower = errStr.toLowerCase();
    if (lower.includes("khmer")) mapped.khmerName = errStr;
    else if (lower.includes("email")) mapped.email = errStr;
    else if (lower.includes("employeecode") || lower.includes("employee code")) {
      mapped.employeeCode = errStr;
    } else if (lower.includes("depot")) mapped.depotCode = errStr;
    else if (lower.includes("phone")) mapped.phone = errStr;
    else if (lower.includes("gender")) mapped.gender = errStr;
    else if (lower.includes("status")) mapped.status = errStr;
    else if (lower.includes("dateofbirth") || lower.includes("date of birth")) {
      mapped.dateOfBirth = errStr;
    } else if (lower.includes("hiredate") || lower.includes("hire date")) {
      mapped.hireDate = errStr;
    } else if (lower.includes("department")) mapped.department = errStr;
    else if (lower.includes("position")) mapped.position = errStr;
    else mapped.backendError = errStr;
  }
  return mapped;
}

export function mapVerifyRowToImportRow(
  row: VerifyRowPayload,
  isValid: boolean,
): ImportRow {
  const d = row.data ?? {};
  const str = (key: string) => {
    const v = d[key];
    return v != null ? String(v).trim() : "";
  };

  const errors = isValid ? {} : mapErrorsToFields(row.errors ?? []);

  return {
    id: String(row.rowNumber),
    khmerName: str("khmerName"),
    englishName: str("englishName"),
    employeeCode: str("employeeCode"),
    images: str("images"),
    dateOfBirth: formatDateValue(d.dateOfBirth),
    gender: str("gender"),
    address: str("address"),
    department: str("department"),
    position: str("position"),
    phone: str("phone"),
    email: str("email"),
    hireDate: formatDateValue(d.hireDate),
    status: str("status") || "active",
    depotCode: str("depotCode"),
    errors,
    warnings: {},
    isValid: isValid && Object.keys(errors).length === 0,
  };
}
