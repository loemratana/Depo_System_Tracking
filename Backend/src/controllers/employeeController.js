import employeeService from '../services/employeeService.js';
import logger from "../config/logger.js";

class EmployeeController {
    async getAll(req, res) {
        try {
            const {search, department, depotId, page = 1, limit = 10} = req.query;
            const result = await employeeService.getAll(
                {search, department, depotId},
                {page: parseInt(page), limit: parseInt(limit)},
            );
            res.json({success: true, ...result});
        } catch (error) {
            res.status(500).json({success: false, message: error.message});
        }
    }

    async getById(req, res) {
        try {
            const employee = await employeeService.findById(req.params.id);
            if (!employee) {
                return res
                    .status(404)
                    .json({success: false, message: "Employee not found"});
            }
            res.json({success: true, data: employee});
        } catch (error) {
            res.status(500).json({success: false, message: error.message});
        }
    }

    async create(req, res) {
        try {
            const employee = await employeeService.create(req.body);

            res.json({
                success: true,
                message: "Employee created successfully",
                data: employee,
            });
        } catch (error) {
            res.status(500).json({success: false, message: error.message});
        }
    }

    async update(req, res) {
        try {
            const employee = await employeeService.update(req.params.id, req.body);
            res.json({success: true, data: employee});
        } catch (error) {
            res.status(500).json({success: false, message: error.message});
        }
    }

    async delete(req, res) {
        try {
            await employeeService.delete(req.params.id);
            res.json({success: true, message: "Employee deleted successfully"});
        } catch (error) {
            res.status(500).json({success: false, message: error.message});
        }
    }

    async getDepartments(req, res) {
        try {
            const departments = await employeeService.getDepartments();
            res.json({success: true, data: departments});
        } catch (error) {
            res.status(500).json({success: false, message: error.message});
        }
    }

    async getEmployeeDepotDetails(req, res) {
        try {
            const employeeId = req.params.employeeId || req.params.id;
            const depots =
                await employeeService.getEmployeeDepotDetails(employeeId);
            res.json({success: true, data: depots});
        } catch (error) {
            res.status(500).json({success: false, message: error.message});
        }
    }

    async getEmployeeDepotSummary(req, res) {
        try {
            const {id} = req.params;
            const summary = await employeeService.getDepotSummary(id);
            res.json({success: true, data: summary});
        } catch (error) {
            res.status(500).json({success: false, message: error.message});
        }
    };


    //for generate report in employee

    async getEmployeeWithDepots(req, res) {

        try {
            const {id} = req.params;
            const result = await employeeService.getEmployeeWithDepots(id);
            res.json({success: true, data: result});
        } catch (error) {
            if (error.message === 'Invalid employee ID' || error.message === 'Employee not found') {
                return res.status(404).json({success: false, message: error.message});
            }
            logger.error('Get employee with depots error:', error);
            res.status(500).json({success: false, message: 'Internal server error'});
        }

    }

    // Download template
    async downloadTemplate(req, res) {
        try {
            const buffer = await employeeService.generateTemplate();
            res.setHeader(
                "Content-Type",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            );
            res.setHeader(
                "Content-Disposition",
                "attachment; filename=employee_template.xlsx",
            );
            res.send(buffer);
        } catch (error) {
            console.error(error);
            res.status(500).json({success: false, message: error.message});
        }
    }

    // Verify uploaded file
    async verifyFile(req, res) {
        try {
            if (!req.file) {
                return res
                    .status(400)
                    .json({success: false, message: "No file uploaded"});
            }
            const result = await employeeService.verifyImport(req.file.buffer);
            res.json({success: true, ...result});
        } catch (error) {
            console.error(error);
            res.status(500).json({success: false, message: error.message});
        }
    }

    // Bulk import (after verification or directly)
    async importEmployees(req, res) {
        try {
            let result;
            if (req.file) {
                result = await employeeService.bulkImport(req.file.buffer);
            } else if (req.body && req.body.employees) {
                result = await employeeService.bulkImportJson(req.body.employees);
            } else {
                return res
                    .status(400)
                    .json({
                        success: false,
                        message: "No file uploaded or data provided",
                    });
            }
            res.json({
                success: result.success !== false,
                ...result,
            });
        } catch (error) {
            console.error(error);
            res.status(400).json({success: false, message: error.message});
        }
    }

    //     async bulkImport(req, res) {
    //     try {
    //         const { employees } = req.body;

    //         // Ensure body contains a valid array of items
    //         if (!employees || !Array.isArray(employees)) {
    //             return res.status(400).json({
    //                 success: false,
    //                 message: 'Invalid payload structure. Expected an "employees" array in the request body.'
    //             });
    //         }

    //         if (employees.length === 0) {
    //             return res.status(400).json({
    //                 success: false,
    //                 message: 'The import array is empty.'
    //             });
    //         }

    //         const importResult = await employeeService.bulkImport(employees);
    //         res.json(importResult);
    //     } catch (error) {
    //         logger.error('EmployeeController bulkImport error:', error);
    //         res.status(500).json({ success: false, message: error.message });
    //     }
    // }
}

export default new EmployeeController();
