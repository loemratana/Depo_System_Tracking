export type RowValidation = {
  status: "valid" | "warning" | "error";
  issues: string[];
  notes: string[];
};

export type ParsedCsv = {
  headers: string[];
  rows: Record<string, string>[];
};

export const parseCSV = (text: string): ParsedCsv => {
  const lines = text.split(/\r?\n/);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map((h) => h.trim());
  const rows = lines
    .slice(1)
    .filter((l) => l.trim())
    .map((line, idx) => {
      const values = line.split(",").map((v) => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, i) => {
        row[h] = values[i] || "";
      });
      row._originalIndex = String(idx);
      return row;
    });
  return { headers, rows };
};

export const rowsToCsv = (headers: string[], rows: Record<string, string>[]) => {
  return [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h] ?? "";
          if (val.includes(",") || val.includes('"') || val.includes("\n")) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        })
        .join(","),
    ),
  ].join("\n");
};

type ValidationChecks = {
  rowErrors?: { row: number; issues: string[] }[];
  dbDuplicateCodes?: {
    found: boolean;
    blockedRows?: { row: number }[];
  };
  csvDuplicateCodes?: { found: boolean; codes?: string[] };
  existingEmployees?: { found: boolean; employees?: { englishName: string }[] };
  newProvincesToCreate?: { found: boolean; provinces?: string[] };
};

export function buildValidationMap(
  currentRows: Record<string, string>[],
  checks: ValidationChecks,
): Record<number, RowValidation> {
  const map: Record<number, RowValidation> = {};
  currentRows.forEach((_, idx) => {
    map[idx] = { status: "valid", issues: [], notes: [] };
  });

  if (checks.rowErrors?.length) {
    checks.rowErrors.forEach(({ row, issues }) => {
      const idx = row - 1;
      if (map[idx]) {
        map[idx].status = "error";
        map[idx].issues = issues;
      }
    });
  }

  if (checks.dbDuplicateCodes?.found) {
    checks.dbDuplicateCodes.blockedRows?.forEach(({ row }) => {
      const idx = row - 1;
      if (map[idx]) {
        map[idx].status = "error";
        map[idx].issues.push(
          `Code "${currentRows[idx]?.code}" already exists in database`,
        );
      }
    });
  }

  if (checks.csvDuplicateCodes?.found) {
    checks.csvDuplicateCodes.codes?.forEach((code) => {
      currentRows.forEach((row, idx) => {
        if (row.code === code) {
          if (map[idx].status !== "error") map[idx].status = "error";
          map[idx].issues.push(`Code "${code}" is duplicated within the CSV`);
        }
      });
    });
  }

  if (checks.existingEmployees?.found) {
    checks.existingEmployees.employees?.forEach(({ englishName }) => {
      currentRows.forEach((row, idx) => {
        if (row.employeeName?.toLowerCase() === englishName?.toLowerCase()) {
          map[idx].notes.push("Employee already exists — will be linked");
          if (map[idx].status === "valid") map[idx].status = "warning";
        }
      });
    });
  }

  if (checks.newProvincesToCreate?.found) {
    checks.newProvincesToCreate.provinces?.forEach((pName) => {
      currentRows.forEach((row, idx) => {
        if (row.provinceName?.toLowerCase() === pName.toLowerCase()) {
          map[idx].notes.push(`Province "${pName}" will be created`);
        }
      });
    });
  }

  return map;
}
