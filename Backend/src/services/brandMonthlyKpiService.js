import ExcelJS from "exceljs";
import { prisma } from "../config/db.js";
import { utcMonthEnd, utcMonthStart } from "../helpers/date.helper.js";
import { seedKpiCatalog } from "./kpiCatalog.js";

const CODE_PO_COUNT = "PO_COUNT";
const CODE_PO_TARGET = "PO_TARGET";
const CODE_AVAILABLE = "PRODUCT_AVAILABLE_PCT";
const CODE_DISPLAY = "VOLUME_DISPLAY_PCT";

function parseMonthInput(month) {
  if (!month) return utcMonthStart(new Date());
  if (typeof month === "string" && /^\d{4}-\d{2}$/.test(month)) {
    const [year, mon] = month.split("-").map(Number);
    return new Date(Date.UTC(year, mon - 1, 1));
  }
  if (typeof month === "string" && /^\d{1,2}$/.test(month)) {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), Number(month) - 1, 1));
  }
  const value = month instanceof Date ? month : new Date(month);
  if (Number.isNaN(value.getTime())) {
    throw new Error("Invalid month. Expected YYYY-MM.");
  }
  return utcMonthStart(value);
}

function monthRange(periodMonth) {
  const start = utcMonthStart(periodMonth);
  const end = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1),
  );
  return { start, end };
}

/** Optional province filter on BrandDepotMonthKpi via depot relation. */
function withProvinceOnKpi(where, provinceId) {
  if (!provinceId) return where;
  const id = Number(provinceId);
  if (!id) return where;
  return {
    ...where,
    depot: {
      ...(where.depot || {}),
      provinceId: id,
    },
  };
}

function monthLabel(date) {
  return date.toISOString().slice(0, 7);
}

function asNullableNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const numeric = Number(value);
  return Number.isNaN(numeric) ? null : numeric;
}

function cellRaw(value) {
  if (value == null) return value;
  if (value instanceof Date) return monthLabel(utcMonthStart(value));
  if (typeof value === "object") {
    if ("result" in value) return cellRaw(value.result);
    if ("text" in value) return value.text;
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join("");
    }
  }
  return value;
}

class BrandMonthlyKpiService {
  #catalogReady = false;

  async ensureCatalog() {
    if (this.#catalogReady) return;
    const existing = await prisma.kpiDefinition.count({
      where: {
        code: {
          in: [CODE_PO_COUNT, CODE_PO_TARGET, CODE_AVAILABLE, CODE_DISPLAY],
        },
      },
    });
    if (existing < 4) {
      await seedKpiCatalog(prisma);
    }
    this.#catalogReady = true;
  }

  async getDefinitionMap() {
    await this.ensureCatalog();
    const defs = await prisma.kpiDefinition.findMany({
      where: {
        code: {
          in: [CODE_PO_COUNT, CODE_PO_TARGET, CODE_AVAILABLE, CODE_DISPLAY],
        },
      },
    });
    return Object.fromEntries(defs.map((item) => [item.code, item]));
  }

  async resolveDepotBrand({ depotId, brandId }) {
    const depot = await prisma.depot.findUnique({
      where: { id: Number(depotId) },
      include: {
        employee: {
          select: {
            id: true,
            englishName: true,
            khmerName: true,
            employeeCode: true,
          },
        },
        brand: { select: { id: true, name: true } },
        district: {
          select: { name: true, province: { select: { name: true } } },
        },
      },
    });

    if (!depot) throw new Error("Depot not found");
    if (!depot.brandId) throw new Error("Depot is not assigned to a brand");
    if (Number(brandId) !== Number(depot.brandId)) {
      throw new Error("Depot does not belong to the selected brand");
    }

    return depot;
  }

  async syncMirrorValues({
    depot,
    brandId,
    periodMonth,
    poActual,
    poTarget,
    productAvailablePct,
    volumeDisplayPct,
  }) {
    const employeeId = depot.employeeId ?? null;
    if (!employeeId) return;

    const defMap = await this.getDefinitionMap();
    const metrics = [
      {
        code: CODE_PO_COUNT,
        actualValue: Number(poActual ?? 0),
        targetValue: poTarget == null ? null : Number(poTarget),
      },
      {
        code: CODE_PO_TARGET,
        actualValue: Number(poTarget ?? 0),
        targetValue: poTarget == null ? null : Number(poTarget),
      },
      {
        code: CODE_AVAILABLE,
        actualValue: productAvailablePct,
        targetValue: null,
      },
      {
        code: CODE_DISPLAY,
        actualValue: volumeDisplayPct,
        targetValue: null,
      },
    ];

    for (const metric of metrics) {
      const def = defMap[metric.code];
      if (!def || metric.actualValue == null) continue;
      await prisma.kpiValue.upsert({
        where: {
          employeeId_depotId_kpiDefinitionId_periodMonth: {
            employeeId,
            depotId: depot.id,
            kpiDefinitionId: def.id,
            periodMonth,
          },
        },
        update: {
          brandId,
          actualValue: Number(metric.actualValue),
          targetValue: metric.targetValue,
          score: null,
        },
        create: {
          employeeId,
          depotId: depot.id,
          brandId,
          kpiDefinitionId: def.id,
          periodMonth,
          actualValue: Number(metric.actualValue),
          targetValue: metric.targetValue,
          score: null,
        },
      });
    }

    if (poTarget != null || poActual != null) {
      await prisma.employeeKPI.upsert({
        where: {
          employeeId_depotId_month: {
            employeeId,
            depotId: depot.id,
            month: periodMonth,
          },
        },
        update: {
          targetValue: Number(poTarget ?? 0),
          actualValue: Number(poActual ?? 0),
          performance:
            poTarget > 0
              ? Number((((poActual ?? 0) / poTarget) * 100).toFixed(1))
              : 0,
        },
        create: {
          employeeId,
          depotId: depot.id,
          month: periodMonth,
          targetValue: Number(poTarget ?? 0),
          actualValue: Number(poActual ?? 0),
          performance:
            poTarget > 0
              ? Number((((poActual ?? 0) / poTarget) * 100).toFixed(1))
              : 0,
        },
      });
    }
  }

  mapMonthlyRow(row) {
    const poActual = Number(row.poActual || 0);
    const poTarget = row.poTarget == null ? null : Number(row.poTarget);
    const poPercent =
      poTarget != null && poTarget > 0
        ? Number(((poActual / poTarget) * 100).toFixed(1))
        : null;

    return {
      id: row.id,
      depotId: row.depotId,
      depotName: row.depot?.name ?? "",
      brandId: row.brandId,
      brandName: row.brand?.name ?? "",
      month: monthLabel(row.periodMonth),
      poActual,
      poTarget,
      poPercent,
      productAvailablePct:
        row.productAvailablePct == null
          ? null
          : Number(row.productAvailablePct),
      volumeDisplayPct:
        row.volumeDisplayPct == null ? null : Number(row.volumeDisplayPct),
    };
  }

  async listMonthlyKpis({
    brandId,
    provinceId,
    month,
    search,
    includeMissing,
    page,
    pageSize,
    all,
  } = {}) {
    const periodMonth = parseMonthInput(month);
    const { start, end } = monthRange(periodMonth);
    const wantMissing =
      includeMissing === true ||
      includeMissing === "true" ||
      includeMissing === "1";
    const returnAll =
      all === true || all === "true" || all === "1" || all === 1;

    const pageNum = Math.max(1, Number(page) || 1);
    const size = Math.min(100, Math.max(1, Number(pageSize) || 10));

    const paginateRows = (rows, total) => {
      if (returnAll) {
        return {
          data: rows,
          pagination: {
            page: 1,
            pageSize: rows.length || size,
            total,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          },
        };
      }
      const totalPages = Math.max(1, Math.ceil(total / size));
      const safePage = Math.min(pageNum, totalPages);
      return {
        data: rows,
        pagination: {
          page: safePage,
          pageSize: size,
          total,
          totalPages,
          hasNext: safePage < totalPages,
          hasPrev: safePage > 1,
        },
      };
    };

    // All branded depots for the month, including rows with no KPI yet
    if (wantMissing) {
      const brandFilter = brandId ? Number(brandId) : null;
      if (brandFilter) {
        const brand = await prisma.brand.findUnique({
          where: { id: brandFilter },
          select: { id: true, name: true },
        });
        if (!brand) throw new Error("Brand not found");
      }

      const where = {
        brandId: brandFilter ? brandFilter : { not: null },
        ...(provinceId ? { provinceId: Number(provinceId) } : {}),
        ...(search?.trim()
          ? { name: { contains: search.trim(), mode: "insensitive" } }
          : {}),
      };

      const total = await prisma.depot.count({ where });
      const totalPages = Math.max(1, Math.ceil(total / size));
      const safePage = returnAll ? 1 : Math.min(pageNum, totalPages);

      const depots = await prisma.depot.findMany({
        where,
        select: {
          id: true,
          name: true,
          brandId: true,
          brand: { select: { id: true, name: true } },
          brandMonthKpis: {
            where: {
              periodMonth: { gte: start, lt: end },
              ...(brandFilter ? { brandId: brandFilter } : {}),
            },
            take: 1,
            select: {
              id: true,
              depotId: true,
              brandId: true,
              periodMonth: true,
              poActual: true,
              poTarget: true,
              productAvailablePct: true,
              volumeDisplayPct: true,
            },
          },
        },
        orderBy: [{ brand: { name: "asc" } }, { name: "asc" }],
        ...(returnAll
          ? {}
          : { skip: (safePage - 1) * size, take: size }),
      });

      const mapped = depots
        .filter((depot) => depot.brandId && depot.brand)
        .map((depot) => {
          const row = depot.brandMonthKpis[0];
          if (row) {
            return this.mapMonthlyRow({
              ...row,
              brand: depot.brand,
              depot: { id: depot.id, name: depot.name },
            });
          }
          return {
            id: null,
            depotId: depot.id,
            depotName: depot.name,
            brandId: depot.brand.id,
            brandName: depot.brand.name,
            month: monthLabel(periodMonth),
            poActual: 0,
            poTarget: null,
            poPercent: null,
            productAvailablePct: null,
            volumeDisplayPct: null,
          };
        });

      return paginateRows(mapped, total);
    }

    const where = withProvinceOnKpi(
      {
        periodMonth: { gte: start, lt: end },
        ...(brandId ? { brandId: Number(brandId) } : {}),
        ...(search?.trim()
          ? {
              OR: [
                {
                  depot: {
                    name: { contains: search.trim(), mode: "insensitive" },
                  },
                },
                {
                  brand: {
                    name: { contains: search.trim(), mode: "insensitive" },
                  },
                },
              ],
            }
          : {}),
      },
      provinceId,
    );

    const total = await prisma.brandDepotMonthKpi.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / size));
    const safePage = returnAll ? 1 : Math.min(pageNum, totalPages);

    const rows = await prisma.brandDepotMonthKpi.findMany({
      where,
      select: {
        id: true,
        depotId: true,
        brandId: true,
        periodMonth: true,
        poActual: true,
        poTarget: true,
        productAvailablePct: true,
        volumeDisplayPct: true,
        brand: { select: { id: true, name: true } },
        depot: { select: { id: true, name: true } },
      },
      orderBy: [{ brand: { name: "asc" } }, { depot: { name: "asc" } }],
      ...(returnAll ? {} : { skip: (safePage - 1) * size, take: size }),
    });

    return paginateRows(
      rows.map((row) => this.mapMonthlyRow(row)),
      total,
    );
  }

  async upsertMonthlyKpi(input) {
    const brandId = Number(input.brandId);
    const depot = await this.resolveDepotBrand({
      depotId: input.depotId,
      brandId,
    });
    const periodMonth = parseMonthInput(input.month);
    const hasPoActual = Object.prototype.hasOwnProperty.call(input, "poActual");
    const hasPoTarget = Object.prototype.hasOwnProperty.call(input, "poTarget");
    const hasAvailable = Object.prototype.hasOwnProperty.call(
      input,
      "productAvailablePct",
    );
    const hasDisplay = Object.prototype.hasOwnProperty.call(
      input,
      "volumeDisplayPct",
    );

    const poActual = hasPoActual ? Number(input.poActual ?? 0) : undefined;
    const poTarget = hasPoTarget ? asNullableNumber(input.poTarget) : undefined;
    const productAvailablePct = hasAvailable
      ? asNullableNumber(input.productAvailablePct)
      : undefined;
    const volumeDisplayPct = hasDisplay
      ? asNullableNumber(input.volumeDisplayPct)
      : undefined;

    const row = await prisma.brandDepotMonthKpi.upsert({
      where: {
        depotId_brandId_periodMonth: {
          depotId: depot.id,
          brandId,
          periodMonth,
        },
      },
      update: {
        ...(hasPoActual ? { poActual } : {}),
        ...(hasPoTarget ? { poTarget } : {}),
        ...(hasAvailable ? { productAvailablePct } : {}),
        ...(hasDisplay ? { volumeDisplayPct } : {}),
      },
      create: {
        depotId: depot.id,
        brandId,
        periodMonth,
        poActual: poActual ?? 0,
        poTarget: poTarget ?? null,
        productAvailablePct: productAvailablePct ?? null,
        volumeDisplayPct: volumeDisplayPct ?? null,
      },
      include: {
        brand: { select: { id: true, name: true } },
        depot: { select: { id: true, name: true } },
      },
    });

    await this.syncMirrorValues({
      depot,
      brandId,
      periodMonth,
      poActual: row.poActual,
      poTarget: row.poTarget,
      productAvailablePct: row.productAvailablePct,
      volumeDisplayPct: row.volumeDisplayPct,
    });

    return this.mapMonthlyRow(row);
  }

  async setBrandTarget({ depotId, brandId, month, targetPo }) {
    const depot = await this.resolveDepotBrand({ depotId, brandId });
    const periodMonth = parseMonthInput(month);
    const poTarget = Number(targetPo);

    const row = await prisma.brandDepotMonthKpi.upsert({
      where: {
        depotId_brandId_periodMonth: {
          depotId: depot.id,
          brandId: Number(brandId),
          periodMonth,
        },
      },
      update: { poTarget },
      create: {
        depotId: depot.id,
        brandId: Number(brandId),
        periodMonth,
        poActual: 0,
        poTarget,
      },
      include: {
        brand: { select: { id: true, name: true } },
        depot: {
          select: {
            id: true,
            name: true,
            code: true,
            district: {
              select: { name: true, province: { select: { name: true } } },
            },
            employee: {
              select: {
                id: true,
                khmerName: true,
                englishName: true,
                employeeCode: true,
              },
            },
          },
        },
      },
    });

    await this.syncMirrorValues({
      depot,
      brandId: Number(brandId),
      periodMonth,
      poActual: row.poActual,
      poTarget,
      productAvailablePct: row.productAvailablePct,
      volumeDisplayPct: row.volumeDisplayPct,
    });

    return this.mapMonthlyRow(row);
  }

  async importMonthlyRows({ rows = [] }) {
    const imported = [];
    const errors = [];
    for (let index = 0; index < rows.length; index += 1) {
      const raw = rows[index];
      try {
        const row = await this.upsertMonthlyKpi(raw);
        imported.push(row);
      } catch (error) {
        errors.push({
          rowNumber: index + 2,
          message: error.message,
          data: raw,
        });
      }
    }
    return {
      importedRows: imported.length,
      failedRows: errors.length,
      rows: imported,
      errors,
      message:
        errors.length === 0
          ? `Imported ${imported.length} row(s)`
          : `Imported ${imported.length} row(s), ${errors.length} failed`,
    };
  }

  async importTargetRows({ rows = [] }) {
    const imported = [];
    const errors = [];
    for (let index = 0; index < rows.length; index += 1) {
      const raw = rows[index];
      try {
        const row = await this.setBrandTarget({
          depotId: raw.depotId,
          brandId: raw.brandId,
          month: raw.month,
          targetPo: raw.targetPo ?? raw.poTarget,
        });
        imported.push(row);
      } catch (error) {
        errors.push({
          rowNumber: index + 2,
          message: error.message,
          data: raw,
        });
      }
    }
    return {
      importedRows: imported.length,
      failedRows: errors.length,
      rows: imported,
      errors,
      message:
        errors.length === 0
          ? `Imported ${imported.length} target row(s)`
          : `Imported ${imported.length} target row(s), ${errors.length} failed`,
    };
  }

  async generateTargetTemplate({ brandId, month }) {
    const periodMonth = parseMonthInput(month);
    const brand = await prisma.brand.findUnique({
      where: { id: Number(brandId) },
      select: { id: true, name: true },
    });
    if (!brand) throw new Error("Brand not found");

    const depots = await prisma.depot.findMany({
      where: { brandId: brand.id },
      include: {
        district: {
          select: { name: true, province: { select: { name: true } } },
        },
        brandMonthKpis: {
          where: { brandId: brand.id, periodMonth },
          select: { poTarget: true },
          take: 1,
        },
      },
      orderBy: { name: "asc" },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Brand KPI Targets");
    sheet.columns = [
      { header: "depot_id", key: "depot_id", width: 12 },
      { header: "depot_name", key: "depot_name", width: 28 },
      { header: "brand_id", key: "brand_id", width: 12 },
      { header: "brand", key: "brand", width: 22 },
      { header: "target_po", key: "target_po", width: 14 },
      { header: "month", key: "month", width: 12 },
    ];

    depots.forEach((depot) => {
      sheet.addRow({
        depot_id: depot.id,
        depot_name: depot.name,
        brand_id: brand.id,
        brand: brand.name,
        target_po: depot.brandMonthKpis[0]?.poTarget ?? "",
        month: monthLabel(periodMonth),
      });
    });

    return workbook.xlsx.writeBuffer();
  }

  async generateMonthlyTemplate({ brandId, month }) {
    const periodMonth = parseMonthInput(month);
    const brand = await prisma.brand.findUnique({
      where: { id: Number(brandId) },
      select: { id: true, name: true },
    });
    if (!brand) throw new Error("Brand not found");

    const depots = await prisma.depot.findMany({
      where: { brandId: brand.id },
      include: {
        brandMonthKpis: {
          where: { brandId: brand.id, periodMonth },
          select: {
            poTarget: true,
            poActual: true,
            productAvailablePct: true,
            volumeDisplayPct: true,
          },
          take: 1,
        },
      },
      orderBy: { name: "asc" },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Depot Monthly KPI");
    sheet.columns = [
      { header: "depot_id", key: "depot_id", width: 12 },
      { header: "depot_name", key: "depot_name", width: 28 },
      { header: "brand_id", key: "brand_id", width: 12 },
      { header: "brand", key: "brand", width: 22 },
      { header: "month", key: "month", width: 12 },
      { header: "target_po", key: "target_po", width: 12 },
      { header: "po_actual", key: "po_actual", width: 12 },
      {
        header: "product_available_pct",
        key: "product_available_pct",
        width: 20,
      },
      { header: "volume_display_pct", key: "volume_display_pct", width: 18 },
    ];

    depots.forEach((depot) => {
      const kpi = depot.brandMonthKpis[0];
      sheet.addRow({
        depot_id: depot.id,
        depot_name: depot.name,
        brand_id: brand.id,
        brand: brand.name,
        month: monthLabel(periodMonth),
        target_po: kpi?.poTarget ?? "",
        po_actual: kpi?.poActual ?? "",
        product_available_pct: kpi?.productAvailablePct ?? "",
        volume_display_pct: kpi?.volumeDisplayPct ?? "",
      });
    });

    return workbook.xlsx.writeBuffer();
  }

  async exportMonthlyWorkbook({ brandId, month, search }) {
    const result = await this.listMonthlyKpis({
      brandId,
      month,
      search,
      includeMissing: true,
      all: true,
    });
    const rows = result.data ?? [];
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Depot Monthly KPI");
    sheet.columns = [
      { header: "depot_id", key: "depot_id", width: 12 },
      { header: "depot_name", key: "depot_name", width: 28 },
      { header: "brand_id", key: "brand_id", width: 12 },
      { header: "brand", key: "brand", width: 22 },
      { header: "month", key: "month", width: 12 },
      { header: "target_po", key: "target_po", width: 12 },
      { header: "po_actual", key: "po_actual", width: 12 },
      { header: "po_percent", key: "po_percent", width: 12 },
      {
        header: "product_available_pct",
        key: "product_available_pct",
        width: 20,
      },
      { header: "volume_display_pct", key: "volume_display_pct", width: 18 },
    ];
    rows.forEach((row) => {
      sheet.addRow({
        depot_id: row.depotId,
        depot_name: row.depotName,
        brand_id: row.brandId,
        brand: row.brandName,
        month: row.month,
        target_po: row.poTarget ?? "",
        po_actual: row.poActual ?? 0,
        po_percent: row.poPercent ?? "",
        product_available_pct: row.productAvailablePct ?? "",
        volume_display_pct: row.volumeDisplayPct ?? "",
      });
    });
    return workbook.xlsx.writeBuffer();
  }

  async parseMonthlyWorkbook(fileBuffer) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer);
    const sheet = workbook.getWorksheet(1);
    if (!sheet) return [];
    const rows = [];
    sheet.eachRow((row, index) => {
      if (index === 1) return;
      const depotId = cellRaw(row.getCell(1).value);
      const brandId = cellRaw(row.getCell(3).value);
      const month = cellRaw(row.getCell(5).value);
      const targetPo = cellRaw(row.getCell(6).value);
      const poActual = cellRaw(row.getCell(7).value);
      const productAvailablePct = cellRaw(row.getCell(8).value);
      const volumeDisplayPct = cellRaw(row.getCell(9).value);
      if (!depotId && !brandId && !month) return;
      rows.push({
        depotId: Number(depotId),
        brandId: Number(brandId),
        month: String(month),
        poTarget: asNullableNumber(targetPo),
        poActual: Number(poActual ?? 0),
        productAvailablePct: asNullableNumber(productAvailablePct),
        volumeDisplayPct: asNullableNumber(volumeDisplayPct),
      });
    });
    return rows;
  }

  async parseTargetWorkbook(fileBuffer) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer);
    const sheet = workbook.getWorksheet(1);
    if (!sheet) return [];
    const rows = [];
    sheet.eachRow((row, index) => {
      if (index === 1) return;
      const depotId = cellRaw(row.getCell(1).value);
      const brandId = cellRaw(row.getCell(3).value);
      const targetPo = cellRaw(row.getCell(5).value);
      const month = cellRaw(row.getCell(6).value);
      if (!depotId && !brandId && !targetPo && !month) return;
      rows.push({
        depotId: Number(depotId),
        brandId: Number(brandId),
        targetPo: Number(targetPo),
        month: String(month),
      });
    });
    return rows;
  }

  async getBrandMonthlyReport({ brandId, provinceId, year, month }) {
    const now = new Date();
    const selectedYear = Number(year) || now.getFullYear();
    const selectedMonth = Number(month) || now.getMonth() + 1;
    const periodMonth = new Date(Date.UTC(selectedYear, selectedMonth - 1, 1));
    const { start, end } = monthRange(periodMonth);

    const rows = await prisma.brandDepotMonthKpi.findMany({
      where: withProvinceOnKpi(
        {
          periodMonth: { gte: start, lt: end },
          ...(brandId ? { brandId: Number(brandId) } : {}),
        },
        provinceId,
      ),
      select: {
        id: true,
        depotId: true,
        brandId: true,
        periodMonth: true,
        poActual: true,
        poTarget: true,
        productAvailablePct: true,
        volumeDisplayPct: true,
        brand: { select: { id: true, name: true } },
        depot: { select: { id: true, name: true } },
      },
      orderBy: [{ brand: { name: "asc" } }, { depot: { name: "asc" } }],
    });

    const summary = rows.reduce(
      (acc, row) => {
        acc.totalPo += Number(row.poActual || 0);
        if (row.productAvailablePct != null) {
          acc.availableSum += Number(row.productAvailablePct);
          acc.availableCount += 1;
        }
        if (row.volumeDisplayPct != null) {
          acc.displaySum += Number(row.volumeDisplayPct);
          acc.displayCount += 1;
        }
        return acc;
      },
      {
        totalPo: 0,
        availableSum: 0,
        availableCount: 0,
        displaySum: 0,
        displayCount: 0,
      },
    );

    return {
      period: monthLabel(periodMonth),
      rows: rows.map((row) => this.mapMonthlyRow(row)),
      totals: {
        totalPo: Number(summary.totalPo.toFixed(1)),
        avgAvailable:
          summary.availableCount > 0
            ? Number((summary.availableSum / summary.availableCount).toFixed(1))
            : null,
        avgDisplay:
          summary.displayCount > 0
            ? Number((summary.displaySum / summary.displayCount).toFixed(1))
            : null,
      },
    };
  }

  async getBrandYearlyReport({ brandId, provinceId, year }) {
    const selectedYear = Number(year) || new Date().getFullYear();
    const start = utcMonthStart(new Date(Date.UTC(selectedYear, 0, 1)));
    const end = utcMonthEnd(new Date(Date.UTC(selectedYear, 11, 1)));

    const rows = await prisma.brandDepotMonthKpi.findMany({
      where: withProvinceOnKpi(
        {
          periodMonth: { gte: start, lte: end },
          ...(brandId ? { brandId: Number(brandId) } : {}),
        },
        provinceId,
      ),
      include: {
        brand: { select: { id: true, name: true } },
        depot: { select: { id: true, name: true, code: true } },
      },
      orderBy: [
        { brand: { name: "asc" } },
        { depot: { name: "asc" } },
        { periodMonth: "asc" },
      ],
    });

    const grouped = new Map();
    for (const row of rows) {
      const key = `${row.brandId}:${row.depotId}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          brandId: row.brandId,
          brandName: row.brand.name,
          depotId: row.depotId,
          depotName: row.depot.name,
          depotCode: row.depot.code ?? null,
          totalPo: 0,
          availableSum: 0,
          availableCount: 0,
          displaySum: 0,
          displayCount: 0,
          months: [],
        });
      }
      const item = grouped.get(key);
      item.totalPo += Number(row.poActual || 0);
      if (row.productAvailablePct != null) {
        item.availableSum += Number(row.productAvailablePct);
        item.availableCount += 1;
      }
      if (row.volumeDisplayPct != null) {
        item.displaySum += Number(row.volumeDisplayPct);
        item.displayCount += 1;
      }
      item.months.push({
        month: monthLabel(row.periodMonth),
        poActual: Number(row.poActual || 0),
        poTarget: row.poTarget == null ? null : Number(row.poTarget),
        productAvailablePct:
          row.productAvailablePct == null
            ? null
            : Number(row.productAvailablePct),
        volumeDisplayPct:
          row.volumeDisplayPct == null ? null : Number(row.volumeDisplayPct),
      });
    }

    const reportRows = Array.from(grouped.values()).map((item) => ({
      ...item,
      avgAvailable:
        item.availableCount > 0
          ? Number((item.availableSum / item.availableCount).toFixed(1))
          : null,
      avgDisplay:
        item.displayCount > 0
          ? Number((item.displaySum / item.displayCount).toFixed(1))
          : null,
    }));

    return {
      year: selectedYear,
      rows: reportRows,
      totals: {
        totalPo: Number(
          reportRows.reduce((sum, row) => sum + row.totalPo, 0).toFixed(1),
        ),
        avgAvailable:
          reportRows.length > 0
            ? Number(
                (
                  reportRows.reduce(
                    (sum, row) => sum + Number(row.avgAvailable || 0),
                    0,
                  ) /
                  Math.max(
                    reportRows.filter((row) => row.avgAvailable != null).length,
                    1,
                  )
                ).toFixed(1),
              )
            : null,
        avgDisplay:
          reportRows.length > 0
            ? Number(
                (
                  reportRows.reduce(
                    (sum, row) => sum + Number(row.avgDisplay || 0),
                    0,
                  ) /
                  Math.max(
                    reportRows.filter((row) => row.avgDisplay != null).length,
                    1,
                  )
                ).toFixed(1),
              )
            : null,
      },
    };
  }

    async getDashboardBrand({ year, month, brandId, provinceId } = {}) {
    const now = new Date();
    const selectedYear = Number(year) || now.getFullYear();
    const selectedMonth = Number(month) || now.getMonth() + 1;
    const periodMonth = new Date(Date.UTC(selectedYear, selectedMonth - 1, 1));
    const { start, end } = monthRange(periodMonth);
    const provinceFilter = provinceId ? Number(provinceId) : null;

    const brands = await prisma.brand.findMany({
      where: {
        ...(brandId ? { id: Number(brandId) } : {}),
      },
      include: {
        depots: {
          where: provinceFilter ? { provinceId: provinceFilter } : undefined,
          select: { id: true, status: true, expiryDate: true },
        },
        brandMonthKpis: {
          where: {
            periodMonth: { gte: start, lt: end },
            ...(provinceFilter
              ? { depot: { provinceId: provinceFilter } }
              : {}),
          },
          select: {
            depotId: true,
            poActual: true,
            productAvailablePct: true,
            volumeDisplayPct: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const today = new Date();
    return brands.map((brand) => {
      const totalPo = brand.brandMonthKpis.reduce(
        (sum, row) => sum + Number(row.poActual || 0),
        0,
      );
      const availableRows = brand.brandMonthKpis.filter(
        (row) => row.productAvailablePct != null,
      );
      const displayRows = brand.brandMonthKpis.filter(
        (row) => row.volumeDisplayPct != null,
      );
      return {
        brandId: brand.id,
        brandName: brand.name,
        totalDepots: brand.depots.length,
        totalPo: Number(totalPo.toFixed(1)),
        vacancy: brand.depots.filter((depot) => depot.status === "vacancy")
          .length,
        expired: brand.depots.filter(
          (depot) => depot.expiryDate && new Date(depot.expiryDate) < today,
        ).length,
        avgAvailable:
          availableRows.length > 0
            ? Number(
                (
                  availableRows.reduce(
                    (sum, row) => sum + Number(row.productAvailablePct),
                    0,
                  ) / availableRows.length
                ).toFixed(1),
              )
            : null,
        avgVolumeDisplay:
          displayRows.length > 0
            ? Number(
                (
                  displayRows.reduce(
                    (sum, row) => sum + Number(row.volumeDisplayPct),
                    0,
                  ) / displayRows.length
                ).toFixed(1),
              )
            : null,
      };
    });
  }

  /**
   * Actionable dashboard slice: Target vs Actual + attention items
   * for the selected brand/month.
   */
  async getDashboardInsights({ year, month, brandId, provinceId, limit = 25 } = {}) {
    const now = new Date();
    const selectedYear = Number(year) || now.getFullYear();
    const selectedMonth = Number(month) || now.getMonth() + 1;
    if (selectedMonth < 1 || selectedMonth > 12) {
      throw new Error("month must be between 1 and 12");
    }

    const periodMonth = new Date(Date.UTC(selectedYear, selectedMonth - 1, 1));
    const { start, end } = monthRange(periodMonth);
    const brandFilter = brandId ? Number(brandId) : null;
    const provinceFilter = provinceId ? Number(provinceId) : null;
    const maxItems = Math.min(Math.max(Number(limit) || 25, 1), 50);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [kpiRows, problemDepots] = await Promise.all([
      prisma.brandDepotMonthKpi.findMany({
        where: withProvinceOnKpi(
          {
            periodMonth: { gte: start, lt: end },
            ...(brandFilter ? { brandId: brandFilter } : {}),
          },
          provinceFilter,
        ),
        select: {
          depotId: true,
          brandId: true,
          poActual: true,
          poTarget: true,
          productAvailablePct: true,
          volumeDisplayPct: true,
          brand: { select: { id: true, name: true } },
          depot: { select: { id: true, name: true } },
        },
      }),
      prisma.depot.findMany({
        where: {
          ...(brandFilter ? { brandId: brandFilter } : { brandId: { not: null } }),
          ...(provinceFilter ? { provinceId: provinceFilter } : {}),
          OR: [
            { status: "vacancy" },
            { expiryDate: { lt: today } },
          ],
        },
        select: {
          id: true,
          name: true,
          status: true,
          expiryDate: true,
          brandId: true,
          brand: { select: { id: true, name: true } },
        },
        orderBy: { name: "asc" },
        take: 200,
      }),
    ]);

    let totalTarget = 0;
    let totalActual = 0;
    let depotsWithTarget = 0;
    let onOrAboveTarget = 0;
    let underTarget = 0;
    const attention = [];

    for (const row of kpiRows) {
      const poActual = Number(row.poActual || 0);
      const poTarget = row.poTarget == null ? null : Number(row.poTarget);
      totalActual += poActual;

      const base = {
        depotId: row.depotId,
        depotName: row.depot?.name ?? `Depot #${row.depotId}`,
        brandId: row.brandId,
        brandName: row.brand?.name ?? "",
      };

      if (poTarget != null && poTarget > 0) {
        totalTarget += poTarget;
        depotsWithTarget += 1;
        if (poActual >= poTarget) {
          onOrAboveTarget += 1;
        } else {
          underTarget += 1;
          attention.push({
            ...base,
            type: "under_target",
            severity: "high",
            detail: `Actual ${poActual.toLocaleString()} / Target ${poTarget.toLocaleString()} (${Math.round((poActual / poTarget) * 100)}%)`,
          });
        }
      } else {
        attention.push({
          ...base,
          type: "missing_target",
          severity: "medium",
          detail: "No Target PO set for this month",
        });
      }

      if (row.productAvailablePct == null) {
        attention.push({
          ...base,
          type: "missing_available",
          severity: "medium",
          detail: "Available % not entered",
        });
      }

      if (row.volumeDisplayPct == null) {
        attention.push({
          ...base,
          type: "missing_display",
          severity: "low",
          detail: "Display % not entered",
        });
      }
    }

    for (const depot of problemDepots) {
      const base = {
        depotId: depot.id,
        depotName: depot.name,
        brandId: depot.brandId,
        brandName: depot.brand?.name ?? "",
      };

      if (depot.status === "vacancy") {
        attention.push({
          ...base,
          type: "vacancy",
          severity: "high",
          detail: "Depot marked as vacancy",
        });
      }

      if (depot.expiryDate && new Date(depot.expiryDate) < today) {
        attention.push({
          ...base,
          type: "expired",
          severity: "high",
          detail: `ID expired ${new Date(depot.expiryDate).toLocaleDateString()}`,
        });
      }
    }

    const severityRank = { high: 0, medium: 1, low: 2 };
    const typeRank = {
      expired: 0,
      vacancy: 1,
      under_target: 2,
      missing_target: 3,
      missing_available: 4,
      missing_display: 5,
    };

    attention.sort((a, b) => {
      const sev =
        (severityRank[a.severity] ?? 9) - (severityRank[b.severity] ?? 9);
      if (sev !== 0) return sev;
      return (typeRank[a.type] ?? 9) - (typeRank[b.type] ?? 9);
    });

    const attainmentPct =
      totalTarget > 0
        ? Number(((totalActual / totalTarget) * 100).toFixed(1))
        : null;

    return {
      period: monthLabel(periodMonth),
      targetVsActual: {
        totalTarget: Number(totalTarget.toFixed(1)),
        totalActual: Number(totalActual.toFixed(1)),
        attainmentPct,
        depotsWithTarget,
        onOrAboveTarget,
        underTarget,
        kpiRowCount: kpiRows.length,
      },
      attention: attention.slice(0, maxItems),
      attentionTotal: attention.length,
    };
  }
}

export const brandMonthlyKpiService = new BrandMonthlyKpiService();
