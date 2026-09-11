import express from "express";
import authMiddleware from "../middleware/auth.js";
import assessmentController from "../controllers/assessmentController.js";
import {
  assessmentIdParamValidator,
  listAssessmentsValidator,
  createAssessmentValidator,
  updateAssessmentValidator,
  updateItemsValidator,
  reopenAssessmentValidator,
  createCycleValidator,
} from "../validators/assessmentValidator.js";

const { authenticate, authorize } = authMiddleware;
const router = express.Router();

router.use(authenticate);

router.get("/cycles", assessmentController.listCycles);
router.post(
  "/cycles",
  authorize("admin", "manager"),
  createCycleValidator,
  assessmentController.createCycle,
);

router.get("/criteria", assessmentController.listCriteria);

router.get("/", listAssessmentsValidator, assessmentController.listAssessments);
router.get(
  "/export",
  listAssessmentsValidator,
  assessmentController.exportAssessments,
);
router.post("/", createAssessmentValidator, assessmentController.createAssessment);
router.get("/:id", assessmentIdParamValidator, assessmentController.getAssessment);
router.get(
  "/:id/previous",
  assessmentIdParamValidator,
  assessmentController.getPreviousAssessment,
);
router.patch(
  "/:id",
  updateAssessmentValidator,
  assessmentController.updateAssessment,
);
router.patch(
  "/:id/items",
  updateItemsValidator,
  assessmentController.updateItems,
);
router.post(
  "/:id/submit",
  assessmentIdParamValidator,
  assessmentController.submitAssessment,
);
router.post(
  "/:id/finalize",
  authorize("admin", "manager"),
  assessmentIdParamValidator,
  assessmentController.finalizeAssessment,
);
router.post(
  "/:id/reopen",
  authorize("admin", "manager"),
  reopenAssessmentValidator,
  assessmentController.reopenAssessment,
);
router.delete(
  "/:id",
  authorize("admin", "manager"),
  assessmentIdParamValidator,
  assessmentController.deleteAssessment,
);

export default router;
