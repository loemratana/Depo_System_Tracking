export type EmployeeStatus = 'active' | 'inactive' | 'suspended' | 'on_leave';
export type Gender = 'male' | 'female' | 'other';

export interface Employee {
    id: number;
    khmerName: string | null;
    englishName?: string | null;
    employeeCode: string | null;
    images?: string | null;
    gender?: string | null;
    dateOfBirth?: string | null;
    address?: string | null;
    department?: string | null;
    position?: string | null;
    phone?: string | null;
    email?: string | null;
    hireDate?: string | null;
    salary?: number | null;
    status: EmployeeStatus;
    depotId?: number | null;
    depot?: {
        id: number;
        name: string;
        code: string;
    } | null;
    createdAt: string;
    updatedAt: string;
     _count?: {
    depots: number;
  };
}

export type CreateEmployeeInput = Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'depot' | 'employeeCode'> & {
    status?: EmployeeStatus;
};

export interface HandledDepot {
    id: number;
    name: string;
    code: string;
    province: string;
    district: string;
    assignmentStatus: 'assigned' | 'pending' | 'completed' | 'overdue';
    visitFrequency: string;
    lastVisit: string;
    coverageStatus: 'full' | 'partial' | 'at_risk';
    productsManaged: number;
    activeTasks: number;
}

export interface Assignment {
    id: number;
    depotName: string;
    type: string;
    startDate: string;
    endDate?: string;
    status: 'active' | 'completed' | 'cancelled';
}

export interface ActivityLog {
    id: number;
    type: 'assignment' | 'visit' | 'update' | 'system';
    description: string;
    timestamp: string;
    user: string;
}