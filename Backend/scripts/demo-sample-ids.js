/**
 * Print sample IDs for manager demo checklist.
 * Usage (from Backend/): node --env-file=.env.local scripts/demo-sample-ids.js
 */
import { prisma } from "../src/config/db.js";

const brand = await prisma.brand.findFirst({
  orderBy: { depots: { _count: "desc" } },
  include: { _count: { select: { depots: true } } },
});
const assigned = await prisma.depot.findFirst({
  where: { employeeId: { not: null } },
  include: { employee: true, brand: true },
});
const vacancy = await prisma.depot.findFirst({
  where: { OR: [{ status: "vacancy" }, { employeeId: null }] },
});

console.log(`
Brand:     #${brand?.id} ${brand?.name} (${brand?._count.depots} depots)
Assigned:  #${assigned?.id} ${assigned?.code} → ${assigned?.employee?.englishName}
Vacancy:   #${vacancy?.id} ${vacancy?.code}
`);
await prisma.$disconnect();
