import { prisma } from '../config/db.js';
import logger from '../config/logger.js';

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
                        _count: {
                            select: { districts: true }
                        }
                    }
                }),
                prisma.province.count({ where })
            ]);

            const result = {
                provinces,
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
            const existingProvince = await prisma.findUnique({
                where: { id }
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
                where: { id },
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
}

export default new ProvinceService();
