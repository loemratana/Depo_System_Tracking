import { prisma } from "../config/db.js";
import logger from "../config/logger.js";
import { uploadImageBuffer, isCloudinaryConfigured } from "../config/cloudinary.js";
import { v2 as cloudinary } from "cloudinary";

class ManagerService {
  async getAll(filters = {}, pagination = { page: 1, limit: 10 }) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;
    const where = {};

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { phone: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const [managers, total] = await Promise.all([
      prisma.manager.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { depots: true } },
        },
      }),
      prisma.manager.count({ where }),
    ]);

    return {
      managers,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getById(id) {
    const parsedId = Number(id);
    if (isNaN(parsedId)) throw new Error("Invalid manager ID format");
    
    const manager = await prisma.manager.findUnique({
      where: { id: parsedId },
      include: {
        depots: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    if (!manager) throw new Error("Manager not found");
    return manager;
  }

  async create(data) {
    try {
      const manager = await prisma.manager.create({
        data: {
          name: data.name,
          phone: data.phone || null,
          photoUrl: data.photoUrl || null,
        },
      });
      logger.info(`Manager created: ${manager.id}`);
      return manager;
    } catch (error) {
      logger.error("ManagerService create error:", error);
      throw error;
    }
  }

  async update(id, data) {
    try {
      const parsedId = Number(id);
      if (isNaN(parsedId)) throw new Error("Invalid manager ID format");

      const updateData = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.photoUrl !== undefined) updateData.photoUrl = data.photoUrl;

      const manager = await prisma.manager.update({
        where: { id: parsedId },
        data: updateData,
      });

      logger.info(`Manager updated: ${manager.id}`);
      return manager;
    } catch (error) {
      logger.error("ManagerService update error:", error);
      throw error;
    }
  }

  async delete(id) {
    try {
      const parsedId = Number(id);
      if (isNaN(parsedId)) throw new Error("Invalid manager ID format");

      const manager = await prisma.manager.delete({
        where: { id: parsedId },
      });
      
      logger.info(`Manager deleted: ${manager.id}`);
      return manager;
    } catch (error) {
      logger.error("ManagerService delete error:", error);
      throw error;
    }
  }

  async uploadImage(id, fileBuffer) {
    try {
      const parsedId = Number(id);
      if (isNaN(parsedId)) throw new Error("Invalid manager ID");
      if (!isCloudinaryConfigured()) throw new Error("Cloudinary not configured");

      const result = await uploadImageBuffer(fileBuffer, { folder: "depot-system/managers" });
      const photoUrl = result.url;

      const manager = await prisma.manager.update({
        where: { id: parsedId },
        data: { photoUrl },
      });

      return manager;
    } catch (error) {
      logger.error(`ManagerService uploadImage error for id ${id}:`, error);
      throw error;
    }
  }

  async removeImage(id) {
    try {
      const parsedId = Number(id);
      if (isNaN(parsedId)) throw new Error("Invalid manager ID");

      const manager = await prisma.manager.findUnique({ where: { id: parsedId } });
      if (!manager) throw new Error("Manager not found");

      // Optional: Delete from Cloudinary if possible, but for now we just clear the DB field
      // to keep it simple as publicId might not be easily extractable without saving it.

      const updatedManager = await prisma.manager.update({
        where: { id: parsedId },
        data: { photoUrl: null },
      });

      return updatedManager;
    } catch (error) {
      logger.error(`ManagerService removeImage error for id ${id}:`, error);
      throw error;
    }
  }
}

export default new ManagerService();
