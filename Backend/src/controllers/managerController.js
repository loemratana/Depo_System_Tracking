import managerService from "../services/managerService.js";

class ManagerController {
  async getAll(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search || "";

      const result = await managerService.getAll({ search }, { page, limit });
      res.json({ success: true, data: result.managers, pagination: result.pagination });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getById(req, res) {
    try {
      const manager = await managerService.getById(req.params.id);
      res.json({ success: true, data: manager });
    } catch (error) {
      if (error.message === "Manager not found") {
        return res.status(404).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async create(req, res) {
    try {
      const manager = await managerService.create(req.body);
      res.status(201).json({ success: true, data: manager, message: "Manager created successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async update(req, res) {
    try {
      const manager = await managerService.update(req.params.id, req.body);
      res.json({ success: true, data: manager, message: "Manager updated successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async delete(req, res) {
    try {
      await managerService.delete(req.params.id);
      res.json({ success: true, message: "Manager deleted successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async uploadImage(req, res) {
    try {
      if (!req.file || !req.file.buffer) {
        return res.status(400).json({ success: false, message: "No file uploaded" });
      }

      const manager = await managerService.uploadImage(req.params.id, req.file.buffer);
      res.json({ success: true, data: manager, message: "Manager image uploaded successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async removeImage(req, res) {
    try {
      const manager = await managerService.removeImage(req.params.id);
      res.json({ success: true, data: manager, message: "Manager image removed successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

export default new ManagerController();
