import express from "express";
import multer from "multer";
import authMiddleware from "../middleware/auth.js";
import kpiSystemController from "../controllers/kpiSystemController.js";

const router = express.Router();
const { authenticate } = authMiddleware;
const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype.includes("sheet") ||
      file.mimetype.includes("excel") ||
      file.originalname.endsWith(".xlsx") ||
      file.originalname.endsWith(".xls");
    if (ok) cb(null, true);
    else cb(new Error("Only Excel files (.xlsx, .xls) are allowed"), false);
  },
});

router.use(authenticate);

router.get("/options", kpiSystemController.getFilterOptions);
router.get(
  "/brand-monthly/template",
  kpiSystemController.downloadBrandMonthlyTemplate,
);
router.get("/brand-monthly/export", kpiSystemController.exportBrandMonthly);
router.get("/brand-monthly", kpiSystemController.listBrandMonthly);
router.post("/brand-monthly", kpiSystemController.upsertBrandMonthly);
router.post(
  "/brand-monthly/import",
  excelUpload.single("file"),
  kpiSystemController.importBrandMonthly,
);
router.get("/definitions", kpiSystemController.listDefinitions);
router.get("/summary", kpiSystemController.getSummary);
router.get("/", kpiSystemController.getRankings);
router.get(
  "/brand-targets/template",
  kpiSystemController.downloadBrandTargetTemplate,
);
router.post("/brand-targets", kpiSystemController.setBrandTarget);
router.post(
  "/brand-targets/import",
  excelUpload.single("file"),
  kpiSystemController.importBrandTargets,
);
router.post("/seed-catalog", kpiSystemController.seedCatalog);

export default router;
