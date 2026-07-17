import {prisma} from "../config/db.js";
import logger from "../config/logger.js";
import Excel from "exceljs";

class EmployeeService {
    async getAll(filters = {}, pagination = {page: 1, limit: 10}) {
        const {page, limit} = pagination;
        const skip = (page - 1) * limit;

        const where = {};
        if (filters.search) {
            where.OR = [
                {khmerName: {contains: filters.search, mode: "insensitive"}},
                {englishName: {contains: filters.search, mode: "insensitive"}},
                {employeeCode: {contains: filters.search, mode: "insensitive"}},
            ];
        }
        if (filters.department) {
            where.department = filters.department;
        }
        if (filters.depotId) {
            where.depots = { some: { id: parseInt(filters.depotId) } };
        }

        const [employees, total] = await Promise.all([
            prisma.employee.findMany({
                where,
                skip,
                take: limit,
                select: {
                    id: true,
                    khmerName: true,
                    englishName: true,
                    employeeCode: true,
                    phone: true,
                    email: true,
                    department: true,
                    position: true,
                    status: true,
                    hireDate: true,
                    images: true,
                    dateOfBirth: true,
                    gender: true,
                    address: true,
                    //count of related depots (efficient)
                    _count: {
                        select: { depots: true },
                    },
                },
                orderBy: { createdAt: "desc" },
            }),
            prisma.employee.count({ where }),
        ]);

        return {
            employees,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit),
            },
        };
    }

    async getById(id) {
        const parsedId = parseInt(id);
        if (isNaN(parsedId)) {
            return null;
        }
        const employee = await prisma.employee.findUnique({
            where: { id: parsedId },
            include: {
                depots: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        status: true,
                    },
                    orderBy: { name: "asc" },
                    take: 1,
                },
                user: {
                    select: {
                        username: true,
                        role: true,
                        status: true,
                    },
                },
                _count: {
                    select: { depots: true },
                },
            },
        });

        if (!employee) return null;

        const { depots, ...rest } = employee;
        return {
            ...rest,
            depot: depots[0] ?? null,
        };
    }

    async create(data) {
        try {
            // Check employee code
            if (data.employeeCode) {
                const existingEmployee = await prisma.employee.findUnique({
                    where: {
                        employeeCode: data.employeeCode,
                    },
                });

                if (existingEmployee) {
                    throw new Error("Employee code already exists");
                }
            }

            // Check email
            if (data.email) {
                const existingEmployee = await prisma.employee.findFirst({
                    where: {
                        email: data.email,
                    },
                });

                if (existingEmployee) {
                    throw new Error("Email already exists");
                }
            }

            // Validate depot if provided
            let depotId = null;

            // if (data.depotId) {

            //     const depot = await prisma.depot.findUnique({
            //         where: {
            //             id: parseInt(data.depotId)
            //         }
            //     });

            //     if (!depot) {
            //         throw new Error('Depot not found');
            //     }

            //     depotId = depot.id;
            // }

            // Create employee
            const employee = await prisma.employee.create({
                data: {
                    khmerName: data.khmerName,
                    englishName: data.englishName,
                    employeeCode: data.employeeCode,
                    images: data.images,

                    dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,

                    gender: data.gender,
                    address: data.address,
                    department: data.department,
                    position: data.position,
                    phone: data.phone,
                    email: data.email,

                    hireDate: data.hireDate ? new Date(data.hireDate) : null,

                    status: data.status || "active",

                    depotId: depotId,
                },

                include: {
                    depot: true,
                },
            });

            logger.info(`Employee created: ${employee.id} - ${employee.khmerName}`);

            return employee;
        } catch (error) {
            logger.error("EmployeeService create error:", error);

            throw error;
        }
    }

    async update(id, data) {
        try {
            const parsedId = parseInt(id);
            if (isNaN(parsedId)) throw new Error("Invalid employee ID format");

            // Prisma Employee model fields (match your schema)
            const allowedFields = [
                "khmerName",
                "englishName",
                "employeeCode",
                "images",
                "gender",
                "address",
                "department",
                "position",
                "phone",
                "email",
                "status",
                "depotId",
                "dateOfBirth",
                "hireDate",
            ];

            // Build updateData only with fields that are actually provided (not undefined)
            const updateData = {};
            for (const key of allowedFields) {
                if (data[key] !== undefined) {
                    // Convert special fields
                    if (key === "depotId" && data[key] !== null) {
                        updateData[key] = parseInt(data[key]);
                    } else if (key === "dateOfBirth" || key === "hireDate") {
                        updateData[key] = data[key] ? new Date(data[key]) : null;
                    } else {
                        updateData[key] = data[key];
                    }
                }
            }

            // Check unique constraints only if field is being updated
            if (updateData.employeeCode) {
                const existing = await prisma.employee.findFirst({
                    where: {
                        employeeCode: updateData.employeeCode,
                        id: {not: parsedId},
                    },
                });
                if (existing) throw new Error("Employee code already exists");
            }

            if (updateData.email) {
                const existing = await prisma.employee.findFirst({
                    where: {
                        email: updateData.email,
                        id: {not: parsedId},
                    },
                });
                if (existing) throw new Error("Email already exists");
            }

            const employee = await prisma.employee.update({
                where: {id: parsedId},
                data: updateData,
                // include: { depot: true }
            });

            logger.info(`Employee updated: ${employee.id}`);
            return employee;
        } catch (error) {
            logger.error("EmployeeService update error:", error);
            throw error;
        }
    }

    async findById(id) {
        try {
            const parsedId = parseInt(id);
            if (isNaN(parsedId)) return null;

            const employee = await prisma.employee.findUnique({
                where: {id: parsedId},
                select: {
                    id: true,
                    khmerName: true,
                    englishName: true,
                    employeeCode: true,
                    images: true,
                    dateOfBirth: true,
                    gender: true,
                    address: true,
                    department: true,
                    position: true,
                    phone: true,
                    email: true,
                    hireDate: true,
                    status: true,
                    // depotId: true,
                    depots: {
                        select: {
                            id: true,
                            name: true,
                            code: true,
                            district: {
                                select: {
                                    id: true,
                                    name: true,
                                    province: {
                                        select: {id: true, name: true},
                                    },
                                    // commune is not available – remove it
                                },
                            },
                        },
                    },
                },
            });

            if (!employee) throw new Error(`Employee with id ${id} not found`);
            return employee;
        } catch (error) {
            logger.error("EmployeeService findById error:", error);
            throw error;
        }
    }

    // ========== DELETE (hard delete) ==========
    async delete(id) {
        try {
            const parsedId = parseInt(id);
            if (isNaN(parsedId)) {
                throw new Error("Invalid employee ID format");
            }
            const employee = await prisma.employee.delete({
                where: {id: parsedId},
            });
            logger.info(`Employee deleted: ${employee.id} - ${employee.khmerName}`);
            return employee;
        } catch (error) {
            logger.error(`EmployeeService delete error for id ${id}:`, error);
            throw error;
        }
    }

    async getDepartments() {
        const departments = await prisma.employee.findMany({
            select: {department: true},
            distinct: ["department"],
            where: {department: {not: null}},
        });
        return departments.map((d) => d.department);
    }

    async getEmployeeDepotDetails(employeeId) {
        try {
            const id = Number(employeeId);
            if (isNaN(id)) throw new Error("Invalid employee ID");

            const depots = await prisma.depot.findMany({
                where: { employeeId: id },
                include: {
                    district: {
                        select: {
                            id: true,
                            name: true,
                            province: { select: { id: true, name: true } },
                        },
                    },
                    province: { select: { id: true, name: true } },
                    brand: { select: { id: true, name: true, code: true } },
                    _count: { select: { products: true, staffs: true } },
                },
                orderBy: { name: "asc" },
            });

            const now = new Date();

            return depots.map((depot) => {
                const expiry = depot.expiryDate ? new Date(depot.expiryDate) : null;
                let assignmentStatus = "assigned";
                if (depot.status === "inactive" || depot.status === "vacancy") {
                    assignmentStatus = "completed";
                } else if (expiry && expiry < now) {
                    assignmentStatus = "overdue";
                }

                let coverageStatus = "full";
                if (depot.status === "vacancy") coverageStatus = "at_risk";
                else if (expiry) {
                    const in30Days = new Date(now);
                    in30Days.setDate(in30Days.getDate() + 30);
                    if (expiry < now) coverageStatus = "at_risk";
                    else if (expiry <= in30Days) coverageStatus = "partial";
                }

                return {
                    id: depot.id,
                    name: depot.name,
                    code: depot.code,
                    khmerName: depot.khmerName,
                    address: depot.address,
                    phone: depot.phone,
                    status: depot.status,
                    province:
                        depot.province?.name ||
                        depot.district?.province?.name ||
                        null,
                    district: depot.district?.name || null,
                    brandName: depot.brand?.name || null,
                    brandCode: depot.brand?.code || null,
                    assignmentStatus,
                    coverageStatus,
                    assignedAt: depot.assignedAt,
                    expiryDate: depot.expiryDate,
                    productsManaged: depot._count.products,
                    staffCount: depot._count.staffs,
                    activeTasks: depot._count.products,
                    visitFrequency: depot.assignedAt
                        ? `Since ${new Date(depot.assignedAt).toLocaleDateString()}`
                        : "—",
                    lastVisit: depot.assignedAt
                        ? new Date(depot.assignedAt).toLocaleDateString()
                        : "—",
                };
            });
        } catch (error) {
            logger.error("EmployeeService error:", error);
            throw error;
        }
    }
    async getDepotSummary(employeeId) {
        const id = Number(employeeId);
        if (isNaN(id)) throw new Error('Invalid employee ID');

        const employee = await prisma.employee.findUnique({
            where: { id },
            select: {
                id: true,
                englishName: true,
                depots: {
                    select: { expiryDate: true },
                },
            },
        });

        if (!employee) throw new Error('Employee not found');

        const totalDepots = employee.depots.length;
        const expiredDepots = employee.depots.filter(
            d => d.expiryDate && new Date(d.expiryDate) < new Date()
        ).length;

        return {
            employeeId: employee.id,
            employeeName: employee.englishName,
            totalDepots,
            expiredDepots,
        };
    }

    async getEmployeeWithDepots(id) {
        const employeeId = parseInt(id);
        if (isNaN(employeeId)) throw new Error('Invalid employee ID');

        const employee = await prisma.employee.findUnique({
            where: { id: employeeId },
            include: {
                depots: {               // many‑to‑many relation (array of depots)
                    include: {
                        district: { include: { province: true } },   // for location info
                    },
                },
            },
        });

        if (!employee) throw new Error('Employee not found');

        // Format the response for the frontend
        const handledDepots = employee.depots.map(depot => ({
            id: depot.id,
            name: depot.name,
            code: depot.code,
            province: depot.district?.province?.name || null,
            district: depot.district?.name || null,
            address: depot.address,
            phone: depot.phone,
            status: depot.status,
            expiryDate: depot.expiryDate,
            // brands: depot.depotBrands.map(db => db.brand?.name).filter(Boolean),
        }));

        return {
            employee: {
                id: employee.id,
                khmerName: employee.khmerName,
                englishName: employee.englishName,
                employeeCode: employee.employeeCode,
                images: employee.images,
                dateOfBirth: employee.dateOfBirth,
                gender: employee.gender,
                address: employee.address,
                department: employee.department,
                position: employee.position,
                phone: employee.phone,
                email: employee.email,
                hireDate: employee.hireDate,
                status: employee.status,
            },
            handledDepots,
        };
    }


    async generateTemplate() {
        const workbook = new Excel.Workbook();
        const worksheet = workbook.addWorksheet("Employees");

        worksheet.columns = [
            {header: "khmerName *", key: "khmerName", width: 20},
            {header: "englishName", key: "englishName", width: 20},
            {header: "employeeCode", key: "employeeCode", width: 15},
            {header: "images", key: "images", width: 30},
            {header: "dateOfBirth", key: "dateOfBirth", width: 15},
            {header: "gender", key: "gender", width: 10},
            {header: "address", key: "address", width: 30},
            {header: "department", key: "department", width: 20},
            {header: "position", key: "position", width: 20},
            {header: "phone", key: "phone", width: 15},
            {header: "email *", key: "email", width: 25},
            {header: "hireDate", key: "hireDate", width: 15},
            {header: "status", key: "status", width: 10},
            {header: "depotCode", key: "depotCode", width: 20},
        ];

        // Add one example row
        worksheet.addRow({
            khmerName: "សុខ សុភាព",
            englishName: "Sok Sopheap",
            employeeCode: "EMP001",
            images: "https://example.com/avatar.jpg",
            dateOfBirth: "1990-01-01",
            gender: "MALE",
            address: "Phnom Penh",
            department: "Sales",
            position: "Manager",
            phone: "012345678",
            email: "sok@example.com",
            hireDate: "2023-01-01",
            status: "active",
            depotCode: "MAIN_DEPOT",
        });

        worksheet.getRow(1).font = {bold: true};
        const buffer = await workbook.xlsx.writeBuffer();
        return buffer;
    }

    async verifyImport(fileBuffer) {
        const workbook = new Excel.Workbook();
        await workbook.xlsx.load(fileBuffer);
        const worksheet = workbook.getWorksheet(1);
        if (!worksheet) throw new Error("Worksheet not found");

        // Pre-fetch existing emails & employeeCodes for uniqueness check
        const existing = await prisma.employee.findMany({
            select: {email: true, employeeCode: true},
        });
        const existingEmails = new Set(
            existing.map((e) => e.email).filter(Boolean),
        );
        const existingCodes = new Set(
            existing.map((e) => e.employeeCode).filter(Boolean),
        );

        // Pre-fetch depots (code -> id)
        const depots = await prisma.depot.findMany({
            select: {code: true, id: true},
        });
        const depotMap = new Map(depots.map((d) => [d.code, d.id]));

        const validRows = [];
        const invalidRows = [];

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // skip header

            const getCellValue = (col) =>
                row.getCell(col).value?.toString().trim() || "";
            const khmerName = getCellValue(1);
            const englishName = getCellValue(2) || null;
            const employeeCode = getCellValue(3) || null;
            const images = getCellValue(4) || null;
            let dateOfBirth = row.getCell(5).value;
            const gender = getCellValue(6) || null;
            const address = getCellValue(7) || null;
            const department = getCellValue(8) || null;
            const position = getCellValue(9) || null;
            const phone = getCellValue(10) || null;
            const email = getCellValue(11);
            let hireDate = row.getCell(12).value;
            const status = getCellValue(13).toLowerCase() || "active";
            const depotCode = getCellValue(14) || null;

            const errors = [];

            // Required
            if (!khmerName) errors.push("khmerName is required");
            if (!email) errors.push("email is required");
            else if (!/^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/.test(email))
                errors.push("invalid email format");

            // Uniqueness
            if (email && existingEmails.has(email))
                errors.push(`email "${email}" already exists`);
            if (employeeCode && existingCodes.has(employeeCode))
                errors.push(`employeeCode "${employeeCode}" already exists`);

            // Dates
            if (dateOfBirth) {
                const d = new Date(dateOfBirth);
                if (isNaN(d.getTime())) errors.push("dateOfBirth is invalid");
                else dateOfBirth = d;
            } else dateOfBirth = null;
            if (hireDate) {
                const d = new Date(hireDate);
                if (isNaN(d.getTime())) errors.push("hireDate is invalid");
                else hireDate = d;
            } else hireDate = null;

            // Gender enum
            if (
                gender &&
                !["MALE", "FEMALE", "OTHER"].includes(gender.toUpperCase())
            ) {
                errors.push("gender must be MALE/FEMALE/OTHER");
            }
            // Status
            if (status && !["active", "inactive"].includes(status)) {
                errors.push("status must be active/inactive");
            }

            // Depot validation
            let depotId = null;
            if (depotCode) {
                if (depotMap.has(depotCode)) depotId = depotMap.get(depotCode);
                else errors.push(`depotCode "${depotCode}" not found`);
            }

            const formatDateForPreview = (val) => {
                if (!val) return "";
                if (val instanceof Date) return val.toISOString().split("T")[0];
                return String(val).trim();
            };

            const previewData = {
                khmerName,
                englishName,
                employeeCode,
                images,
                dateOfBirth: formatDateForPreview(dateOfBirth),
                gender: gender ? gender.toUpperCase() : null,
                address,
                department,
                position,
                phone,
                email,
                hireDate: formatDateForPreview(hireDate),
                status,
                depotCode: depotCode || "",
            };

            if (errors.length) {
                invalidRows.push({rowNumber, errors, data: previewData});
            } else {
                validRows.push({rowNumber, data: {...previewData, depotId}});
            }
        });

        return {
            summary: {
                totalRows: validRows.length + invalidRows.length,
                validCount: validRows.length,
                invalidCount: invalidRows.length,
            },
            validRows,
            invalidRows,
        };
    }

    // ---------- 3. Bulk Import (Insert into DB) ----------
    async bulkImport(fileBuffer) {
        // First verify to get validated data
        const verification = await this.verifyImport(fileBuffer);
        if (verification.invalidRows.length > 0) {
            throw new Error(
                `Cannot import: ${verification.invalidRows.length} rows have errors. Use /verify endpoint to see details.`,
            );
        }

        const employeesToCreate = verification.validRows.map((v) => {
            const {depotCode, ...employeeData} = v.data;
            return employeeData;
        });

        // Insert using transaction
        const result = await prisma.$transaction(async (tx) => {
            const created = await tx.employee.createMany({
                data: employeesToCreate,
                skipDuplicates: false,
            });
            return created;
        });

        return {
            importedCount: result.count,
            message: `Successfully imported ${result.count} employees`,
        };
    }

    async bulkImportJson(employeeList) {
        if (!Array.isArray(employeeList) || employeeList.length === 0) {
            throw new Error("No employees provided for import");
        }

        const depots = await prisma.depot.findMany({
            select: {code: true, id: true},
        });
        const depotMap = new Map(depots.map((d) => [d.code, d.id]));

        const result = {
            success: true,
            total: employeeList.length,
            successCount: 0,
            failedCount: 0,
            errors: [],
            data: [],
        };

        for (let i = 0; i < employeeList.length; i++) {
            const emp = employeeList[i];
            const rowNum = i + 1;
            try {
                if (!emp.khmerName?.trim()) throw new Error("khmerName is required");
                if (!emp.email?.trim()) throw new Error("email is required");

                let depotId = null;
                if (emp.depotCode?.trim()) {
                    depotId = depotMap.get(emp.depotCode.trim()) ?? null;
                    if (!depotId)
                        throw new Error(`depotCode "${emp.depotCode}" not found`);
                }

                const created = await prisma.employee.create({
                    data: {
                        khmerName: emp.khmerName.trim(),
                        englishName: emp.englishName?.trim() || null,
                        employeeCode: emp.employeeCode?.trim() || null,
                        images: emp.images?.trim() || null,
                        dateOfBirth: emp.dateOfBirth ? new Date(emp.dateOfBirth) : null,
                        gender: emp.gender?.trim()?.toUpperCase() || null,
                        address: emp.address?.trim() || null,
                        department: emp.department?.trim() || null,
                        position: emp.position?.trim() || null,
                        phone: emp.phone?.trim() || null,
                        email: emp.email.trim(),
                        hireDate: emp.hireDate ? new Date(emp.hireDate) : null,
                        status: emp.status?.trim()?.toLowerCase() || "active",
                        depotId,
                    },
                });

                result.successCount += 1;
                result.data.push(created);
            } catch (err) {
                result.failedCount += 1;
                result.errors.push({
                    row: rowNum,
                    name: emp.khmerName || emp.englishName || `Row ${rowNum}`,
                    error: err.message,
                });
            }
        }

        if (result.failedCount > 0 && result.successCount === 0) {
            result.success = false;
        }

        return result;
    }
}

export default new EmployeeService();
