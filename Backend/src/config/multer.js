import multer from 'multer';
import path from 'path';
import fs from 'fs';

const profileDir = path.join(process.cwd(), 'uploads', 'profiles');
const brandDir = path.join(process.cwd(), 'uploads', 'brands');

for (const dir of [profileDir, brandDir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const fileFilter = (req, file, cb) => {
  const allowedFileTypes = /jpeg|jpg|png|webp|gif/;
  const isMimeTypeValid = allowedFileTypes.test(file.mimetype);
  const isExtNameValid = allowedFileTypes.test(path.extname(file.originalname).toLowerCase());

  if (isMimeTypeValid && isExtNameValid) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

function makeStorage(subdir, prefix) {
  return multer.diskStorage({
    destination: function (_req, _file, cb) {
      cb(null, path.join(process.cwd(), 'uploads', subdir));
    },
    filename: function (_req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, `${prefix}-${uniqueSuffix}${path.extname(file.originalname)}`);
    },
  });
}

export const uploadProfile = multer({
  storage: makeStorage('profiles', 'profile'),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

export const uploadBrandLogo = multer({
  storage: makeStorage('brands', 'brand'),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

/** Memory storage for Cloudinary uploads (no local disk write). */
export const uploadImageMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

// Default export kept for existing profile upload imports
export default uploadProfile;
