import districtController from "../controllers/districtController.js";
import { createDistrictValidator } from "../validators/provinceValidator.js";
import express from 'express';

const router = express.Router();

router.get("/", districtController.getAll);
router.post("/", createDistrictValidator, districtController.create);


export default router;