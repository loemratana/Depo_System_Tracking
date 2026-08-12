import express from "express";
import managerController from "../controllers/managerController.js";
import authMiddleware from "../middleware/auth.js";
import { uploadImageMemory } from "../config/multer.js";

const { authenticate } = authMiddleware;
const router = express.Router();

router.use(authenticate);

router.get("/", managerController.getAll);
router.get("/:id", managerController.getById);
router.post("/", managerController.create);
router.put("/:id", managerController.update);
router.delete("/:id", managerController.delete);

// Image endpoints
router.post("/:id/image", uploadImageMemory.single("image"), managerController.uploadImage);
router.delete("/:id/image", managerController.removeImage);

export default router;
