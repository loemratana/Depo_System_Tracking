import express from 'express';
import upload from '../config/multer.js';
import authMiddleware from '../middleware/auth.js';
const { authenticate } = authMiddleware;

const router = express.Router();

router.post('/profile', authenticate, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Return the relative path/URL that can be accessed via the static server
    const fileUrl = `/uploads/profiles/${req.file.filename}`;
    
    res.json({
      success: true,
      url: fileUrl,
      message: 'Image uploaded successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Image upload failed' });
  }
});

export default router;
