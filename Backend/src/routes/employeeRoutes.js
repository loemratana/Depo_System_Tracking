import employeeController from '../controllers/employeeController.js';
import express from 'express';
import authMiddleware from '../middleware/auth.js';
import multer from 'multer';

const { authenticate, authorize } = authMiddleware;
const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

router.get('/', authenticate, employeeController.getAll);
router.get('/:id/depots-count', authMiddleware.authenticate, employeeController.getEmployeeWithDepots);
router.get('/departments', authenticate, employeeController.getDepartments);
router.get("/:id/depots",authenticate,employeeController.getEmployeeDepotDetails)
router.get('/:id', authenticate, employeeController.getById);
router.get('/:employeeId/employeeDepotDetails', authenticate, employeeController.getEmployeeDepotDetails);
router.post('/', authenticate, employeeController.create);
router.put('/:id', authenticate, employeeController.update);
router.delete('/:id', authenticate, employeeController.delete);


router.get('/bulk/template', authenticate, employeeController.downloadTemplate);

router.post('/bulk/verify', authenticate, upload.single('file'), employeeController.verifyFile);

router.post('/bulk/import', authenticate, upload.single('file'), employeeController.importEmployees);
router.get(
  "/:id/summary-depots",
  authenticate,
  employeeController.getEmployeeDepotSummary,
);
export default router;
