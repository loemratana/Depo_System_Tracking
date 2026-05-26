import depotService from '../services/depotService.js';
import logger from '../config/logger.js';
class DepotController {
    async createDepot(req, res) {
        try {
            const depot = await depotService.createDepot(req.body);
            res.status(201).json({
                success: true,
                message: 'Depot created successfully',
                data: depot,
            });
        } catch (error) {
            logger.error(`Error creating depot: ${error.message}`);
            res.status(400).json({
                success: false,
                message: error.message || 'Error creating depot'
            });
        }
    }

    // Get all depots with flexible filtering
    getAllDepots = async (req, res) => {
        try {
            const { page, pageSize, sortBy, sortOrder, ...filters } = req.query;

            const result = await depotService.getAllDepot({
                page: parseInt(page) || 1,
                pageSize: parseInt(pageSize) || 10,
                sortBy: sortBy || 'createdAt',
                sortOrder: sortOrder || 'desc',
                filters: filters,
            });

            return res.status(200).json({
                success: true,
                data: result.data,
                pagination: result.pagination,
                filtersApplied: result.filtersApplied,
            });
        } catch (error) {

            logger.error(`Error fetching depots: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message,
            });
        }
    };

}

export default new DepotController();