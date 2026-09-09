import { body, param, query, validationResult } from "express-validator";

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map((err) => ({
        field: err.path || err.param,
        message: err.msg,
      })),
    });
  }
  next();
};

export const assessmentIdParamValidator = [
  param("id").isInt({ min: 1 }).withMessage("Valid assessment id is required").toInt(),
  validate,
];

export const listAssessmentsValidator = [
  query("depotId").optional().isInt({ min: 1 }).toInt(),
  query("cycleId").optional().isInt({ min: 1 }).toInt(),
  query("evaluatorId").optional().isInt({ min: 1 }).toInt(),
  query("brandId").optional().isInt({ min: 1 }).toInt(),
  query("provinceId").optional().isInt({ min: 1 }).toInt(),
  query("districtId").optional().isInt({ min: 1 }).toInt(),
  query("status").optional().isIn(["draft", "submitted", "finalized"]),
  query("qualificationStatus")
    .optional()
    .isIn(["excellent", "good", "needs_improvement", "weak"]),
  query("includeSuperseded").optional().isBoolean().toBoolean(),
  query("search").optional().isString().trim(),
  query("dateFrom").optional().isISO8601().withMessage("dateFrom must be a valid date"),
  query("dateTo").optional().isISO8601().withMessage("dateTo must be a valid date"),
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("pageSize").optional().isInt({ min: 1, max: 100 }).toInt(),
  validate,
];

export const createAssessmentValidator = [
  body("depotId").isInt({ min: 1 }).withMessage("depotId is required").toInt(),
  body("cycleId").isInt({ min: 1 }).withMessage("cycleId is required").toInt(),
  body("assessmentDate")
    .isISO8601()
    .withMessage("assessmentDate must be a valid date"),
  body("evaluatorName")
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 150 })
    .withMessage("evaluatorName must be at most 150 characters"),
  validate,
];

export const updateAssessmentValidator = [
  param("id").isInt({ min: 1 }).withMessage("Valid assessment id is required").toInt(),
  body("evaluatorName")
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 150 })
    .withMessage("evaluatorName must be at most 150 characters"),
  body("assessmentDate")
    .optional()
    .isISO8601()
    .withMessage("assessmentDate must be a valid date"),
  validate,
];

export const updateItemsValidator = [
  param("id").isInt({ min: 1 }).withMessage("Valid assessment id is required").toInt(),
  body("items").isArray({ min: 1 }).withMessage("items must be a non-empty array"),
  body("items.*.criterionId").isInt({ min: 1 }).withMessage("criterionId is required"),
  body("items.*.score")
    .optional({ nullable: true })
    .isInt({ min: 1, max: 10 })
    .withMessage("score must be an integer between 1 and 10"),
  body("items.*.result").optional().isIn(["our_side", "competitor", "none"]),
  body("items.*.remarks").optional({ nullable: true }).isString(),
  validate,
];

export const reopenAssessmentValidator = [
  param("id").isInt({ min: 1 }).withMessage("Valid assessment id is required").toInt(),
  body("reason")
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage("reason must be at most 500 characters"),
  validate,
];

export const createCycleValidator = [
  body("type").isIn(["mid_year", "year_end", "ad_hoc"]).withMessage("Valid type is required"),
  body("label").isString().trim().isLength({ min: 1, max: 100 }),
  body("periodStart").isISO8601().withMessage("periodStart must be a valid date"),
  body("periodEnd").isISO8601().withMessage("periodEnd must be a valid date"),
  validate,
];
