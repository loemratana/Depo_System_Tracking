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
}

export default new DepotController();