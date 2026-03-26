const express = require('express');
const router = express.Router();
const {
  uploadMiddleware,
  uploadImage,
  uploadImages,
  deleteImage
} = require('../controllers/uploadController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect, adminOnly);

router.post('/single', uploadMiddleware.single('image'), uploadImage);
router.post('/multiple', uploadMiddleware.array('images', 10), uploadImages);
router.delete('/:filename', deleteImage);

module.exports = router;
