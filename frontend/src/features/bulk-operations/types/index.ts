export type ImportStep =
  | 'upload'
  | 'validate'
  | 'preview'
  | 'processing'
  | 'complete';

export type OperationType = 'employee' | 'depot' | 'visit' | 'assignment';

export interface ImportRow {
  id: string;
  khmerName: string;
  englishName: string;
  employeeCode: string;
  images: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  department: string;
  position: string;
  phone: string;
  email: string;
  hireDate: string;
  status: string;
  depotCode: string;
  errors: Record<string, string>;
  warnings: Record<string, string>;
  isValid: boolean;
}

export interface ImportHistory {
  id: string;
  fileName: string;
  importedBy: string;
  importType: 'Employees' | 'Depots' | 'Visits' | 'Assignment Logs';
  totalRecords: number;
  successCount: number;
  failedCount: number;
  date: string;
  status: 'Completed' | 'Failed' | 'Partial Success' | 'Processing';
  details?: string;
}

export interface ExportHistoryItem {
  id: string;
  fileName: string;
  format: 'CSV' | 'XLSX' | 'PDF';
  recordCount: number;
  requestedBy: string;
  date: string;
  status: 'Ready' | 'Generating' | 'Queued' | 'Expired';
  downloadUrl?: string;
}

export interface ValidationSummaryStats {
  totalRows: number;
  validRows: number;
  errorRows: number;
  warningRows: number;
  readinessScore: number; // 0 to 100
}

export interface ProcessingLog {
  timestamp: string;
  message: string;
  level: 'info' | 'success' | 'warn' | 'error';
}

export interface ExportConfig {
  columns: string[];
  dateRange: {
    from: string;
    to: string;
  } | null;
  format: 'CSV' | 'XLSX' | 'PDF';
  includeArchived: boolean;
  includeInactive: boolean;
  region: string;
}
