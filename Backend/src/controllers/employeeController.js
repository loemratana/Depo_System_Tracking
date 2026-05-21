import employeeService from '../services/employeeService.js';

class EmployeeController {
    async getAll(req, res) {
        try {
            const { search, department, depotId, page = 1, limit = 10 } = req.query;
            const result = await employeeService.getAll(
                { search, department, depotId },
                { page: parseInt(page), limit: parseInt(limit) }
            );
            res.json({ success: true, ...result });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async getById(req, res) {
        try {
            const employee = await employeeService.getById(req.params.id);
            if (!employee) {
                return res.status(404).json({ success: false, message: 'Employee not found' });
            }
            res.json({ success: true, data: employee });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async create(req, res) {
        try {
            const employee = await employeeService.create(req.body);

            res.json({
                success: true,
                message: 'Employee created successfully',
                data: employee

            })
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async update(req, res) {
        try {
            const employee = await employeeService.update(req.params.id, req.body);
            res.json({ success: true, data: employee });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async delete(req, res) {
        try {
            await employeeService.delete(req.params.id);
            res.json({ success: true, message: 'Employee deleted successfully' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async getDepartments(req, res) {
        try {
            const departments = await employeeService.getDepartments();
            res.json({ success: true, data: departments });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async bulkImport(req, res) {
        try {
            const { employees } = req.body;

            // Ensure body contains a valid array of items
            if (!employees || !Array.isArray(employees)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid payload structure. Expected an "employees" array in the request body.'
                });
            }

            if (employees.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'The import array is empty.'
                });
            }

            const importResult = await employeeService.bulkImport(employees);
            res.json(importResult);
        } catch (error) {
            logger.error('EmployeeController bulkImport error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

}

export default new EmployeeController();
