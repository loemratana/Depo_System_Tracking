import districtController from "../controllers/districtController.js";
import { createDistrictValidator } from "../validators/provinceValidator.js";
import express from 'express';
import multer from 'multer';

// Separate multer instance for Excel uploads (district bulk import)
const excelUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    fileFilter: (_req, file, cb) => {
        const isExcel = file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            || file.mimetype === 'application/vnd.ms-excel'
            || file.originalname.endsWith('.xlsx')
            || file.originalname.endsWith('.xls');
        if (isExcel) {
            cb(null, true);
        } else {
            cb(new Error('Only Excel files (.xlsx, .xls) are allowed'), false);
        }
    }
});

const router = express.Router();

router.get("/", districtController.getAll);
router.post("/", createDistrictValidator, districtController.create);

router.get('/template', districtController.downloadDistrictTemplate);
router.post('/verify', excelUpload.single('file'), districtController.verifyDistrictFile);
router.post('/import', excelUpload.single('file'), districtController.importDistricts);


export default router;