import { prisma } from '../config/db.js';
import logger from '../config/logger.js';


class DepotService {

    async createDepot(data) {
        try {
            // 1. Check depot code uniqueness
            if (data.code) {
                const existing = await prisma.depot.findUnique({ where: { code: data.code } });
                if (existing) throw new Error('Depot code already exists');
            }

            // 2. Resolve employee (existing ID or create from typed name)
            let employeeId = data.employeeId;
            if (!employeeId && data.employeeName) {
                const newEmployee = await prisma.employee.create({
                    data: {
                        englishName: data.employeeName,
                        khmerName: data.employeeKhmerName || data.employeeName,
                        email: data.employeeEmail || null,
                        phone: data.employeePhone || null,
                        position: 'Owner',
                    }
                });
                employeeId = newEmployee.id;
                logger.info(`Created new employee: ${newEmployee.englishName} (ID: ${newEmployee.id})`);
            } else if (employeeId) {
                const exists = await prisma.employee.findUnique({ where: { id: employeeId } });
                if (!exists) throw new Error(`Employee ${employeeId} not found`);
            }

            // 3. Province & district (find or create)
            let province = await prisma.province.findFirst({ where: { name: data.provinceName } });
            if (!province) province = await prisma.province.create({ data: { name: data.provinceName } });

            let district = await prisma.district.findFirst({
                where: { name: data.districtName, provinceId: province.id }
            });
            if (!district) district = await prisma.district.create({
                data: { name: data.districtName, provinceId: province.id }
            });

            // 4. Create depot with employee connection
            const depot = await prisma.depot.create({
                data: {
                    name: data.name,
                    code: data.code,
                    address: data.address,
                    phone: data.phone,
                    status: data.status || 'active',
                    districtId: district.id,
                    //Connect employee if we have an ID
                    ...(employeeId && { employees: { connect: { id: employeeId } } }),
                },
                include: {
                    district: true,
                    employees: true,   // Note: plural 'employees' to match relation
                },
            });

            logger.info(`Depot created: ${depot.code} - ${depot.name}` +
                (depot.employees.length ? `, assigned to ${depot.employees[0].englishName}` : ''));
            return depot;
        } catch (error) {
            throw error;
        }
    }

    async getDepotsGroupByProvince(filters) {
        try {
            // Build where clause
            const where = {}
            if (filters.status && filters.status !== "all") {
                where.status = filters.status;
            }

            // Add date filters
            if (filters.fromDate || filters.toDate) {
                where.createdAt = {};
                if (filters.fromDate) where.createdAt.gte = new Date(filters.fromDate);
                if (filters.toDate) where.createdAt.lte = new Date(filters.toDate);
            }

            // Add search filter (code, name, or owner name)
            if (filters.search) {
                where.OR = [
                    { code: { contains: filters.search, mode: 'insensitive' } },
                    { name: { contains: filters.search, mode: 'insensitive' } },
                    { employees: { some: { khmerName: { contains: filters.search, mode: 'insensitive' } } } },
                    { employees: { some: { englishName: { contains: filters.search, mode: 'insensitive' } } } },
                ];
            }

            // Group by province and count depots
            const result = await prisma.province.groupBy({
                by: ['id', 'name'],
                where,
                _count: {
                    id: true,
                },
                orderBy: {
                    _count: { id: 'desc' },
                },
            });

            // Map to the desired format
            const groupedData = result.map(item => ({
                id: item.id,
                province: item.name,
                depotCount: item._count.id,
            }));

            return groupedData;
        } catch (error) {
            logger.error('Error in getDepotsGroupByProvince:', error);
            throw error;
        }
    }

    /**
 * Get all depots with filtering, pagination, sorting, group by province or district, and relation inclusion
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.pageSize - Items per page (default: 20)
 * @param {string} options.sortBy - Field to sort by (default: 'createdAt')
 * @param {string} options.sortOrder - 'asc' or 'desc' (default: 'desc')
 * @param {boolean} options.includeAddress - Include houseNumber, street, village, commune (default: false)
 * @param {Object} options.filters - Filter conditions
 * @param {string} options.filters.status - 'active', 'expired', 'inactive'
 * @param {string} options.filters.city - Province name
 * @param {string} options.filters.district - District name
 * @param {string} options.filters.company - Company name (partial match)
 * @param {string} options.filters.search - Search in code, name, owner name
 * @param {Date|string} options.filters.fromDate - Created at start date
 * @param {Date|string} options.filters.toDate - Created at end date
 * @returns {Promise<Object>} { data: [], pagination: {}, filtersApplied: {} }
 */

    async getAllDepot({
        page = 1,
        pageSize = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        groupBy = null,
        includeAddress = false,
        filters = {},
    }) {
        const skip = (page - 1) * pageSize;
        const orderBy = { [sortBy]: sortOrder }


        // Build where clause
        const where = {}

        if (filters.status && filters.status !== "all") {
            where.status = filters.status;
        }
        // 

        if (groupBy === "province") {

            const grouped = await this.getDepotsGroupByProvince(filters);
            return {
                grouped: true,
                data: grouped,
                filtersApplied: filters,
            };


        }

        if (filters.fromDate || filters.toDate) {
            where.createdAt = {};
            if (filters.fromDate) where.createdAt.gte = new Date(filters.fromDate);
            if (filters.toDate) where.createdAt.lte = new Date(filters.toDate);

        }
        if (filters.province) {
            where.district = { province: { name: { equals: filters.province, mode: 'insensitive' } } };
        }
        if (filters.district) {
            where.district = { name: { equals: filters.district, mode: 'insensitive' } };
        }
        if (filters.search) {
            where.OR = [
                { code: { contains: filters.search, mode: 'insensitive' } },
                { name: { contains: filters.search, mode: 'insensitive' } },
                { employees: { some: { khmerName: { contains: filters.search, mode: 'insensitive' } } } },
                { employees: { some: { englishName: { contains: filters.search, mode: 'insensitive' } } } },
            ];
        }

        // Determine which fields to select (exclude address by default)
        const selectFields = {
            id: true,
            code: true,
            name: true,
            phone: true,
            status: true,
            createdAt: true,
            // updatedAt: true,
            district: {
                select: { id: true, name: true, province: { select: { id: true, name: true } } },
            },
            employees: {
                take: 1,
                select: { id: true, khmerName: true, englishName: true, employeeCode: true, phone: true, email: true, position: true, images: true },
            },
        };

        // Include address fields only if requested (for detail view)
        // if (includeAddress) {
        //     selectFields.houseNumber = true;
        //     selectFields.street = true;
        //     selectFields.village = true;
        //     selectFields.commune = true;
        // }

        //fetch parallel query

        // Execute queries for data and total count using Prisma transaction to reduce network roundtrips
        const [depots, totalCount] = await prisma.$transaction([
            prisma.depot.findMany({
                where,
                skip,
                take: pageSize,
                orderBy,
                select: selectFields,
            }),
            prisma.depot.count({ where }),
        ]);

        // Format the response (flatten district and owner info)
        const formattedData = depots.map(depot => {
            const owner = depot.employees?.[0] || null;
            const result = {
                id: depot.id,
                code: depot.code,
                name: depot.name,
                phone: depot.phone,
                status: depot.status,
                // expiredDate: depot.expiredDate,
                createdAt: depot.createdAt,
                district: depot.district?.name,
                city: depot.district?.province?.name,
                owner: owner ? {
                    name: owner.khmerName || owner.englishName,
                    code: owner.employeeCode,
                    phone: owner.phone,
                    email: owner.email,
                    position: owner.position,
                    image: owner.images,
                } : null,
            };
            if (includeAddress) {
                result.address = {
                    houseNumber: depot.houseNumber,
                    street: depot.street,
                    village: depot.village,
                    commune: depot.commune,
                };
            }
            return result;
        });

        // Return paginated results
        return {
            data: formattedData,
            pagination: {
                page,
                pageSize,
                total: totalCount,
                totalPages: Math.ceil(totalCount / pageSize),
                hasNext: page * pageSize < totalCount,
                hasPrev: page > 1,
            },
            filtersApplied: filters,
        };

    }
}

export default new DepotService();