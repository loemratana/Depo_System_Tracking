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
}

export default new DistrictController();
