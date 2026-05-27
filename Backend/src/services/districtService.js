import { prisma } from '../config/db.js';
import logger from '../config/logger.js';
import Excel from 'exceljs';

class DistrictService {
    // Get All Districts with Filters

    async getAll(query = {}) {
        try {
            const {
                page = 1,
                limit = 20,
                provinceId,
                sortBy = 'name',
                sortOrder = 'asc',
                search = ''
            } = query;

            const where = {};

            if (provinceId) {
                where.provinceId = parseInt(provinceId);
            }

            if (search) {
                where.OR = [
                    { name: { contains: search, mode: 'insensitive' } },
                    { code: { contains: search, mode: 'insensitive' } }
                ];
            }

            const skip = (parseInt(page) - 1) * parseInt(limit);
            const take = parseInt(limit);

            // Whitelist allowed sort fields
            const allowedSortFields = ['name', 'code', 'createdAt', 'id'];
            const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'name';
            const validSortOrder = sortOrder === 'desc' ? 'desc' : 'asc';

            const [districts, total] = await Promise.all([
                prisma.district.findMany({
                    where,
                    skip,
                    take,
                    include: {
                        province: {
                            select: { name: true, code: true }
                        }
                    },
                    orderBy: { [validSortBy]: validSortOrder }
                }),
                prisma.district.count({ where })
            ]);

            // Format data for frontend (flatten province name)
            const formattedDistricts = districts.map(district => ({
                id: district.id,
                name: district.name,
                code: district.code,
                provinceId: district.provinceId,
                provinceName: district.province?.name || null,
                provinceCode: district.province?.code || null,
                createdAt: district.createdAt,
                updatedAt: district.updatedAt,
                // add any other fields your frontend expects
            }));

            return {
                districts: formattedDistricts,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: take,
                    pages: Math.ceil(total / take)
                }
            };
        } catch (error) {
            logger.error('DistrictService getAll error:', error);
            throw error;
        }
    }

    async getById(id) {
        try {
            return await prisma.district.findUnique({
                where: { id: parseInt(id) },
                include: {
                    province: true,
                    depots: true
                }
            });
        } catch (error) {
            logger.error('DistrictService getById error:', error);
            throw error;
        }
    }

    async create(data) {
        try {
            // Create District
            const { name, code, provinceId } = data;
            if (!name || !code || !provinceId) {
                throw new Error('Name, code and province ID are required');
            }

            //check if province exist
            const existingProvince = await prisma.province.findUnique({
                where: { id: parseInt(provinceId) }
            })
            if (!existingProvince) {
                throw new Error('Province not found');
            }

            //check if district code already exist
            const existingDistrict = await prisma.district.findFirst({
                where: { code }
            })
            if (existingDistrict) {
                throw new Error('District code already exists');
            }

            const district = await prisma.district.create({
                data: {
                    name,
                    code,
                    provinceId: parseInt(provinceId)
                }
            });

            logger.info(`District created: ${district.code} - ${district.name}`);
            return district;
        } catch (error) {
            logger.error('DistrictService create error:', error);
            throw error;
        }
    }

    async update(id, data) {
        try {
            return await prisma.district.update({
                where: { id: parseInt(id) },
                data: {
                    name: data.name,
                    code: data.code,
                    provinceId: data.provinceId ? parseInt(data.provinceId) : undefined
                }
            });
        } catch (error) {
            logger.error('DistrictService update error:', error);
            throw error;
        }
    }

    async delete(id) {
        try {
            // Check if it has depots first?
            const depotsCount = await prisma.depot.count({
                where: { districtId: parseInt(id) }
            });

            if (depotsCount > 0) {
                throw new Error('Cannot delete district with associated depots');
            }

            return await prisma.district.delete({
                where: { id: parseInt(id) }
            });
        } catch (error) {
            logger.error('DistrictService delete error:', error);
            throw error;
        }
    }


    //bulk Operation 
    // ---------- Generate Template ----------
    async generateDistrictTemplate() {
        const workbook = new Excel.Workbook();
        const worksheet = workbook.addWorksheet('Districts');

        worksheet.columns = [
            { header: 'provinceName *', key: 'provinceName', width: 25 },
            { header: 'districtName *', key: 'districtName', width: 25 },
            { header: 'code', key: 'code', width: 20 },
        ];
        worksheet.getRow(1).font = { bold: true };
        worksheet.addRow({ provinceName: 'Phnom Penh', districtName: 'Chamkar Mon', code: 'PPM' });
        worksheet.addRow({ provinceName: 'Siem Reap', districtName: 'Siem Reap City', code: 'SRC' });

        return await workbook.xlsx.writeBuffer();
    }

    // ---------- Verify Import ----------
    async verifyDistrictImport(fileBuffer) {
        const workbook = new Excel.Workbook();
        await workbook.xlsx.load(fileBuffer);
        const worksheet = workbook.getWorksheet(1);
        if (!worksheet) throw new Error('Worksheet not found');

        // Pre‑fetch all provinces (name -> id)
        const provinces = await prisma.province.findMany({ select: { id: true, name: true } });
        const provinceMap = new Map(provinces.map(p => [p.name, p.id]));

        // Pre‑fetch existing districts (to check uniqueness per province? We'll use name+provinceId)
        const existingDistricts = await prisma.district.findMany({
            select: { name: true, provinceId: true, code: true }
        });
        const existingKeys = new Set(existingDistricts.map(d => `${d.provinceId}|${d.name}`));
        const existingCodes = new Set(existingDistricts.map(d => d.code).filter(Boolean));

        const validRows = [];
        const invalidRows = [];

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;

            const provinceName = row.getCell(1).value?.toString().trim();
            const districtName = row.getCell(2).value?.toString().trim();
            const code = row.getCell(3).value?.toString().trim() || null;

            // Skip completely empty rows
            if (!provinceName && !districtName && !code) return;

            const errors = [];

            if (!provinceName) errors.push('Province name is required');
            if (!districtName) errors.push('District name is required');

            let provinceId = null;
            if (provinceName && provinceMap.has(provinceName)) {
                provinceId = provinceMap.get(provinceName);
            } else if (provinceName) {
                errors.push(`Province "${provinceName}" not found`);
            }

            if (districtName && provinceId && existingKeys.has(`${provinceId}|${districtName}`)) {
                errors.push(`District "${districtName}" already exists in province "${provinceName}"`);
            }
            if (code && existingCodes.has(code)) {
                errors.push(`District code "${code}" already exists`);
            }

            const rowData = { provinceId, name: districtName, code, provinceName, districtName };
            if (errors.length) {
                invalidRows.push({ rowNumber, errors });
            } else {
                validRows.push({ rowNumber, data: rowData });
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

    // ---------- Bulk Import ----------
    async bulkImportDistricts(fileBuffer) {
        const verification = await this.verifyDistrictImport(fileBuffer);

        if (verification.validRows.length === 0) {
            throw new Error('No valid rows to import. Please fix all errors and try again.');
        }

        const districtsToCreate = verification.validRows.map(v => ({
            provinceId: v.data.provinceId,
            name: v.data.name,
            code: v.data.code
        }));

        const result = await prisma.district.createMany({
            data: districtsToCreate,
            skipDuplicates: true
        });

        return {
            importedCount: result.count,
            skippedCount: verification.invalidRows.length,
            message: `Imported ${result.count} district(s)${verification.invalidRows.length > 0 ? `, skipped ${verification.invalidRows.length} invalid row(s)` : ''}`
        };
    }




}

export default new DistrictService();
