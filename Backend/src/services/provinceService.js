import { prisma } from '../config/db.js';
import logger from '../config/logger.js';
import Excel from 'exceljs';

class ProvinceService {
    cache = new Map();

    // Get all provinces with pagination and filters
    async getAllProvinces(query) {
        try {
            const cacheKey = JSON.stringify(query);
            if (this.cache.has(cacheKey)) {
                return this.cache.get(cacheKey);
            }

            const {
                page = 1,
                limit = 10,
                search = '',
                region,
                isActive,
                sortBy = 'createdAt',
                sortOrder = 'desc'
            } = query;

            const skip = (page - 1) * limit;

            // Build where clause
            const where = {};

            if (search) {
                where.OR = [
                    { name: { contains: search, mode: 'insensitive' } },
                    { code: { contains: search, mode: 'insensitive' } }
                ];
            }


            // Get provinces with count
            const [provinces, total] = await Promise.all([
                prisma.province.findMany({
                    where,
                    skip,
                    take: parseInt(limit),
                    orderBy: { [sortBy]: sortOrder },
                    include: {
                        districts: {
                            include: {
                                _count: {
                                    select: {
                                        depots: true
                                    }
                                }
                            }
                        }
                    }
                }),
                prisma.province.count({ where })
            ]);
            const formattedProvinces = provinces.map(province => {
                const depotCount = province.districts.reduce(
                    (total, district) => total + district._count.depots,
                    0
                );

                return {
                    id: province.id,
                    code: province.code,
                    name: province.name,
                    createdAt: province.createdAt,
                    updatedAt: province.updatedAt,
                    depotCount
                };
            });

            const result = {
                provinces: formattedProvinces,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            };

            this.cache.set(cacheKey, result);
            return result;
        } catch (error) {
            logger.error('Get all provinces service error:', error);
            throw error;
        }
    }

    async getById(id) {
        try {
            return await prisma.province.findUnique({
                where: { id: parseInt(id) },
                include: {
                    districts: {
                        include: {
                            _count: {
                                select: { depots: true }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            logger.error('ProvinceService getById error:', error);
            throw error;
        }
    }

    async createProvince(data) {
        try {
            const { code, name } = data;

            if (!code) {
                throw new Error('Province code is required for unique check');
            }

            // Check if province code exists
            const existingProvince = await prisma.province.findUnique({
                where: { code }
            });
            if (existingProvince) {
                throw new Error('Province code already exists');
            }


            const province = await prisma.province.create({
                data: {
                    code,
                    name,
                },
                include: {
                    districts: {
                        select: {
                            id: true,
                            code: true,
                            name: true
                        }
                    }
                }
            });

            logger.info('Province created successfully:', { provinceId: province.id, code: province.code, name: province.name });

            this.cache.clear();
            return province;

        } catch (error) {
            logger.error('ProvinceService create error:', error);
            throw error;
        }
    }

    async update(id, data) {
        try {

            //check if province exiting
            const existingProvince = await prisma.province.findUnique({
                where: { id:Number(id) }
            })
            if (!existingProvince) {
                throw new Error('Province not found');
            }
            // Check if code is being changed and already exists
            if (data.code && data.code !== existingProvince.code) {
                const codeExists = await prisma.province.findUnique({
                    where: { code: data.code }
                })
                if (codeExists) {
                    throw new Error('Province code already exists');
                }
            }

            const province = await prisma.province.update({
                where: { id: Number(id), },
                data: {
                    name: data.name,
                    code: data.code
                }
            });

            logger.info(`Province updated: ${province.code} - ${province.name}`);
            this.cache.clear();
            return province;
        } catch (error) {
            logger.error('ProvinceService update error:', error);
            throw error;
        }
    }

    // Get province by code
    async getProvinceByCode(code) {
        try {
            const province = await prisma.province.findUnique({
                where: { code }

            });

            if (!province) {
                throw new Error('Province not found');
            }

            return province;
        } catch (error) {
            logger.error('Get province by code service error:', error);
            throw error;
        }
    }

    async delete(id) {
        try {
            // Check if it has districts first?
            const districtsCount = await prisma.district.count({
                where: { provinceId: parseInt(id) }
            });

            if (districtsCount > 0) {
                throw new Error('Cannot delete province with associated districts');
            }

            const result = await prisma.province.delete({
                where: { id: parseInt(id) }
            });
            this.cache.clear();
            return result;
        } catch (error) {
            logger.error('ProvinceService delete error:', error);
            throw error;
        }
    }

    //bulk Operation 
    // ---------- Generate Template ----------
    async generateProvinceTemplate() {
        const workbook = new Excel.Workbook();
        const worksheet = workbook.addWorksheet('Provinces');

        worksheet.columns = [
            { header: 'provinceName *', key: 'name', width: 25 },
            { header: 'code', key: 'code', width: 20 },
        ];
        worksheet.getRow(1).font = { bold: true };
        worksheet.addRow({ name: 'Phnom Penh', code: 'PP' });
        worksheet.addRow({ name: 'Siem Reap', code: 'SR' });

        return await workbook.xlsx.writeBuffer();
    }

    // ---------- Verify Import ----------
    async verifyProvinceImport(fileBuffer) {
        const workbook = new Excel.Workbook();
        await workbook.xlsx.load(fileBuffer);
        const worksheet = workbook.getWorksheet(1);
        if (!worksheet) throw new Error('Worksheet not found');

        // Pre‑fetch existing provinces (to check uniqueness of name and code)
        const existingProvinces = await prisma.province.findMany({
            select: { name: true, code: true }
        });
        const existingNames = new Set(existingProvinces.map(p => p.name.toLowerCase().trim()));
        const existingCodes = new Set(existingProvinces.map(p => p.code?.toLowerCase().trim()).filter(Boolean));

        const validRows = [];
        const invalidRows = [];

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;

            const name = row.getCell(1).value?.toString().trim();
            const code = row.getCell(2).value?.toString().trim() || null;

            // Skip completely empty rows
            if (!name && !code) return;

            const errors = [];

            if (!name) {
                errors.push('Province name is required');
            } else {
                const nameLower = name.toLowerCase();
                if (existingNames.has(nameLower)) {
                    errors.push(`Province name "${name}" already exists`);
                }
            }

            if (code) {
                const codeLower = code.toLowerCase();
                if (existingCodes.has(codeLower)) {
                    errors.push(`Province code "${code}" already exists`);
                }
            }

            const rowData = { name, code };
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
    async bulkImportProvinces(fileBuffer) {
        const verification = await this.verifyProvinceImport(fileBuffer);
        if (verification.invalidRows.length) {
            throw new Error(`Cannot import: ${verification.invalidRows.length} rows have errors.`);
        }

        const provincesToCreate = verification.validRows.map(v => v.data);
        const result = await prisma.province.createMany({
            data: provincesToCreate,
            skipDuplicates: false
        });
        
        this.cache.clear();
        return { importedCount: result.count, message: `Imported ${result.count} provinces` };
    }
}

export default new ProvinceService();
