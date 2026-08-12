// routes/depotRoutes.js
import express from "express";
import multer from "multer";

import depotController from "../controllers/depotController.js";
import staffController from "../controllers/staffController.js";
import authMiddleware from "../middleware/auth.js";
import {
  createDepotValidator,
} from "../validators/depotValidator.js";

const { authenticate } = authMiddleware;

import { uploadImageMemory } from "../config/multer.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const name = (file.originalname || "").toLowerCase();
    const type = (file.mimetype || "").toLowerCase();
    const ok =
      name.endsWith(".csv") ||
      name.endsWith(".xlsx") ||
      name.endsWith(".xls") ||
      type.includes("csv") ||
      type.includes("spreadsheet") ||
      type.includes("excel");
    if (ok) cb(null, true);
    else
      cb(
        new Error("Only Excel (.xlsx, .xls) or CSV files are allowed"),
        false,
      );
  },
});

const handleUpload = (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message:
          err.code === "LIMIT_FILE_SIZE"
            ? "File too large. Max size is 10 MB."
            : err.message,
      });
    }
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
};

const router = express.Router();

router.use(authenticate);

router.post("/validate-import", depotController.validateDepotImport);
router.post("/verify", handleUpload, depotController.verifyDepotFile);
router.get("/template", depotController.downloadTemplate);
router.post("/bulk-import", handleUpload, depotController.bulkImport);
router.post("/export", depotController.exportDepotReport);
router.get("/export", depotController.exportDepotReport);
router.post("/bulk-import-json", depotController.bulkImportJson);

router.get("/report", depotController.getDepotReport);
router.post("/report", depotController.getDepotReport);

router.post("/", createDepotValidator, depotController.createDepot);
router.get("/", depotController.getAllDepots);
router.get("/counts", depotController.getCounts);
router.get("/summary", depotController.getSummary);

router.get("/unassigned", depotController.findDepotNotAssigned);
router.get("/:id", depotController.getDepotById);
router.delete("/:id", depotController.deleteDepot);
router.patch("/:id", depotController.updateDepot);

// Image endpoints
router.post("/:id/image", uploadImageMemory.single("image"), depotController.uploadOwnerPhoto);
router.delete("/:id/image", depotController.removeOwnerPhoto);

router.get("/:id/staffs", staffController.listByDepot);
router.post("/:id/staffs", staffController.create);
router.patch("/:id/staffs/:staffId", staffController.update);
router.delete("/:id/staffs/:staffId", staffController.remove);

export default router;
