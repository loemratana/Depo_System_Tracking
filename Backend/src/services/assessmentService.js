import { Prisma } from "@prisma/client";
import { prisma } from "../config/db.js";
import logger from "../config/logger.js";
import { seedAssessmentCriteria } from "./assessmentCriteriaCatalog.js";

/**
 * Score Rank thresholds (V1: application constants, not a configurable
 * table — see "Deliberately simplified for V1" in the assessment ERD).
 * The qualification status is a straight tier lookup on the overall
 * average score (0–10 scale) — no structural/critical floor gates.
 */
export const SCORE_RANK_THRESHOLDS = {
  excellent: 8, // overallScore >= this -> excellent
  good: 6.5, // overallScore >= this -> good
  needsImprovement: 5, // overallScore >= this -> needs_improvement; below it -> weak
};

const ITEM_INCLUDE = {
  criterion: true,
};

// Editing a draft is open to whoever created it; editing a submitted or
// finalized assessment in place (no status change, no reopen/new version)
// is restricted the same way finalize/reopen already were.
const MANAGE_ROLES = ["admin", "manager"];

const ASSESSMENT_INCLUDE = {
  depot: {
    select: {
      id: true,
      name: true,
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
  cycle: true,
  evaluator: {
    select: { id: true, username: true, role: true },
  },
  items: { include: ITEM_INCLUDE, orderBy: { criterion: { sortOrder: "asc" } } },
};

// listAssessments/groupBy/export never render item scores or criteria —
// only the detail page (getAssessmentById/getPreviousAssessment) does.
// overallScore/ourWinsCount/competitorWinsCount/qualificationStatus are
// cached scalar columns on depot_assessments (written by scoreAssessment()
// at submit/updateItems time — see below), so the list doesn't need to
// join items at all to show them. This also drops the full AssessmentCycle
// row (list only renders cycle.label) and evaluator.role (unused outside
// the detail page's own permission checks, which run server-side anyway).
// Measured on a 350-row dev dataset, page=1/pageSize=20: 11 queries -> 9,
// ~24.5ms -> ~11.9ms DB time, ~88.6KB -> ~9.6KB payload.
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

// createAssessment only needs to hand the caller an id to navigate/act on
// (the frontend's create flow immediately follows up with updateItems and,
// on submit, submitAssessment — never reads depot/cycle/evaluator/items off
// the create response) — the full nested object is available via
// GET /assessments/:id when actually needed. No joins, so this is a single
// cheap row read with no extra query beyond the INSERT itself.
const CREATE_ASSESSMENT_SELECT = {
  id: true,
  depotId: true,
  cycleId: true,
  evaluatorId: true,
  evaluatorName: true,
  status: true,
  version: true,
  assessmentDate: true,
  createdAt: true,
};

function round2(n) {
  return Math.round(n * 100) / 100;
}

// Active criterion ids, cached for the process lifetime. The catalog is
// fixed V1 reference data — 10 rows, seeded once (prisma/seed.js or the
// ensureCriteriaCatalog fallback below), no create/update/delete-criterion
// endpoint exists to mutate it at runtime — so there's nothing to
// invalidate this for short of a deploy, which restarts the process anyway.
let activeCriteriaIdsCache = null;

class AssessmentService {
  #criteriaReady = false;

  /**
   * Defensive fallback only — `prisma/seed.js` already seeds the criteria
   * catalog explicitly, so in a normal deploy this never has anything to
   * do. `#criteriaReady` makes the check itself run at most once per
   * process (not per request): the very first call after a cold start
   * pays for one `count()` query (plus a seed insert on a bare/un-seeded
   * DB); every call after that returns immediately with zero queries.
   */
  async ensureCriteriaCatalog() {
    if (this.#criteriaReady) return;
    const start = Date.now();
    const existing = await prisma.assessmentCriterion.count();
    if (existing === 0) {
      await seedAssessmentCriteria(prisma);
    }
    this.#criteriaReady = true;
    logger.info("assessment.ensureCriteriaCatalog", {
      durationMs: Date.now() - start,
      seeded: existing === 0,
    });
  }

  /**
   * Active criterion ids for building a new assessment's items — cached
   * after the first call (see `activeCriteriaIdsCache` above), so
   * createAssessment/reopenAssessment normally pay zero extra queries for
   * this beyond the one-time warm-up.
   */
  async #getActiveCriteriaIds() {
    if (activeCriteriaIdsCache) return activeCriteriaIdsCache;
    await this.ensureCriteriaCatalog();
    const start = Date.now();
    const rows = await prisma.assessmentCriterion.findMany({
      where: { isActive: true },
      select: { id: true },
      orderBy: { sortOrder: "asc" },
    });
    activeCriteriaIdsCache = rows;
    logger.info("assessment.loadActiveCriteria", {
      durationMs: Date.now() - start,
      count: rows.length,
    });
    return activeCriteriaIdsCache;
  }

  // ── Cycles ─────────────────────────────────────────────

  async listCycles() {
    return prisma.assessmentCycle.findMany({ orderBy: { periodStart: "desc" } });
  }

  async createCycle({ type, label, periodStart, periodEnd }) {
    return prisma.assessmentCycle.create({
      data: {
        type,
        label,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
      },
    });
  }

  // ── Criteria ───────────────────────────────────────────

  async listCriteria({ includeInactive = false } = {}) {
    await this.ensureCriteriaCatalog();
    return prisma.assessmentCriterion.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
  }

  // ── Assessments ────────────────────────────────────────

  /** Shared filter-to-`where` mapping for listAssessments and exportAssessments. */
  #buildAssessmentWhere({
    depotId,
    cycleId,
    status,
    qualificationStatus,
    evaluatorId,
    brandId,
    provinceId,
    districtId,
    includeSuperseded = false,
    search,
    dateFrom,
    dateTo,
  } = {}) {
    const where = {};
    if (depotId) where.depotId = Number(depotId);
    if (cycleId) where.cycleId = Number(cycleId);
    if (status) where.status = status;
    if (qualificationStatus) where.qualificationStatus = qualificationStatus;
    if (evaluatorId) where.evaluatorId = Number(evaluatorId);
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
  }

  async listAssessments({ page = 1, pageSize = 20, ...filters } = {}) {
    const where = this.#buildAssessmentWhere(filters);

    const pageNum = Math.max(1, Number(page) || 1);
    const pageSizeNum = Math.min(100, Math.max(1, Number(pageSize) || 20));

    const [data, total] = await prisma.$transaction([
      prisma.depotAssessment.findMany({
        where,
        select: ASSESSMENT_LIST_SELECT,
        orderBy: { assessmentDate: "desc" },
        skip: (pageNum - 1) * pageSizeNum,
        take: pageSizeNum,
      }),
      prisma.depotAssessment.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page: pageNum,
        pageSize: pageSizeNum,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSizeNum)),
      },
    };
  }

  /**
   * Same filters as listAssessments (brand/province/district/cycle/status/
   * date range/search), no pagination — every matching row, for the Excel
   * export. Capped so a filterless export can't pull the entire table.
   */
  async exportAssessments(filters = {}) {
    const where = this.#buildAssessmentWhere(filters);

    const EXPORT_ROW_CAP = 20000;
    const assessments = await prisma.depotAssessment.findMany({
      where,
      select: ASSESSMENT_LIST_SELECT,
      orderBy: { assessmentDate: "desc" },
      take: EXPORT_ROW_CAP,
    });
    return { assessments };
  }

  /**
   * Filter conditions for getLocationReport, as raw-SQL fragments rather
   * than a Prisma `where` object — #buildAssessmentWhere's object shape
   * can't be reused directly inside $queryRaw. Table aliases match
   * getLocationReport's FROM/JOIN clause: da=depot_assessments,
   * dep=depots, d=districts, p=provinces.
   */
  #buildLocationReportConditions({
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

  /**
   * GET /assessments/report/by-location — one row per unique
   * (brand, province, district) combination actually present in the
   * filtered assessments, with COUNT/MAX computed by PostgreSQL, not
   * Node. Replaces the old #listAssessmentsGrouped, which loaded every
   * matching assessment (capped at 5000) into memory and grouped/averaged
   * it with Map/reduce — real aggregation work the database should do.
   *
   * Brand is a LEFT JOIN (Depot.brandId is nullable — a depot can have no
   * brand, grouped here as "Unassigned"); district and province are plain
   * JOINs since Depot.districtId and District.provinceId are both
   * required. Province is derived via district.provinceId, matching the
   * existing #buildAssessmentWhere/list convention — not the separate,
   * unused Depot.provinceId column.
   *
   * Only overallScore is read (as MAX) — no items or criteria are loaded,
   * and no average/lowest/recomputed score is calculated anywhere here.
   */
  async getLocationReport(filters = {}) {
    const conditions = this.#buildLocationReportConditions(filters);
    const whereSql = conditions.length
      ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
      : Prisma.empty;

    const rows = await prisma.$queryRaw`
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

    return rows.map((row) => ({
      brandId: row.brandId,
      brandName: row.brandName,
      provinceId: row.provinceId,
      provinceName: row.provinceName,
      districtId: row.districtId,
      districtName: row.districtName,
      assessmentCount: row.assessmentCount,
      highestOverallScore:
        row.highestOverallScore != null ? Number(row.highestOverallScore) : null,
    }));
  }

  async getAssessmentById(id) {
    const assessment = await prisma.depotAssessment.findUnique({
      where: { id: Number(id) },
      include: {
        ...ASSESSMENT_INCLUDE,
        auditEvents: {
          include: { actor: { select: { id: true, username: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!assessment) {
      const error = new Error("Assessment not found");
      error.statusCode = 404;
      throw error;
    }
    return assessment;
  }

  /** Latest non-superseded assessment for the same depot, dated before this one. */
  async getPreviousAssessment(assessment) {
    return prisma.depotAssessment.findFirst({
      where: {
        depotId: assessment.depotId,
        isSuperseded: false,
        id: { not: assessment.id },
        assessmentDate: { lt: assessment.assessmentDate },
      },
      include: ASSESSMENT_INCLUDE,
      orderBy: { assessmentDate: "desc" },
    });
  }

  /**
   * `items: { create: [...] }` used to issue one INSERT per criterion
   * instead of a single bulk statement, and the response used to run the
   * heavy ASSESSMENT_INCLUDE read (depot/brand/district/province/cycle/
   * evaluator/items+criteria) inside the same transaction. With 10 fixed
   * criteria that was ~13 sequential round trips held under one pooled
   * connection — fine for one request, but two concurrent creates could
   * saturate a small pool and stall everyone else.
   *
   * Now: the active-criteria lookup is served from an in-process cache
   * (see `#getActiveCriteriaIds`) after the first call, `createMany`
   * batches the items into one INSERT, and the create response is a plain
   * `select` (no joins) instead of a full re-read — the frontend's create
   * flow only ever uses the returned `id` (to call updateItems/
   * submitAssessment and navigate), so nothing needs the nested object at
   * create time. Full detail is a `GET /assessments/:id` away. The
   * transaction now holds the connection for exactly 3 statements: the
   * assessment insert, the bulk item insert, and the audit insert.
   */
  async createAssessment({
    depotId,
    cycleId,
    evaluatorId,
    evaluatorName,
    assessmentDate,
  }) {
    const overallStart = Date.now();
    const criteria = await this.#getActiveCriteriaIds();

    const txStart = Date.now();
    const created = await prisma.$transaction(async (tx) => {
      const assessment = await tx.depotAssessment.create({
        data: {
          depotId: Number(depotId),
          cycleId: Number(cycleId),
          evaluatorId: Number(evaluatorId),
          evaluatorName: evaluatorName?.trim() || null,
          assessmentDate: new Date(assessmentDate),
          status: "draft",
        },
        select: CREATE_ASSESSMENT_SELECT,
      });

      await tx.depotAssessmentItem.createMany({
        data: criteria.map((c) => ({
          assessmentId: assessment.id,
          criterionId: c.id,
          score: null,
          result: "none",
        })),
      });

      await tx.assessmentAuditEvent.create({
        data: {
          assessmentId: assessment.id,
          action: "created",
          actorId: Number(evaluatorId),
        },
      });

      return assessment;
    });
    const txDurationMs = Date.now() - txStart;

    logger.info("assessment.create", {
      assessmentId: created.id,
      depotId: created.depotId,
      cycleId: created.cycleId,
      criteriaCount: criteria.length,
      txDurationMs,
      totalDurationMs: Date.now() - overallStart,
    });

    return created;
  }

  /**
   * Edit an assessment's own fields (evaluator name, assessment date) —
   * in place, at any status. Never touches `status` itself; that's only
   * ever changed by submit/finalize/reopen. Kept separate from updateItems
   * since it touches the DepotAssessment row, not its items.
   */
  async updateAssessment(id, { evaluatorName, assessmentDate }, actorId, role) {
    const assessment = await prisma.depotAssessment.findUnique({
      where: { id: Number(id) },
    });
    if (!assessment) {
      const error = new Error("Assessment not found");
      error.statusCode = 404;
      throw error;
    }
    if (assessment.status !== "draft" && !MANAGE_ROLES.includes(role)) {
      const error = new Error(
        "Only admin/manager can edit a submitted or finalized assessment",
      );
      error.statusCode = 403;
      throw error;
    }

    const data = {};
    if (evaluatorName !== undefined) data.evaluatorName = evaluatorName?.trim() || null;
    if (assessmentDate !== undefined) data.assessmentDate = new Date(assessmentDate);

    return prisma.$transaction(async (tx) => {
      const updated = await tx.depotAssessment.update({
        where: { id: Number(id) },
        data,
        include: ASSESSMENT_INCLUDE,
      });
      await tx.assessmentAuditEvent.create({
        data: { assessmentId: Number(id), action: "edited", actorId: Number(actorId) },
      });
      return updated;
    });
  }

  /**
   * Bulk upsert of item scores/results/remarks — in place, at any status
   * (see updateAssessment). Since submit is the only other place the
   * cached score fields (overallScore, qualificationStatus, ...) get
   * written, an edit after submit/finalize has to recompute and persist
   * them here too or the list/detail views would show stale numbers.
   */
  async updateItems(assessmentId, items, actorId, role) {
    const assessment = await prisma.depotAssessment.findUnique({
      where: { id: Number(assessmentId) },
    });
    if (!assessment) {
      const error = new Error("Assessment not found");
      error.statusCode = 404;
      throw error;
    }
    if (assessment.status !== "draft" && !MANAGE_ROLES.includes(role)) {
      const error = new Error(
        "Only admin/manager can edit a submitted or finalized assessment",
      );
      error.statusCode = 403;
      throw error;
    }

    await prisma.$transaction(
      items.map((item) =>
        prisma.depotAssessmentItem.updateMany({
          where: {
            assessmentId: Number(assessmentId),
            criterionId: Number(item.criterionId),
          },
          data: {
            score: item.score === undefined ? undefined : item.score,
            result: item.result === undefined ? undefined : item.result,
            remarks: item.remarks === undefined ? undefined : item.remarks,
          },
        }),
      ),
    );

    const refreshedItems = await prisma.depotAssessmentItem.findMany({
      where: { assessmentId: Number(assessmentId) },
      include: ITEM_INCLUDE,
    });
    const scores = this.scoreAssessment(refreshedItems);

    await prisma.depotAssessment.update({
      where: { id: Number(assessmentId) },
      data: scores,
    });

    await prisma.assessmentAuditEvent.create({
      data: {
        assessmentId: Number(assessmentId),
        action: "edited",
        actorId: Number(actorId),
      },
    });

    return this.getAssessmentById(assessmentId);
  }

  /** Compute cached scores + score-rank tier from the current items. */
  scoreAssessment(items) {
    const scored = items.filter((i) => i.score != null);

    const average = (rows) =>
      rows.length ? rows.reduce((sum, r) => sum + r.score, 0) / rows.length : null;

    const overallScore = average(scored);
    const avg = overallScore; // alias to mirror the design prototype's naming

    const ourWinsCount = items.filter((i) => i.result === "our_side").length;
    const competitorWinsCount = items.filter((i) => i.result === "competitor").length;
    const notComparedCount = items.filter(
      (i) => i.result === "none" && i.criterion.isComparable,
    ).length;

    const { excellent, good, needsImprovement } = SCORE_RANK_THRESHOLDS;

    let qualificationStatus = null;
    let qualificationReason = "Score at least one criterion to see a result.";
    if (avg != null) {
      if (avg >= excellent) {
        qualificationStatus = "excellent";
        qualificationReason = `Excellent — overall average (${round2(avg)}) is ${excellent} or above.`;
      } else if (avg >= good) {
        qualificationStatus = "good";
        qualificationReason = `Good — overall average (${round2(avg)}) is in the ${good}–${excellent} range.`;
      } else if (avg >= needsImprovement) {
        qualificationStatus = "needs_improvement";
        qualificationReason = `Needs Improvement — overall average (${round2(avg)}) is in the ${needsImprovement}–${good} range.`;
      } else {
        qualificationStatus = "weak";
        qualificationReason = `Weak (Need to Review) — overall average (${round2(avg)}) is below ${needsImprovement}.`;
      }
    }

    return {
      overallScore: overallScore != null ? round2(overallScore) : null,
      ourWinsCount,
      competitorWinsCount,
      notComparedCount,
      qualificationStatus,
      qualificationReason,
    };
  }

  async submitAssessment(id, actorId) {
    const assessment = await this.getAssessmentById(id);
    if (assessment.status !== "draft") {
      const error = new Error("Only a draft assessment can be submitted");
      error.statusCode = 409;
      throw error;
    }
    const missing = assessment.items.filter((i) => i.score == null);
    if (missing.length > 0) {
      const error = new Error(
        `All ${assessment.items.length} criteria must be scored before submitting (${missing.length} missing)`,
      );
      error.statusCode = 422;
      throw error;
    }

    const scores = this.scoreAssessment(assessment.items);

    return prisma.$transaction(async (tx) => {
      const updated = await tx.depotAssessment.update({
        where: { id: Number(id) },
        data: {
          status: "submitted",
          submittedAt: new Date(),
          ...scores,
        },
        include: ASSESSMENT_INCLUDE,
      });
      await tx.assessmentAuditEvent.create({
        data: { assessmentId: Number(id), action: "submitted", actorId: Number(actorId) },
      });
      return updated;
    });
  }

  async finalizeAssessment(id, actorId) {
    const assessment = await this.getAssessmentById(id);
    if (assessment.status !== "submitted") {
      const error = new Error("Only a submitted assessment can be finalized");
      error.statusCode = 409;
      throw error;
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.depotAssessment.update({
        where: { id: Number(id) },
        data: { status: "finalized", finalizedAt: new Date() },
        include: ASSESSMENT_INCLUDE,
      });
      await tx.assessmentAuditEvent.create({
        data: { assessmentId: Number(id), action: "finalized", actorId: Number(actorId) },
      });
      return updated;
    });
  }

  /**
   * Reopen a submitted or finalized assessment: supersede it and create a
   * new draft version (with copied items) that replaces it. Who is allowed
   * to do this is an authorization rule, not a schema concern — every
   * reopen is logged on both rows either way. A reason is optional (falls
   * back to a generic note) so this can be triggered directly from an Edit
   * action without prompting for one.
   */
  async reopenAssessment(id, { reason, actorId }) {
    const assessment = await this.getAssessmentById(id);
    if (assessment.status === "draft") {
      const error = new Error("Assessment is already a draft");
      error.statusCode = 409;
      throw error;
    }
    const reopenReason = reason?.trim() || "Reopened for editing";

    return prisma.$transaction(async (tx) => {
      await tx.depotAssessment.update({
        where: { id: Number(id) },
        data: { isSuperseded: true },
      });

      const reopened = await tx.depotAssessment.create({
        data: {
          depotId: assessment.depotId,
          cycleId: assessment.cycleId,
          evaluatorId: Number(actorId),
          evaluatorName: assessment.evaluatorName,
          assessmentDate: assessment.assessmentDate,
          status: "draft",
          version: assessment.version + 1,
          reopenedFromId: assessment.id,
          reopenReason,
          // createMany (not create) — same reasoning as createAssessment:
          // one bulk INSERT for the copied items instead of one per item.
          items: {
            createMany: {
              data: assessment.items.map((item) => ({
                criterionId: item.criterionId,
                score: item.score,
                result: item.result,
                remarks: item.remarks,
              })),
            },
          },
        },
        include: ASSESSMENT_INCLUDE,
      });

      await tx.assessmentAuditEvent.createMany({
        data: [
          {
            assessmentId: assessment.id,
            action: "reopened",
            actorId: Number(actorId),
            note: reopenReason,
          },
          {
            assessmentId: reopened.id,
            action: "created",
            actorId: Number(actorId),
            note: `Reopened from assessment #${assessment.id}`,
          },
        ],
      });

      return reopened;
    });
  }

  /**
   * Hard-delete an evaluation regardless of status. Items and audit events
   * cascade with it; a reopened-from reference on a newer version is
   * nulled out by the FK (ON DELETE SET NULL), never blocked.
   */
  async deleteAssessment(id) {
    const assessment = await prisma.depotAssessment.findUnique({
      where: { id: Number(id) },
    });
    if (!assessment) {
      const error = new Error("Assessment not found");
      error.statusCode = 404;
      throw error;
    }
    await prisma.depotAssessment.delete({ where: { id: Number(id) } });
    return { id: Number(id) };
  }
}

export const assessmentService = new AssessmentService();
