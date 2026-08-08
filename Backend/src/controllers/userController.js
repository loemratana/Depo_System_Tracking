import userService from '../services/userService.js';
import logger from '../config/logger.js';

const CLIENT_ERRORS = [
  'User not found',
  'User already exists',
  'Email / username is required',
  'Password must be at least 6 characters',
  'Email is already in use',
  'You cannot delete your own account',
];

class UserController {
  handleError(res, error, fallback = 'An error occurred') {
    logger.error(`${fallback}:`, error);
    const isClient =
      CLIENT_ERRORS.includes(error.message) ||
      error.message?.startsWith('Role must be') ||
      error.message?.startsWith('Status must be') ||
      error.message?.startsWith('Employee #');
    return res.status(isClient ? 400 : 500).json({
      success: false,
      message: error.message || fallback,
      error: error.message,
    });
  }

  list = async (req, res) => {
    try {
      const result = await userService.listUsers({
        page: req.query.page,
        pageSize: req.query.pageSize || req.query.limit,
        search: req.query.search,
        role: req.query.role,
        status: req.query.status,
      });
      return res.json({ success: true, ...result });
    } catch (error) {
      return this.handleError(res, error, 'Failed to list users');
    }
  };

  getById = async (req, res) => {
    try {
      const user = await userService.getById(req.params.id);
      return res.json({ success: true, data: user });
    } catch (error) {
      return this.handleError(res, error, 'Failed to get user');
    }
  };

  create = async (req, res) => {
    try {
      const user = await userService.createUser(req.body);
      return res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: user,
      });
    } catch (error) {
      return this.handleError(res, error, 'Failed to create user');
    }
  };

  update = async (req, res) => {
    try {
      const user = await userService.updateUser(req.params.id, req.body);
      return res.json({
        success: true,
        message: 'User updated successfully',
        data: user,
      });
    } catch (error) {
      return this.handleError(res, error, 'Failed to update user');
    }
  };

  remove = async (req, res) => {
    try {
      const result = await userService.deleteUser(req.params.id, req.user.id);
      return res.json({
        success: true,
        message: 'User deleted successfully',
        data: result,
      });
    } catch (error) {
      return this.handleError(res, error, 'Failed to delete user');
    }
  };

  downloadTemplate = async (req, res) => {
    try {
      const buffer = await userService.generateTemplate();
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="user_import_template.xlsx"',
      );
      return res.send(Buffer.from(buffer));
    } catch (error) {
      return this.handleError(res, error, 'Failed to download template');
    }
  };

  importUsers = async (req, res) => {
    try {
      if (!req.file?.buffer) {
        return res.status(400).json({
          success: false,
          message: 'Excel file is required (field name: file)',
        });
      }
      const result = await userService.importFromExcel(req.file.buffer);
      return res.status(207).json({
        success: true,
        message: `${result.imported} user(s) imported, ${result.failed} failed.`,
        data: result,
      });
    } catch (error) {
      return this.handleError(res, error, 'Failed to import users');
    }
  };
}

export default new UserController();
