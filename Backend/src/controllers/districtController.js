import districtService from "../services/districtService.js";
import logger from '../config/logger.js';

class DistrictController {
    handleError = (res, error, message = 'An error occurred', statusCode = 500) => {
        logger.error(`${message}:`, error);
        return res.status(statusCode).json({
            success: false,
            message,
            error: error.message
        });
    };

    // Get All Districts
    getAll = async (req, res) => {
        try {
            const result = await districtService.getAll(req.query);

            res.json({
                success: true,
                data: result.districts,
                pagination: result.pagination
            });
        } catch (error) {
            this.handleError(res, error, 'Failed to fetch districts');
        }
    }

    deleteDistrict = async (req, res) => {
        try {
            const result = await districtService.softDelete(req.params.id);

            return res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            this.handleError(res, error, 'Failed to delete district');
        }
    }

    create = async (req, res) => {
        try {
            const district = await districtService.create(req.body);
            res.status(200).json({
                success: true,
                data: district
            });
        } catch (error) {
            this.handleError(res, error, 'Failed to create district');
        }
    }

    downloadDistrictTemplate = async (req, res) => {
        try {
            const buffer = await districtService.generateDistrictTemplate();
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=district_template.xlsx');
            res.send(buffer);   // NOT res.json()
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: error.message });
        }
    };

    verifyDistrictFile = async (req, res) => {
        try {
            if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
            const result = await districtService.verifyDistrictImport(req.file.buffer);

            res.json({
                success: true,
                ...result
            });
        } catch (error) {
            this.handleError(res, error, 'Failed to verify districts');
        }
    }

    importDistricts = async (req, res) => {
        try {
            if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
            const result = await districtService.bulkImportDistricts(req.file.buffer);

            res.json({
                success: true,
                ...result
            });
        } catch (error) {
            this.handleError(res, error, 'Failed to import districts');
        }
    }


}

export default new DistrictController();
