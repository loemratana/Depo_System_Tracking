import express from 'express';
import provinceController from '../controllers/provinceController.js';
import { createProvinceValidator, getProvincesValidator } from '../validators/provinceValidator.js';

const router = express.Router();

router.post('/', createProvinceValidator, provinceController.createProvince);
router.get('/', getProvincesValidator, provinceController.getAllProvinces);
router.put('/:id', provinceController.update)

export default router;
