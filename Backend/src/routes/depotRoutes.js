// routes/depotRoutes.js
import express from 'express';
import depotController from '../controllers/depotController.js';
import authMiddleware from '../middleware/auth.js';
import {
    createDepotValidator,
    //   updateDepotValidator,
    //   depotIdValidator,
    //   depotQueryValidator,
} from '../validators/depotValidator.js';

const router = express.Router();
// Create depot (Admin/Manager only)
router.post(
    '/',
    authMiddleware.authenticate,
    createDepotValidator,
    depotController.createDepot
);

export default router;