import staffService from "../services/staffService.js";

class StaffController {
  listByDepot = async (req, res, next) => {
    try {
      const data = await staffService.listByDepot(req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      if (error.message === "Depot not found" || error.message === "Invalid depot ID") {
        return res.status(404).json({ success: false, message: error.message });
      }
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const data = await staffService.create(req.params.id, req.body);
      res.status(201).json({ success: true, message: "Staff added", data });
    } catch (error) {
      if (
        error.message === "Depot not found" ||
        error.message === "Invalid depot ID"
      ) {
        return res.status(404).json({ success: false, message: error.message });
      }
      if (
        error.message.includes("required") ||
        error.message.includes("already exists")
      ) {
        return res.status(400).json({ success: false, message: error.message });
      }
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const data = await staffService.update(
        req.params.id,
        req.params.staffId,
        req.body,
      );
      res.json({ success: true, message: "Staff updated", data });
    } catch (error) {
      if (error.message.includes("not found") || error.message === "Invalid ID") {
        return res.status(404).json({ success: false, message: error.message });
      }
      if (
        error.message.includes("required") ||
        error.message.includes("already exists")
      ) {
        return res.status(400).json({ success: false, message: error.message });
      }
      next(error);
    }
  };

  remove = async (req, res, next) => {
    try {
      const data = await staffService.remove(req.params.id, req.params.staffId);
      res.json({ success: true, message: "Staff removed", data });
    } catch (error) {
      if (error.message.includes("not found") || error.message === "Invalid ID") {
        return res.status(404).json({ success: false, message: error.message });
      }
      next(error);
    }
  };
}

export default new StaffController();
