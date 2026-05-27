import { prisma } from '../config/db.js';
import logger from '../config/logger.js';
import Excel from 'exceljs';

class EmployeeService {
    async getAll(filters = {}, pagination = { page: 1, limit: 10 }) {
        const { page, limit } = pagination;
        const skip = (page - 1) * limit;

        const where = {};
        if (filters.search) {
            where.OR = [
                { khmerName: { contains: filters.search, mode: 'insensitive' } },
                { englishName: { contains: filters.search, mode: 'insensitive' } },
                { employeeCode: { contains: filters.search, mode: 'insensitive' } }
            ];
        }
        if (filters.department) {
            where.department = filters.department;
        }
        if (filters.depotId) {
            where.depotId = parseInt(filters.depotId);
        }

        const [employees, total] = await Promise.all([
            prisma.employee.findMany({
                where,
                skip,
                take: limit,
                include: {
                    depot: {
                        select: {
                            name: true,
                            code: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.employee.count({ where })
        ]);

        return {
            employees,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        };
    }

    async getById(id) {
        const parsedId = parseInt(id);
        if (isNaN(parsedId)) {
            return null;
        }
        return prisma.employee.findUnique({
            where: { id: parsedId },
            include: {
                depot: true,
                user: {
                    select: {
                        username: true,
                        role: true,
                        status: true
                    }
                },
                assignments: {
                    include: {
                        depot: true
                    }
                }
            }
        });
    }

    async create(data) {
        try {

            // Check employee code
            if (data.employeeCode) {
                const existingEmployee = await prisma.employee.findUnique({
                    where: {
                        employeeCode: data.employeeCode
                    }
                });

                if (existingEmployee) {
                    throw new Error('Employee code already exists');
                }
            }

            // Check email
            if (data.email) {
                const existingEmployee = await prisma.employee.findFirst({
                    where: {
                        email: data.email
                    }
                });

                if (existingEmployee) {
                    throw new Error('Email already exists');
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

                    dateOfBirth: data.dateOfBirth
                        ? new Date(data.dateOfBirth)
                        : null,

                    gender: data.gender,
                    address: data.address,
                    department: data.department,
                    position: data.position,
                    phone: data.phone,
                    email: data.email,

                    hireDate: data.hireDate
                        ? new Date(data.hireDate)
                        : null,

                    status: data.status || 'active',

                    depotId: depotId
                },

                include: {
                    depot: true
                }
            });

            logger.info(
                `Employee created: ${employee.id} - ${employee.khmerName}`
            );

            return employee;

        } catch (error) {

            logger.error('EmployeeService create error:', error);

            throw error;
        }
    }

    async update(id, data) {
        try {
            const parsedId = parseInt(id);
            if (isNaN(parsedId)) {
                throw new Error('Invalid employee ID format');
            }

            // Whitelist only fields that exist in the Prisma schema for Employee
            const allowedFields = [
                'khmerName',
                'englishName',
                'employeeCode',
                'images',
                'gender',
                'address',
                'department',
                'position',
                'phone',
                'email',
                'status'
            ];

            const updateData = {};
            for (const key of allowedFields) {
                if (data[key] !== undefined) {
                    updateData[key] = data[key];
                }
            }

            if (data.depotId !== undefined) {
                updateData.depotId = data.depotId ? parseInt(data.depotId) : null;
            }

            if (data.dateOfBirth !== undefined) {
                updateData.dateOfBirth = data.dateOfBirth ? new Date(data.dateOfBirth) : null;
            }

            if (data.hireDate !== undefined) {
                updateData.hireDate = data.hireDate ? new Date(data.hireDate) : null;
            }

            // Check duplicate employee code excluding this employee
            if (updateData.employeeCode) {
                const existingEmployee = await prisma.employee.findFirst({
                    where: {
                        employeeCode: updateData.employeeCode,
                        id: { not: parsedId }
                    }
                });

                if (existingEmployee) {
                    throw new Error('Employee code already exists');
                }
            }

            // Check duplicate email excluding this employee
            if (updateData.email) {
                const existingEmployee = await prisma.employee.findFirst({
                    where: {
                        email: updateData.email,
                        id: { not: parsedId }
                    }
                });

                if (existingEmployee) {
                    throw new Error('Email already exists');
                }
            }

            const employee = await prisma.employee.update({
                where: { id: parsedId },
                data: updateData,
                include: {
                    depot: true
                }
            });

            logger.info(`Employee updated: ${employee.id}`);
            return employee;

        }
        catch (error) {
            logger.error("EmployeeService update error:", error);
            throw error;
        }
    }


    async findById(id) {
        try {
            const parsedId = parseInt(id);
            if (isNaN(parsedId)) return null;

            const employee = await prisma.employee.findUnique({
                where: { id: parsedId },
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
                    depotId: true,
                    depot: {
                        select: {
                            id: true,
                            name: true,
                            code: true,
                            district: {
                                select: {
                                    id: true,
                                    name: true,
                                    province: {
                                        select: { id: true, name: true }
                                    }
                                    // commune is not available – remove it
                                }
                            }
                        }
                    }
                }
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
                throw new Error('Invalid employee ID format');
            }
            const employee = await prisma.employee.delete({
                where: { id: parsedId }
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
            select: { department: true },
            distinct: ['department'],
            where: { department: { not: null } }
        });
        return departments.map(d => d.department);
    }


    async getEmployeeDepotDetails(employeeId) {
        try {

            const result = await prisma.$queryRaw`
    SELECT *
    FROM vw_employee_depot
    WHERE employee_id = ${Number(employeeId)}
`;

            return result;

        } catch (error) {
            logger.error("EmployeeService error:", error);
            throw error;
        }
    }
    /**
     * Bulk import employees with validation, depot/district/province auto-creation, and duplicate detection.
     * Processes imports record-by-record for granular error reporting (partial success).
     * Uses optimized in-memory lookup caches to prevent N+1 queries.
     *
     * @param {Array} employeeList - Array of raw employee records to import
     * @returns {Promise<Object>} Import operations summary
     */
    // async bulkImport(employeeList) {
    //     try {
    //         logger.info(`Starting bulk import for ${employeeList.length} records.`);

    //         // 1. Pre-fetch depots, districts, provinces, and existing employees (codes, emails, phones)
    //         const [depots, districts, provinces, existingEmployees] = await Promise.all([
    //             prisma.depot.findMany({ select: { id: true, name: true, code: true } }),
    //             prisma.district.findMany({ select: { id: true, name: true, code: true } }),
    //             prisma.province.findMany({ select: { id: true, name: true, code: true } }),
    //             prisma.employee.findMany({
    //                 select: { employeeCode: true, email: true, phone: true }
    //             })
    //         ]);

    //         // Depot name/code → ID mapping (fast O(1) lookup)
    //         const depotMap = new Map();
    //         depots.forEach(d => {
    //             if (d.name) depotMap.set(d.name.toLowerCase().trim(), d.id);
    //             if (d.code) depotMap.set(d.code.toLowerCase().trim(), d.id);
    //         });

    //         // District name → ID mapping
    //         const districtMap = new Map();
    //         districts.forEach(d => {
    //             if (d.name) districtMap.set(d.name.toLowerCase().trim(), d.id);
    //         });

    //         // Province name → ID mapping
    //         const provinceMap = new Map();
    //         provinces.forEach(p => {
    //             if (p.name) provinceMap.set(p.name.toLowerCase().trim(), p.id);
    //         });

    //         // Sets of existing unique fields in DB
    //         const existingCodes = new Set(
    //             existingEmployees.map(e => e.employeeCode?.toLowerCase().trim()).filter(Boolean)
    //         );
    //         const existingEmails = new Set(
    //             existingEmployees.map(e => e.email?.toLowerCase().trim()).filter(Boolean)
    //         );
    //         const existingPhones = new Set(
    //             existingEmployees.map(e => e.phone?.trim()).filter(Boolean)
    //         );

    //         const successList = [];
    //         const errorList = [];

    //         // Batch-level duplicate tracking (within the uploaded file)
    //         const batchCodes = new Set();
    //         const batchEmails = new Set();
    //         const batchPhones = new Set();

    //         // 2. Iterate and process each record
    //         for (let i = 0; i < employeeList.length; i++) {
    //             const record = employeeList[i];
    //             const rowNum = i + 1;

    //             // Support multiple field naming conventions
    //             const rawName = record.khmerName || record.employeeName || record.name;
    //             const rawCode = record.employeeCode || record.code;
    //             const rawEmail = record.email;
    //             const rawPhone = record.phone;
    //             const rawDepot = record.depot || record.depotName || record.depotCode;

    //             const khmerName = rawName ? String(rawName).trim() : '';
    //             const englishName = record.englishName ? String(record.englishName).trim() : null;
    //             const employeeCode = rawCode ? String(rawCode).trim() : null;
    //             const email = rawEmail ? String(rawEmail).trim().toLowerCase() : null;
    //             const phone = rawPhone ? String(rawPhone).trim() : null;

    //             // --- VALIDATIONS ---

    //             // A. Name is required
    //             if (!khmerName) {
    //                 errorList.push({
    //                     row: rowNum,
    //                     name: 'Unknown',
    //                     error: 'Employee Name (Khmer Name) is a required field.'
    //                 });
    //                 continue;
    //             }

    //             // B. Employee Code uniqueness (DB + batch)
    //             let codeError = false;
    //             if (employeeCode) {
    //                 const normalizedCode = employeeCode.toLowerCase();
    //                 if (existingCodes.has(normalizedCode) || batchCodes.has(normalizedCode)) {
    //                     errorList.push({
    //                         row: rowNum,
    //                         name: khmerName,
    //                         error: `Employee code '${employeeCode}' is already registered.`
    //                     });
    //                     codeError = true;
    //                 } else {
    //                     batchCodes.add(normalizedCode);
    //                 }
    //             }

    //             // C. Email uniqueness (DB + batch)
    //             let emailError = false;
    //             if (email) {
    //                 const normalizedEmail = email.toLowerCase();
    //                 if (existingEmails.has(normalizedEmail) || batchEmails.has(normalizedEmail)) {
    //                     errorList.push({
    //                         row: rowNum,
    //                         name: khmerName,
    //                         error: `Email '${email}' is already registered.`
    //                     });
    //                     emailError = true;
    //                 } else {
    //                     batchEmails.add(normalizedEmail);
    //                 }
    //             }

    //             // D. Phone uniqueness (DB + batch) – optional, only if phone is provided
    //             let phoneError = false;
    //             if (phone) {
    //                 if (existingPhones.has(phone) || batchPhones.has(phone)) {
    //                     errorList.push({
    //                         row: rowNum,
    //                         name: khmerName,
    //                         error: `Phone number '${phone}' is already registered.`
    //                     });
    //                     phoneError = true;
    //                 } else {
    //                     batchPhones.add(phone);
    //                 }
    //             }

    //             // If any uniqueness check failed, skip this row
    //             if (codeError || emailError || phoneError) {
    //                 continue;
    //             }

    //             // --- DEPOT/DISTRICT/PROVINCE HANDLING (auto-create hierarchical objects if missing) ---
    //             let depotId = null;
    //             if (rawDepot) {
    //                 const normalizedDepot = String(rawDepot).toLowerCase().trim();
    //                 if (depotMap.has(normalizedDepot)) {
    //                     depotId = depotMap.get(normalizedDepot);
    //                 } else {
    //                     // Depot not found – create hierarchical geography (Province -> District -> Depot)
    //                     try {
    //                         const rawProvinceName = record.province || record.provinceName || 'General Province';
    //                         const rawDistrictName = record.district || record.districtName || 'General District';

    //                         const provinceName = String(rawProvinceName).trim();
    //                         const normalizedProvince = provinceName.toLowerCase();

    //                         let provinceId = null;
    //                         if (provinceMap.has(normalizedProvince)) {
    //                             provinceId = provinceMap.get(normalizedProvince);
    //                         } else {
    //                             // Create new Province
    //                             const newProvince = await prisma.province.create({
    //                                 data: {
    //                                     name: provinceName,
    //                                     code: provinceName.substring(0, 10).toUpperCase().replace(/\s+/g, '_')
    //                                 }
    //                             });
    //                             provinceId = newProvince.id;
    //                             provinceMap.set(normalizedProvince, provinceId);
    //                             logger.info(`Created new Province: ${provinceName} (ID: ${provinceId})`);
    //                         }

    //                         const districtName = String(rawDistrictName).trim();
    //                         const normalizedDistrict = districtName.toLowerCase();

    //                         let districtId = null;
    //                         if (districtMap.has(normalizedDistrict)) {
    //                             districtId = districtMap.get(normalizedDistrict);
    //                         } else {
    //                             // Create new District under the province
    //                             const newDistrict = await prisma.district.create({
    //                                 data: {
    //                                     name: districtName,
    //                                     provinceId: provinceId,
    //                                     code: districtName.substring(0, 10).toUpperCase().replace(/\s+/g, '_')
    //                                 }
    //                             });
    //                             districtId = newDistrict.id;
    //                             districtMap.set(normalizedDistrict, districtId);
    //                             logger.info(`Created new District: ${districtName} under Province ID: ${provinceId} (ID: ${districtId})`);
    //                         }

    //                         // Create new Depot under the resolved district
    //                         const newDepot = await prisma.depot.create({
    //                             data: {
    //                                 name: rawDepot,
    //                                 code: rawDepot.substring(0, 20).toUpperCase().replace(/\s+/g, '_'),
    //                                 districtId: districtId,
    //                                 status: 'active'
    //                             }
    //                         });
    //                         depotId = newDepot.id;

    //                         // Update cache for subsequent rows
    //                         depotMap.set(normalizedDepot, depotId);
    //                         logger.info(`Created new Depot: ${rawDepot} under District ID: ${districtId} (ID: ${depotId})`);
    //                     } catch (geoError) {
    //                         logger.error(`Failed to build geography for depot '${rawDepot}':`, geoError);
    //                         errorList.push({
    //                             row: rowNum,
    //                             name: khmerName,
    //                             error: `Geography lookup or creation failed: ${geoError.message}`
    //                         });
    //                         continue;
    //                     }
    //                 }
    //             }

    //             // --- DATE PARSING ---
    //             let dateOfBirth = null;
    //             if (record.dateOfBirth) {
    //                 const parsedDob = new Date(record.dateOfBirth);
    //                 if (!isNaN(parsedDob.getTime())) dateOfBirth = parsedDob;
    //             }

    //             let hireDate = null;
    //             if (record.hireDate) {
    //                 const parsedHire = new Date(record.hireDate);
    //                 if (!isNaN(parsedHire.getTime())) hireDate = parsedHire;
    //             }

    //             // --- INSERT EMPLOYEE ---
    //             try {
    //                 const newEmployee = await prisma.employee.create({
    //                     data: {
    //                         khmerName,
    //                         englishName,
    //                         employeeCode,
    //                         phone,
    //                         email,
    //                         depotId,
    //                         gender: record.gender || null,
    //                         address: record.address || null,
    //                         department: record.department || null,
    //                         position: record.position || null,
    //                         images: record.images || null,
    //                         dateOfBirth,
    //                         hireDate,
    //                         status: record.status || 'active'
    //                     },
    //                     include: {
    //                         depot: { select: { name: true, code: true } }
    //                     }
    //                 });

    //                 successList.push(newEmployee);

    //                 // Update caches to prevent duplicates within the same batch
    //                 if (employeeCode) existingCodes.add(employeeCode.toLowerCase());
    //                 if (email) existingEmails.add(email.toLowerCase());
    //                 if (phone) existingPhones.add(phone);

    //             } catch (dbError) {
    //                 logger.error(`Database error inserting row ${rowNum} (${khmerName}):`, dbError);
    //                 errorList.push({
    //                     row: rowNum,
    //                     name: khmerName,
    //                     error: `Database error: ${dbError.message}`
    //                 });
    //             }
    //         }

    //         logger.info(`Bulk import finished. Total: ${employeeList.length}, Success: ${successList.length}, Failed: ${errorList.length}`);

    //         return {
    //             success: true,
    //             total: employeeList.length,
    //             successCount: successList.length,
    //             failedCount: errorList.length,
    //             errors: errorList,
    //             data: successList
    //         };

    //     } catch (error) {
    //         logger.error('EmployeeService bulkImport system error:', error);
    //         throw error;
    //     }
    // }
    // ---------- 1. Generate Excel Template (Buffer) ----------
    async generateTemplate() {
        const workbook = new Excel.Workbook();
        const worksheet = workbook.addWorksheet('Employees');

        worksheet.columns = [
            { header: 'khmerName *', key: 'khmerName', width: 20 },
            { header: 'englishName', key: 'englishName', width: 20 },
            { header: 'employeeCode', key: 'employeeCode', width: 15 },
            { header: 'images', key: 'images', width: 30 },
            { header: 'dateOfBirth', key: 'dateOfBirth', width: 15 },
            { header: 'gender', key: 'gender', width: 10 },
            { header: 'address', key: 'address', width: 30 },
            { header: 'department', key: 'department', width: 20 },
            { header: 'position', key: 'position', width: 20 },
            { header: 'phone', key: 'phone', width: 15 },
            { header: 'email *', key: 'email', width: 25 },
            { header: 'hireDate', key: 'hireDate', width: 15 },
            { header: 'status', key: 'status', width: 10 },
            { header: 'depotCode', key: 'depotCode', width: 20 },
        ];

        // Add one example row
        worksheet.addRow({
            khmerName: 'សុខ សុភាព',
            englishName: 'Sok Sopheap',
            employeeCode: 'EMP001',
            images: 'https://example.com/avatar.jpg',
            dateOfBirth: '1990-01-01',
            gender: 'MALE',
            address: 'Phnom Penh',
            department: 'Sales',
            position: 'Manager',
            phone: '012345678',
            email: 'sok@example.com',
            hireDate: '2023-01-01',
            status: 'active',
            depotCode: 'MAIN_DEPOT'
        });

        worksheet.getRow(1).font = { bold: true };
        const buffer = await workbook.xlsx.writeBuffer();
        return buffer;
    }



    async verifyImport(fileBuffer) {
        const workbook = new Excel.Workbook();
        await workbook.xlsx.load(fileBuffer);
        const worksheet = workbook.getWorksheet(1);
        if (!worksheet) throw new Error('Worksheet not found');

        // Pre-fetch existing emails & employeeCodes for uniqueness check
        const existing = await prisma.employee.findMany({
            select: { email: true, employeeCode: true }
        });
        const existingEmails = new Set(existing.map(e => e.email).filter(Boolean));
        const existingCodes = new Set(existing.map(e => e.employeeCode).filter(Boolean));

        // Pre-fetch depots (code -> id)
        const depots = await prisma.depot.findMany({ select: { code: true, id: true } });
        const depotMap = new Map(depots.map(d => [d.code, d.id]));

        const validRows = [];
        const invalidRows = [];

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // skip header

            const getCellValue = (col) => row.getCell(col).value?.toString().trim() || '';
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
            const status = getCellValue(13).toLowerCase() || 'active';
            const depotCode = getCellValue(14) || null;

            const errors = [];

            // Required
            if (!khmerName) errors.push('khmerName is required');
            if (!email) errors.push('email is required');
            else if (!/^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/.test(email)) errors.push('invalid email format');

            // Uniqueness
            if (email && existingEmails.has(email)) errors.push(`email "${email}" already exists`);
            if (employeeCode && existingCodes.has(employeeCode)) errors.push(`employeeCode "${employeeCode}" already exists`);

            // Dates
            if (dateOfBirth) {
                const d = new Date(dateOfBirth);
                if (isNaN(d.getTime())) errors.push('dateOfBirth is invalid');
                else dateOfBirth = d;
            } else dateOfBirth = null;
            if (hireDate) {
                const d = new Date(hireDate);
                if (isNaN(d.getTime())) errors.push('hireDate is invalid');
                else hireDate = d;
            } else hireDate = null;

            // Gender enum
            if (gender && !['MALE', 'FEMALE', 'OTHER'].includes(gender.toUpperCase())) {
                errors.push('gender must be MALE/FEMALE/OTHER');
            }
            // Status
            if (status && !['active', 'inactive'].includes(status)) {
                errors.push('status must be active/inactive');
            }

            // Depot validation
            let depotId = null;
            if (depotCode) {
                if (depotMap.has(depotCode)) depotId = depotMap.get(depotCode);
                else errors.push(`depotCode "${depotCode}" not found`);
            }

            const formatDateForPreview = (val) => {
                if (!val) return '';
                if (val instanceof Date) return val.toISOString().split('T')[0];
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
                depotCode: depotCode || '',
            };

            if (errors.length) {
                invalidRows.push({ rowNumber, errors, data: previewData });
            } else {
                validRows.push({ rowNumber, data: { ...previewData, depotId } });
            }
        });

        return {
            summary: {
                totalRows: validRows.length + invalidRows.length,
                validCount: validRows.length,
                invalidCount: invalidRows.length
            },
            validRows,
            invalidRows
        };
    }

    // ---------- 3. Bulk Import (Insert into DB) ----------
    async bulkImport(fileBuffer) {
        // First verify to get validated data
        const verification = await this.verifyImport(fileBuffer);
        if (verification.invalidRows.length > 0) {
            throw new Error(`Cannot import: ${verification.invalidRows.length} rows have errors. Use /verify endpoint to see details.`);
        }

        const employeesToCreate = verification.validRows.map((v) => {
            const { depotCode, ...employeeData } = v.data;
            return employeeData;
        });

        // Insert using transaction
        const result = await prisma.$transaction(async (tx) => {
            const created = await tx.employee.createMany({
                data: employeesToCreate,
                skipDuplicates: false
            });
            return created;
        });

        return {
            importedCount: result.count,
            message: `Successfully imported ${result.count} employees`
        };
    }

    async bulkImportJson(employeeList) {
        if (!Array.isArray(employeeList) || employeeList.length === 0) {
            throw new Error('No employees provided for import');
        }

        const depots = await prisma.depot.findMany({ select: { code: true, id: true } });
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
                if (!emp.khmerName?.trim()) throw new Error('khmerName is required');
                if (!emp.email?.trim()) throw new Error('email is required');

                let depotId = null;
                if (emp.depotCode?.trim()) {
                    depotId = depotMap.get(emp.depotCode.trim()) ?? null;
                    if (!depotId) throw new Error(`depotCode "${emp.depotCode}" not found`);
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
                        status: emp.status?.trim()?.toLowerCase() || 'active',
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
