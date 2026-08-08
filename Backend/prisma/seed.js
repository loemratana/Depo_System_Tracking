/**
 * Local demo seed — fills tables so dashboard/reports have data.
 * Safe for local Docker DB only (does not target production).
 *
 * Run: node prisma/seed.js
 */
import bcrypt from "bcryptjs";
import { prisma } from "../src/config/db.js";

function monthsAgo(n) {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - n, 1));
}

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

async function clearDemoData() {
  console.log("Clearing existing demo rows...");
  await prisma.brandDepotMonthKpi.deleteMany();
  await prisma.kpiValue.deleteMany();
  await prisma.importBatch.deleteMany();
  await prisma.kpiPackItem.deleteMany();
  await prisma.kpiPackAssignment.deleteMany();
  await prisma.kpiPack.deleteMany();
  await prisma.kpiDefinition.deleteMany();
  await prisma.employeeKPI.deleteMany();
  await prisma.employeeDocument.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.report.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.depot.deleteMany();
  await prisma.user.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.district.deleteMany();
  await prisma.province.deleteMany();
}

async function main() {
  console.log("Seeding local demo data...");
  await clearDemoData();

  // ── Provinces & Districts ──────────────────────────────
  const provinceDefs = [
    {
      name: "Phnom Penh",
      code: "PP",
      districts: ["Chamkar Mon", "Toul Kork", "Sen Sok"],
    },
    { name: "Siem Reap", code: "SR", districts: ["Siem Reap", "Angkor Thom"] },
    { name: "Battambang", code: "BTB", districts: ["Battambang", "Thma Koul"] },
    { name: "Kandal", code: "KD", districts: ["Ta Khmau", "Kien Svay"] },
    {
      name: "Kampong Cham",
      code: "KC",
      districts: ["Kampong Cham", "Prey Chhor"],
    },
  ];

  const provinces = [];
  for (const p of provinceDefs) {
    const province = await prisma.province.create({
      data: { name: p.name, code: p.code },
    });
    const districts = [];
    for (let i = 0; i < p.districts.length; i++) {
      const district = await prisma.district.create({
        data: {
          name: p.districts[i],
          code: `${p.code}${String(i + 1).padStart(2, "0")}`,
          provinceId: province.id,
        },
      });
      districts.push(district);
    }
    provinces.push({ ...province, districts });
  }
  console.log(
    `Provinces: ${provinces.length}, Districts: ${provinces.reduce((n, p) => n + p.districts.length, 0)}`,
  );

  // ── Brands ─────────────────────────────────────────────
  const brandDefs = [
    { name: "Coca-Cola", code: "KO", description: "Beverage brand" },
    { name: "Pepsi", code: "PEP", description: "Soft drinks" },
    { name: "Nestlé", code: "NES", description: "Food & dairy" },
    { name: "Unilever", code: "UL", description: "FMCG household" },
    { name: "ABC", code: "ABC", description: "Local distribution brand" },
  ];

  const brands = [];
  for (const b of brandDefs) {
    brands.push(
      await prisma.brand.create({
        data: { ...b, status: "active" },
      }),
    );
  }
  console.log(`Brands: ${brands.length}`);

  // ── Employees (sale supervisors) ───────────────────────
  const employeeDefs = [
    {
      englishName: "Sokha Chan",
      khmerName: "សុខា ចាន់",
      employeeCode: "EMP001",
      department: "Sales",
      position: "Sale Supervisor",
    },
    {
      englishName: "Dara Kim",
      khmerName: "តារា គឹម",
      employeeCode: "EMP002",
      department: "Sales",
      position: "Sale Supervisor",
    },
    {
      englishName: "Sreymom Ly",
      khmerName: "ស្រីមុំ លី",
      employeeCode: "EMP003",
      department: "Sales",
      position: "Sale Supervisor",
    },
    {
      englishName: "Vannak Pich",
      khmerName: "វណ្ណៈ ពេជ្រ",
      employeeCode: "EMP004",
      department: "Operations",
      position: "Field Manager",
    },
    {
      englishName: "Chenda Sok",
      khmerName: "ចេនដា សុខ",
      employeeCode: "EMP005",
      department: "Sales",
      position: "Sale Supervisor",
    },
    {
      englishName: "Bopha Mean",
      khmerName: "បុប្ផា មាន",
      employeeCode: "EMP006",
      department: "Sales",
      position: "Sale Supervisor",
    },
  ];

  const employees = [];
  for (let i = 0; i < employeeDefs.length; i++) {
    const e = employeeDefs[i];
    employees.push(
      await prisma.employee.create({
        data: {
          ...e,
          email: `${e.employeeCode.toLowerCase()}@depot.local`,
          phone: `012${String(100000 + i).slice(-6)}`,
          gender: i % 2 === 0 ? "male" : "female",
          hireDate: monthsAgo(8 - i),
          dateOfBirth: new Date(1990 + i, i % 12, 10 + i),
          salary: 450 + i * 50,
          status: i === 5 ? "inactive" : "active",
          address: `${provinces[i % provinces.length].name}, Cambodia`,
        },
      }),
    );
  }
  console.log(`Employees: ${employees.length}`);

  // ── Depots (mix of active / vacancy / expiry states) ───
  const depotStatuses = [
    "active",
    "active",
    "active",
    "vacancy",
    "active",
    "inactive",
    "active",
    "vacancy",
    "active",
    "active",
    "active",
    "vacancy",
  ];
  const depots = [];

  for (let i = 0; i < 24; i++) {
    const province = provinces[i % provinces.length];
    const district = province.districts[i % province.districts.length];
    const brand = brands[i % brands.length];
    const employee =
      depotStatuses[i % depotStatuses.length] === "vacancy"
        ? null
        : employees[i % employees.length];
    const status = depotStatuses[i % depotStatuses.length];

    let expiryDate = daysFromNow(60 + (i % 90));
    if (i % 8 === 0)
      expiryDate = daysFromNow(-10); // expired
    else if (i % 7 === 0) expiryDate = daysFromNow(15); // expiring soon

    depots.push(
      await prisma.depot.create({
        data: {
          name: `${brand.name} Depot ${province.code}-${i + 1}`,
          khmerName: `ឃ្លាំង ${i + 1}`,
          code: `DEP-${String(i + 1).padStart(3, "0")}`,
          address: `Street ${10 + i}, ${district.name}`,
          phone: `015${String(200000 + i).slice(-6)}`,
          status,
          commune: `Commune ${i + 1}`,
          village: `Village ${i + 1}`,
          street: `St. ${100 + i}`,
          houseNumber: String(i + 1),
          provinceId: province.id,
          districtId: district.id,
          brandId: brand.id,
          employeeId: employee?.id ?? null,
          assignedAt: employee ? monthsAgo(i % 5) : null,
          expiryDate,
          sex: i % 2 === 0 ? "male" : "female",
          DepotIdNumber: `ID${100000 + i}`,
          note: status === "vacancy" ? "Awaiting supervisor assignment" : null,
          createdAt: monthsAgo(i % 6),
        },
      }),
    );
  }
  console.log(`Depots: ${depots.length}`);

  // ── Staff ──────────────────────────────────────────────
  let staffCount = 0;
  for (const depot of depots
    .filter((d) => d.status === "active")
    .slice(0, 12)) {
    await prisma.staff.create({
      data: {
        depotId: depot.id,
        name: `Staff ${depot.code}`,
        email: `staff.${depot.code.toLowerCase()}@depot.local`,
        phone: `016${String(300000 + depot.id).slice(-6)}`,
      },
    });
    staffCount++;
  }
  console.log(`Staff: ${staffCount}`);

  // ── Employee KPIs ──────────────────────────────────────
  let kpiCount = 0;
  const activeDepots = depots.filter(
    (d) => d.status === "active" && d.employeeId,
  );
  for (let m = 2; m >= 0; m--) {
    const month = monthsAgo(m);
    for (const depot of activeDepots.slice(0, 15)) {
      const target = 100 + (depot.id % 5) * 20;
      const actual = Math.round(target * (0.65 + (depot.id % 7) * 0.07));
      await prisma.employeeKPI.create({
        data: {
          employeeId: depot.employeeId,
          depotId: depot.id,
          month,
          targetValue: target,
          actualValue: actual,
          performance: Math.round((actual / target) * 1000) / 10,
          remarks: actual >= target ? "On track" : "Needs follow-up",
        },
      });
      kpiCount++;
    }
  }
  console.log(`Employee KPIs: ${kpiCount}`);

  // ── Dynamic KPI catalog + backfill + Excel-style metrics ─
  const { seedKpiCatalog, backfillKpiValuesFromEmployeeKpi } =
    await import("../src/services/kpiCatalog.js");
  await seedKpiCatalog(prisma);
  const backfill = await backfillKpiValuesFromEmployeeKpi(prisma);
  console.log(
    `KPI catalog ready; backfilled ${backfill.valueRowsUpserted} value rows from ${backfill.legacyRows} legacy KPIs`,
  );

  const defs = await prisma.kpiDefinition.findMany({
    where: {
      code: { in: ["PRODUCT_AVAILABLE_PCT", "VOLUME_DISPLAY_PCT"] },
    },
  });
  const avail = defs.find((d) => d.code === "PRODUCT_AVAILABLE_PCT");
  const display = defs.find((d) => d.code === "VOLUME_DISPLAY_PCT");
  let extra = 0;
  if (avail && display) {
    const sample = await prisma.employeeKPI.findMany({
      take: 20,
      orderBy: { month: "desc" },
    });
    for (const row of sample) {
      const depot = await prisma.depot.findUnique({
        where: { id: row.depotId },
        select: { brandId: true },
      });
      const availablePct = 90 + (row.depotId % 10);
      const displayPct = 80 + (row.depotId % 15);
      for (const [def, value] of [
        [avail, availablePct],
        [display, displayPct],
      ]) {
        await prisma.kpiValue.upsert({
          where: {
            employeeId_depotId_kpiDefinitionId_periodMonth: {
              employeeId: row.employeeId,
              depotId: row.depotId,
              kpiDefinitionId: def.id,
              periodMonth: row.month,
            },
          },
          update: { actualValue: value, brandId: depot?.brandId ?? null },
          create: {
            employeeId: row.employeeId,
            depotId: row.depotId,
            brandId: depot?.brandId ?? null,
            kpiDefinitionId: def.id,
            periodMonth: row.month,
            actualValue: value,
          },
        });
        extra++;
      }
    }
  }
  console.log(`Extra availability/display KPI values: ${extra}`);

  // ── Brand monthly KPI rows (manager-entered demo) ─────────
  let brandMonthCount = 0;
  for (let m = 2; m >= 0; m--) {
    const month = monthsAgo(m);
    for (const depot of activeDepots.slice(0, 9)) {
      const brand = brands.find((item) => item.id === depot.brandId);
      const poTarget = 110 + (depot.id % 4) * 15 + (2 - m) * 5;
      const poActual = 85 + (depot.id % 6) * 12 + (2 - m) * 8;
      const productAvailablePct = Math.min(100, 88 + (depot.id % 7) + (2 - m));
      const volumeDisplayPct = Math.min(100, 78 + (depot.id % 9) + (2 - m) * 2);

      await prisma.brandDepotMonthKpi.upsert({
        where: {
          depotId_brandId_periodMonth: {
            depotId: depot.id,
            brandId: brand.id,
            periodMonth: month,
          },
        },
        update: {
          poActual,
          poTarget,
          productAvailablePct,
          volumeDisplayPct,
        },
        create: {
          depotId: depot.id,
          brandId: brand.id,
          periodMonth: month,
          poActual,
          poTarget,
          productAvailablePct,
          volumeDisplayPct,
        },
      });
      brandMonthCount++;
    }
  }
  console.log(`Brand monthly KPI rows: ${brandMonthCount}`);

  // ── Documents ──────────────────────────────────────────
  for (const emp of employees.slice(0, 4)) {
    await prisma.employeeDocument.create({
      data: {
        employeeId: emp.id,
        fileName: `${emp.employeeCode}_id_card.pdf`,
        fileUrl: `/uploads/demo/${emp.employeeCode}_id.pdf`,
        fileType: "application/pdf",
      },
    });
  }

  // ── Admin user ─────────────────────────────────────────
  const passwordHash = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.create({
    data: {
      username: "admin@local.dev",
      passwordHash,
      role: "admin",
      status: "active",
      employeeId: employees[0].id,
    },
  });

  // ── Sample report records ──────────────────────────────
  await prisma.report.createMany({
    data: [
      {
        generatedBy: admin.id,
        reportType: "depot",
        title: "Monthly Depot Status Report",
        parameters: { month: monthsAgo(0).toISOString().slice(0, 7) },
      },
      {
        generatedBy: admin.id,
        reportType: "sales",
        title: "Product Sales Summary",
        parameters: { brandId: brands[0].id },
      },
      {
        generatedBy: admin.id,
        reportType: "employee",
        title: "Brand Monthly KPI Demo",
        parameters: {
          month: monthsAgo(0).toISOString().slice(0, 7),
          openBrandFirst: brands[0].name,
        },
      },
      {
        generatedBy: admin.id,
        reportType: "inventory",
        title: "Low Stock Inventory",
        parameters: { status: "LOW" },
      },
    ],
  });

  console.log("────────────────────────────────────");
  console.log("Seed complete (local demo).");
  console.log("Login: admin@local.dev / admin123");
  console.log("────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
