import express from 'express';
import {
  uploadProfile,
  uploadBrandLogo,
  uploadImageMemory,
} from '../config/multer.js';
import {
  isCloudinaryConfigured,
  uploadImageBuffer,
} from '../config/cloudinary.js';
import authMiddleware from '../middleware/auth.js';

const { authenticate } = authMiddleware;
const router = express.Router();

const PHOTO_FOLDERS = {
  owner: 'depot-system/owners',
  manager: 'depot-system/managers',
  'sale-supervisor': 'depot-system/sale-supervisors',
  profile: 'depot-system/profiles',
  brand: 'depot-system/brands',
};

router.post('/profile', authenticate, uploadProfile.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const fileUrl = `/uploads/profiles/${req.file.filename}`;

    res.json({
      success: true,
      url: fileUrl,
      message: 'Image uploaded successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Image upload failed' });
  }
});

router.post('/brand-logo', authenticate, uploadBrandLogo.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const fileUrl = `/uploads/brands/${req.file.filename}`;

    res.json({
      success: true,
      url: fileUrl,
      message: 'Brand logo uploaded successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Logo upload failed' });
  }
});

/**
 * Upload image to Cloudinary.
 * POST /api/v1/upload/cloudinary
 * multipart field: image
 * optional query/body: type = owner | manager | sale-supervisor | profile | brand
 */
router.post(
  '/cloudinary',
  authenticate,
  uploadImageMemory.single('image'),
  async (req, res) => {
    try {
      if (!isCloudinaryConfigured()) {
        return res.status(503).json({
          success: false,
          message:
            'Cloudinary is not configured on the server. Set CLOUDINARY_* env vars.',
        });
      }
      if (!req.file?.buffer) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }

      const type = String(req.body?.type || req.query?.type || 'profile')
        .trim()
        .toLowerCase();
      const folder = PHOTO_FOLDERS[type] || PHOTO_FOLDERS.profile;

      const result = await uploadImageBuffer(req.file.buffer, { folder });

      res.json({
        success: true,
        url: result.url,
        publicId: result.publicId,
        message: 'Image uploaded to Cloudinary successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Cloudinary upload failed',
      });
    }
  },
);

export default router;
