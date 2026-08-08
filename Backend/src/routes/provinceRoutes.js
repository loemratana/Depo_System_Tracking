import express from 'express';
import provinceController from '../controllers/provinceController.js';
import { createProvinceValidator, getProvincesValidator } from '../validators/provinceValidator.js';
import authMiddleware from '../middleware/auth.js';
import multer from 'multer';

const { authenticate } = authMiddleware;

const excelUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const isExcel = file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            || file.mimetype === 'application/vnd.ms-excel'
            || file.originalname.endsWith('.xlsx')
            || file.originalname.endsWith('.xls');
        if (isExcel) { cb(null, true); } else { cb(new Error('Only Excel files (.xlsx, .xls) are allowed'), false); }
    }
});

const router = express.Router();

router.use(authenticate);

// Static paths before /:id
router.get('/template', provinceController.downloadProvinceTemplate);
router.post('/verify', excelUpload.single('file'), provinceController.verifyProvinceFile);
router.post('/import', excelUpload.single('file'), provinceController.importProvinces);

router.post('/', createProvinceValidator, provinceController.createProvince);
router.get('/', getProvincesValidator, provinceController.getAllProvinces);
router.get('/:id', provinceController.getById);
router.put('/:id', provinceController.update);
router.delete('/:id', provinceController.delete);

export default router;
