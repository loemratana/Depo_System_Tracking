import provinceService from '../services/provinceService.js';
import logger from '../config/logger.js';

class ProvinceController {
    handleError = (res, error, message = 'An error occurred', statusCode = 500) => {
        logger.error(`${message}:`, error);
        return res.status(statusCode).json({
            success: false,
            message,
            error: error.message
        });
    };

    // Create province
    createProvince = async (req, res) => {
        try {
            const province = await provinceService.createProvince(req.body);

            res.status(201).json({
                success: true,
                message: 'Province created successfully',
                data: province
            });
        } catch (error) {
            this.handleError(res, error);
        }
    }

    // Get all provinces
    getAllProvinces = async (req, res) => {
        try {
            const result = await provinceService.getAllProvinces(req.query);

            res.json({
                success: true,
                data: result.provinces,
                pagination: result.pagination
            });
        } catch (error) {
            this.handleError(res, error);
        }
    }

    update = async (req, res) => {
        try {
            const result = await provinceService.update(req.params.id, req.body);
            res.json({
                success: true,
                message: 'Province updated successfully',
                data: result
            });
        } catch (error) {
            this.handleError(res, error, 'Failed to update province');
        }
    };

    delete = async (req, res) => {
        try {
            await provinceService.delete(req.params.id);
            res.json({
                success: true,
                message: 'Province deleted successfully'
            });
        } catch (error) {
            this.handleError(res, error, 'Failed to delete province');
        }
    };
}

export default new ProvinceController();
