// routes/depotRoutes.js
import express from "express";
import multer from 'multer';

import depotController from "../controllers/depotController.js";
import staffController from "../controllers/staffController.js";
import authMiddleware from "../middleware/auth.js";
import {
  createDepotValidator,
  //   updateDepotValidator,
  //   depotIdValidator,
  //   depotQueryValidator,
} from "../validators/depotValidator.js";
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.includes('csv') || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  },
});
const router = express.Router();

//Public route – no auth, must come BEFORE /:id

router.post(
  "/validate-import",
  authMiddleware.authenticate,
  depotController.validateDepotImport,
);
router.get("/template", depotController.downloadTemplate);
router.post('/bulk-import', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message: err.code === 'LIMIT_FILE_SIZE'
          ? 'File too large. Max size is 10 MB.'
          : err.message,
      });
    }
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
}, depotController.bulkImport);
router.post('/export', depotController.exportDepotReport);
router.get('/export', depotController.exportDepotReport);
// JSON-body bulk import (no file upload needed — frontend sends already-mapped rows)
router.post('/bulk-import-json', authMiddleware.authenticate, depotController.bulkImportJson);



//Report route – must be BEFORE /:id
router.get("/report", authMiddleware.authenticate, depotController.getDepotReport);
router.post("/report", authMiddleware.authenticate, depotController.getDepotReport);

// Protected routes (require authentication)
router.post(
  "/",
  authMiddleware.authenticate,
  createDepotValidator,
  depotController.createDepot,
);

router.get("/", authMiddleware.authenticate, depotController.getAllDepots);
router.get("/counts", authMiddleware.authenticate, depotController.getCounts);
router.get("/summary", authMiddleware.authenticate, depotController.getSummary);

// Parameterized route should be LAST
router.get(
  "/unassigned",
  authMiddleware.authenticate,
  depotController.findDepotNotAssigned,
);
router.get("/:id", authMiddleware.authenticate, depotController.getDepotById);
router.delete("/:id", authMiddleware.authenticate, depotController.deleteDepot);
router.patch("/:id", authMiddleware.authenticate, depotController.updateDepot);

// Staff for a depot
router.get("/:id/staffs", authMiddleware.authenticate, staffController.listByDepot);
router.post("/:id/staffs", authMiddleware.authenticate, staffController.create);
router.patch("/:id/staffs/:staffId", authMiddleware.authenticate, staffController.update);
router.delete("/:id/staffs/:staffId", authMiddleware.authenticate, staffController.remove);

//report route

export default router;
