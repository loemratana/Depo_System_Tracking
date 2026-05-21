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
                    // 🔽 Connect employee if we have an ID
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

}

export default new DepotService();