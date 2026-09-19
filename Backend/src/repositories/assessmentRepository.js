// repositories/assessmentRepository.js
//
// Query construction/execution for the assessment list/export/location-
// report endpoints, extracted out of assessmentService.js. This is the one
// genuinely complex piece of assessment data access — building a dynamic
// Prisma `where` from a dozen optional filters, ranking rows in JS because
// "rank" isn't a stored column, and a raw-SQL aggregation query — so it
// earns a repository. The rest of assessmentService's Prisma calls
// (createAssessment, submitAssessment, reopenAssessment, ...) stay directly
// in the service: they're single transactional writes mixed with business
// rules, not query construction, and a `.findById()`-style wrapper around
// them would add a layer without adding any abstraction value.
import { Prisma } from "@prisma/client";
import { prisma } from "../config/db.js";

// listAssessments/export never render item scores or criteria — only the
// detail page (assessmentService.getAssessmentById/getPreviousAssessment)
// does. overallScore/ourWinsCount/competitorWinsCount/qualificationStatus
// are cached scalar columns on depot_assessments (written by
// assessmentService.scoreAssessment() at submit/updateItems time), so the
// list doesn't need to join items at all to show them.
const ASSESSMENT_LIST_SELECT = {
  id: true,
  evaluatorName: true,
  status: true,
  assessmentDate: true,
  overallScore: true,
  ourWinsCount: true,
  competitorWinsCount: true,
  qualificationStatus: true,
  depot: {
    select: {
      id: true,
      name: true,
      khmerName: true,
      code: true,
      brand: { select: { id: true, name: true } },
      district: {
        select: {
          id: true,
          name: true,
          province: { select: { id: true, name: true } },
        },
      },
    },
  },
  cycle: { select: { id: true, label: true } },
  evaluator: { select: { id: true, username: true } },
};

// Export needs each item's score (keyed by criterion code) to fill the
// per-criterion columns — the list view has no use for this, so it stays
// off ASSESSMENT_LIST_SELECT.
const ASSESSMENT_EXPORT_SELECT = {
  ...ASSESSMENT_LIST_SELECT,
  items: {
    select: {
      score: true,
      criterion: { select: { code: true } },
    },
  },
};

/**
 * Rank isn't a stored column — it's each row's 1-based position within its
 * brand group by Overall score (descending, nulls last), the same thing the
 * frontend's groupSortRows() computes for display. That can't be expressed
 * as a row-level WHERE predicate: which rank a row holds depends on every
 * other row in the same brand group that matches the other active filters,
 * not just the rows on one page. So filtering by rank pulls the full
 * filtered set (capped) and ranks it in JS instead of the database, keeping
 * only the rows at the requested rank.
 *
 * Ties (equal Overall score) keep the order rows arrived in — Array.sort is
 * stable, and rows arrive pre-sorted `assessmentDate desc, id desc` — so
 * the tie-break matches the unranked list's own ordering.
 */
async function findRankFiltered(where, rank, { select = ASSESSMENT_LIST_SELECT, cap = 20000 } = {}) {
  const rows = await prisma.depotAssessment.findMany({
    where,
    select,
    orderBy: [{ assessmentDate: "desc" }, { id: "desc" }],
    take: cap,
  });

  const groups = new Map();
  for (const row of rows) {
    const key = row.depot.brand?.id ?? "none";
    const group = groups.get(key);
    if (group) group.push(row);
    else groups.set(key, [row]);
  }

  const matching = [];
  for (const group of groups.values()) {
    const sorted = [...group].sort((a, b) => {
      if (a.overallScore == null && b.overallScore == null) return 0;
      if (a.overallScore == null) return 1;
      if (b.overallScore == null) return -1;
      return b.overallScore - a.overallScore;
    });
    const atRank = sorted[rank - 1];
    if (atRank) matching.push(atRank);
  }

  matching.sort((a, b) => {
    const dateDiff = new Date(b.assessmentDate) - new Date(a.assessmentDate);
    return dateDiff !== 0 ? dateDiff : b.id - a.id;
  });

  return matching;
}

/**
 * Filter conditions for queryLocationReport, as raw-SQL fragments rather
 * than a Prisma `where` object — buildWhere's object shape can't be reused
 * directly inside $queryRaw. Table aliases match queryLocationReport's
 * FROM/JOIN clause: da=depot_assessments, dep=depots, d=districts,
 * p=provinces.
 */
function buildLocationReportConditions({
  depotId,
  cycleId,
  status,
  qualificationStatus,
  evaluatorId,
  brandId,
  provinceId,
  districtId,
  includeSuperseded = false,
  dateFrom,
  dateTo,
} = {}) {
  const conditions = [];
  if (!includeSuperseded) conditions.push(Prisma.sql`da.is_superseded = false`);
  if (depotId) conditions.push(Prisma.sql`da.depot_id = ${Number(depotId)}`);
  if (cycleId) conditions.push(Prisma.sql`da.cycle_id = ${Number(cycleId)}`);
  if (status) {
    conditions.push(Prisma.sql`da.status = ${status}::"DepotAssessmentStatus"`);
  }
  if (qualificationStatus) {
    conditions.push(
      Prisma.sql`da.qualification_status = ${qualificationStatus}::"QualificationStatus"`,
    );
  }
  if (evaluatorId) conditions.push(Prisma.sql`da.evaluator_id = ${Number(evaluatorId)}`);
  if (brandId) conditions.push(Prisma.sql`dep.brand_id = ${Number(brandId)}`);
  if (provinceId) conditions.push(Prisma.sql`p.id = ${Number(provinceId)}`);
  if (districtId) conditions.push(Prisma.sql`d.id = ${Number(districtId)}`);
  if (dateFrom) conditions.push(Prisma.sql`da.assessment_date >= ${new Date(dateFrom)}`);
  if (dateTo) conditions.push(Prisma.sql`da.assessment_date <= ${new Date(dateTo)}`);
  return conditions;
}

export const assessmentRepository = {
  LIST_SELECT: ASSESSMENT_LIST_SELECT,
  EXPORT_SELECT: ASSESSMENT_EXPORT_SELECT,

  /** Shared filter-to-`where` mapping for listAssessments and exportAssessments. */
  buildWhere({
    depotId,
    depotCode,
    cycleId,
    status,
    qualificationStatus,
    evaluatorId,
    brandId,
    provinceId,
    districtId,
    criterionId,
    winSide,
    includeSuperseded = false,
    search,
    dateFrom,
    dateTo,
  } = {}) {
    const where = {};
    if (depotId) where.depotId = Number(depotId);
    if (depotCode) where.depot = { code: depotCode };
    if (cycleId) where.cycleId = Number(cycleId);
    if (status) where.status = status;
    if (qualificationStatus) where.qualificationStatus = qualificationStatus;
    if (evaluatorId) where.evaluatorId = Number(evaluatorId);
    if (criterionId) {
      // The comparison is always scoped to THIS criterion's own result —
      // not the assessment-wide counts below — so "criterion X + Our Wins"
      // only matches rows where criterion X specifically was won by our
      // side, not rows that merely won overall. Selecting a criterion with
      // no explicit winSide defaults to "our_side": the criteria filter is
      // for finding depots we won on that criterion, so a depot the
      // competitor won on it should not appear just because it was scored.
      const itemFilter = { criterionId: Number(criterionId) };
      if (winSide === "competitor") itemFilter.result = "competitor";
      else if (winSide === "tie") itemFilter.result = "none";
      else itemFilter.result = "our_side";
      where.items = { some: itemFilter };
    } else if (winSide === "our") {
      // True row comparison between the two cached count columns — not a
      // display/highlight choice. Prisma's field-reference filter
      // (`prisma.<model>.fields.<field>`) compiles this straight to
      // `WHERE our_wins_count > competitor_wins_count` in SQL, so
      // pagination and count() both see the filtered set correctly, same
      // as any other where clause.
      where.ourWinsCount = {
        gt: prisma.depotAssessment.fields.competitorWinsCount,
      };
    } else if (winSide === "competitor") {
      where.competitorWinsCount = {
        gt: prisma.depotAssessment.fields.ourWinsCount,
      };
    } else if (winSide === "tie") {
      where.ourWinsCount = {
        equals: prisma.depotAssessment.fields.competitorWinsCount,
      };
    }
    if (!includeSuperseded) where.isSuperseded = false;
    if (brandId || provinceId || districtId) {
      where.depot = {
        ...(brandId && { brandId: Number(brandId) }),
        ...(districtId && { districtId: Number(districtId) }),
        ...(provinceId && { district: { provinceId: Number(provinceId) } }),
      };
    }
    if (dateFrom || dateTo) {
      where.assessmentDate = {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(dateTo) }),
      };
    }

    const trimmedSearch = search?.trim();
    if (trimmedSearch) {
      const asId = Number(trimmedSearch);
      where.OR = [
        ...(Number.isInteger(asId) && asId > 0 ? [{ id: asId }] : []),
        { depot: { name: { contains: trimmedSearch, mode: "insensitive" } } },
      ];
    }

    return where;
  },

  /** One page of results plus the matching total, in a single transaction. */
  async findPage(where, { skip, take } = {}) {
    const [data, total] = await prisma.$transaction([
      prisma.depotAssessment.findMany({
        where,
        select: ASSESSMENT_LIST_SELECT,
        orderBy: { assessmentDate: "desc" },
        skip,
        take,
      }),
      prisma.depotAssessment.count({ where }),
    ]);
    return { data, total };
  },

  /** Every matching row (capped), for the Excel export — no pagination. */
  async findExportRows(where, cap) {
    return prisma.depotAssessment.findMany({
      where,
      select: ASSESSMENT_EXPORT_SELECT,
      orderBy: { assessmentDate: "desc" },
      take: cap,
    });
  },

  findRankFiltered,

  /**
   * GET /assessments/report/by-location — one row per unique
   * (brand, province, district) combination actually present in the
   * filtered assessments, with COUNT/MAX computed by PostgreSQL, not Node.
   *
   * Brand is a LEFT JOIN (Depot.brandId is nullable — a depot can have no
   * brand, grouped here as "Unassigned"); district and province are plain
   * JOINs since Depot.districtId and District.provinceId are both
   * required. Province is derived via district.provinceId, matching
   * buildWhere's own convention — not the separate, unused
   * Depot.provinceId column.
   *
   * Only overallScore is read (as MAX) — no items or criteria are loaded,
   * and no average/lowest/recomputed score is calculated anywhere here.
   */
  async queryLocationReport(filters = {}) {
    const conditions = buildLocationReportConditions(filters);
    const whereSql = conditions.length
      ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
      : Prisma.empty;

    return prisma.$queryRaw`
      SELECT
        b.id                              AS "brandId",
        COALESCE(b.name, 'Unassigned')    AS "brandName",
        p.id                              AS "provinceId",
        p.name                            AS "provinceName",
        d.id                              AS "districtId",
        d.name                            AS "districtName",
        COUNT(da.id)::int                 AS "assessmentCount",
        MAX(da.overall_score)             AS "highestOverallScore"
      FROM depot_assessments da
      JOIN depots dep ON dep.id = da.depot_id
      LEFT JOIN brands b ON b.id = dep.brand_id
      JOIN districts d ON d.id = dep.district_id
      JOIN provinces p ON p.id = d.province_id
      ${whereSql}
      GROUP BY b.id, b.name, p.id, p.name, d.id, d.name
      ORDER BY MAX(da.overall_score) DESC NULLS LAST
    `;
  },
};
