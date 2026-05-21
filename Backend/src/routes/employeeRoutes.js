import employeeController from '../controllers/employeeController.js';
import express from 'express';
import authMiddleware from '../middleware/auth.js';
const { authenticate, authorize } = authMiddleware;

const router = express.Router();

router.get('/', authenticate, employeeController.getAll);
router.get('/departments', authenticate, employeeController.getDepartments);
router.get('/:id', authenticate, employeeController.getById);
router.post('/', authenticate, employeeController.create);
router.put('/:id', authenticate, employeeController.update);
router.delete('/:id', authenticate, employeeController.delete);

// Register bulk import route
router.post('/bulk-import', authenticate, employeeController.bulkImport);

export default router;
