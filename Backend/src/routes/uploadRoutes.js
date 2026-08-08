import express from 'express';
import { uploadProfile, uploadBrandLogo } from '../config/multer.js';
import authMiddleware from '../middleware/auth.js';

const { authenticate } = authMiddleware;
const router = express.Router();

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

export default router;
