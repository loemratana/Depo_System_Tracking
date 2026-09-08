import permissionService from '../services/permissionService.js';
import logger from '../config/logger.js';

const CLIENT_ERRORS_PREFIXES = ['Role must be'];

class PermissionController {
  handleError(res, error, fallback = 'An error occurred') {
    logger.error(`${fallback}:`, error);
    const isClient =
      CLIENT_ERRORS_PREFIXES.some((p) => error.message?.startsWith(p)) ||
      error.code === 'P2002';
    return res.status(isClient ? 400 : 500).json({
      success: false,
      message: error.message || fallback,
      error: error.message,
    });
  }

  list = async (req, res) => {
    try {
      const permissions = await permissionService.listPermissions();
      return res.json({ success: true, data: permissions });
    } catch (error) {
      return this.handleError(res, error, 'Failed to list permissions');
    }
  };

  create = async (req, res) => {
    try {
      const permission = await permissionService.createPermission(req.body);
      return res.status(201).json({ success: true, data: permission });
    } catch (error) {
      return this.handleError(res, error, 'Failed to create permission');
    }
  };

  remove = async (req, res) => {
    try {
      await permissionService.deletePermission(Number(req.params.id));
      return res.json({ success: true, message: 'Permission deleted' });
    } catch (error) {
      return this.handleError(res, error, 'Failed to delete permission');
    }
  };

  listForRole = async (req, res) => {
    try {
      const permissions = await permissionService.listRolePermissions(req.params.role);
      return res.json({ success: true, data: permissions });
    } catch (error) {
      return this.handleError(res, error, 'Failed to list role permissions');
    }
  };

  setForRole = async (req, res) => {
    try {
      const permissions = await permissionService.setRolePermissions(
        req.params.role,
        req.body.permissionIds,
      );
      return res.json({ success: true, data: permissions });
    } catch (error) {
      return this.handleError(res, error, 'Failed to update role permissions');
    }
  };
}

export default new PermissionController();
