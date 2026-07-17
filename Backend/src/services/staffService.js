import { prisma } from "../config/db.js";
import logger from "../config/logger.js";

class StaffService {
  async listByDepot(depotId) {
    const id = Number(depotId);
    if (isNaN(id)) throw new Error("Invalid depot ID");

    const depot = await prisma.depot.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!depot) throw new Error("Depot not found");

    return prisma.staff.findMany({
      where: { depotId: id },
      orderBy: { name: "asc" },
    });
  }

  async create(depotId, data) {
    const id = Number(depotId);
    if (isNaN(id)) throw new Error("Invalid depot ID");

    const name = data?.name?.trim();
    const email = data?.email?.trim()?.toLowerCase();
    const phone = data?.phone?.trim() || null;

    if (!name) throw new Error("Staff name is required");
    if (!email) throw new Error("Staff email is required");

    const depot = await prisma.depot.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!depot) throw new Error("Depot not found");

    const existing = await prisma.staff.findUnique({ where: { email } });
    if (existing) throw new Error("A staff member with this email already exists");

    const staff = await prisma.staff.create({
      data: {
        depotId: id,
        name,
        email,
        phone,
      },
    });

    logger.info(`Staff created: ${staff.id} for depot ${id}`);
    return staff;
  }

  async update(depotId, staffId, data) {
    const dId = Number(depotId);
    const sId = Number(staffId);
    if (isNaN(dId) || isNaN(sId)) throw new Error("Invalid ID");

    const staff = await prisma.staff.findFirst({
      where: { id: sId, depotId: dId },
    });
    if (!staff) throw new Error("Staff not found in this depot");

    const updateData = {};
    if (data.name !== undefined) {
      const name = String(data.name).trim();
      if (!name) throw new Error("Staff name is required");
      updateData.name = name;
    }
    if (data.email !== undefined) {
      const email = String(data.email).trim().toLowerCase();
      if (!email) throw new Error("Staff email is required");
      const existing = await prisma.staff.findFirst({
        where: { email, NOT: { id: sId } },
      });
      if (existing) throw new Error("A staff member with this email already exists");
      updateData.email = email;
    }
    if (data.phone !== undefined) {
      updateData.phone = data.phone ? String(data.phone).trim() : null;
    }

    return prisma.staff.update({
      where: { id: sId },
      data: updateData,
    });
  }

  async remove(depotId, staffId) {
    const dId = Number(depotId);
    const sId = Number(staffId);
    if (isNaN(dId) || isNaN(sId)) throw new Error("Invalid ID");

    const staff = await prisma.staff.findFirst({
      where: { id: sId, depotId: dId },
    });
    if (!staff) throw new Error("Staff not found in this depot");

    await prisma.staff.delete({ where: { id: sId } });
    logger.info(`Staff deleted: ${sId} from depot ${dId}`);
    return { id: sId };
  }
}

export const staffService = new StaffService();
export default staffService;
