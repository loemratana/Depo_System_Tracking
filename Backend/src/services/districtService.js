import { prisma } from '../config/db.js';
import logger from '../config/logger.js';

class DistrictService {
    // Get All Districts with Filters

    async getAll(query = {}) {
        try {
            const { page = 1, limit = 10, provinceId, sortBy = 'name', sortOrder = 'asc', search = '' } = query;
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

            const [districts, total] = await Promise.all([
                prisma.district.findMany({
                    where,
                    skip,
                    take: parseInt(limit),
                    include: {
                        province: {
                            select: { name: true, code: true }
                        },
                        _count: {
                            select: { depots: true }
                        }
                    },
                    orderBy: { [sortBy]: sortOrder }
                }),
                prisma.district.count({ where })
            ]);

            return {
                districts,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(total / limit)
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
}

export default new DistrictService();
