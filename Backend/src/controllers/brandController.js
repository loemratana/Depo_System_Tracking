import brandService from "../services/brandService.js";
import logger from "../config/logger.js";


export class BrandController {
  getAllBrands = async (req, res) => {
    try {
      const { search, status } = req.query;
      const brands = await brandService.getAll({ search, status });
      res.json({ success: true, data: brands });
    } catch (error) {
      logger.error("Get all brands error:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to fetch brands" });
    }
  };

  getBrandById = async (req, res) => {
    try {
      const { id } = req.params;
      const brand = await brandService.getById(id);
      res.json({ success: true, data: brand });
    } catch (error) {
      if (error.message === "Brand not found") {
        return res.status(404).json({ success: false, message: error.message });
      }
      res
        .status(500)
        .json({ success: false, message: "Failed to fetch brand" });
    }
  };

  getCountDepots = async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid brand id",
        });
      }

      const data = await brandService.getBrandDepotCountById(id);

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error("Error getting brand depot count:", error);

      return res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }

  }

  createBrand = async (req, res) => {
    try {
      const brand = await brandService.create(req.body);
      res.status(201).json({ success: true, data: brand });
    } catch (error) {
      const status = error.message.includes("already exists") ? 400 : 500;
      res.status(status).json({ success: false, message: error.message });
    }
  };

  updateBrand = async (req, res) => {
    try {
      const { id } = req.params;
      const brand = await brandService.update(id, req.body);
      res.json({ success: true, data: brand });
    } catch (error) {
      const status =
        error.message.includes("not found") ||
        error.message.includes("already exists")
          ? 400
          : 500;
      res.status(status).json({ success: false, message: error.message });
    }
  };

  deleteBrand = async (req, res) => {
    try {
      const { id } = req.params;
      const result = await brandService.delete(id);
      res.json({ success: true, message: result.message });
    } catch (error) {
      if (error.message === "Brand not found") {
        return res.status(404).json({ success: false, message: error.message });
      }
      if (error.message.includes("Cannot delete brand")) {
        return res.status(409).json({ success: false, message: error.message });
      }
      logger.error("Delete brand error:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to delete brand" });
    }
  };
}

export default new BrandController();
