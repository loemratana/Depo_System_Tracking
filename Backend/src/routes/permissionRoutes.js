import express from 'express';
import permissionController from '../controllers/permissionController.js';
import authMiddleware from '../middleware/auth.js';
import {
  createPermissionValidator,
  roleParamValidator,
  setRolePermissionsValidator,
} from '../validators/permissionValidator.js';

const { authenticate, authorize } = authMiddleware;
const router = express.Router();

// Admin-only permission catalog + role assignment management
router.use(authenticate, authorize('admin'));

router.get('/', permissionController.list);
router.post('/', createPermissionValidator, permissionController.create);
router.delete('/:id', permissionController.remove);

router.get('/roles/:role', roleParamValidator, permissionController.listForRole);
router.put('/roles/:role', setRolePermissionsValidator, permissionController.setForRole);

export default router;
