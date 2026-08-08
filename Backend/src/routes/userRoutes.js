import express from 'express';
import multer from 'multer';
import userController from '../controllers/userController.js';
import authMiddleware from '../middleware/auth.js';
import {
  createUserValidator,
  updateUserValidator,
  listUsersValidator,
} from '../validators/userValidator.js';

const { authenticate, authorize } = authMiddleware;
const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

// Admin-only user management (no public self-register)
router.use(authenticate, authorize('admin'));

router.get('/', listUsersValidator, userController.list);
router.get('/template', userController.downloadTemplate);
router.post('/bulk/import', upload.single('file'), userController.importUsers);

router.get('/:id', userController.getById);
router.post('/', createUserValidator, userController.create);
router.put('/:id', updateUserValidator, userController.update);
router.delete('/:id', userController.remove);

export default router;
