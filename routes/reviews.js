const express = require('express');
const router = express.Router();
const {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
  markHelpful,
  getAllReviews,
  moderateReview
} = require('../controllers/reviewController');
const { protect, adminOnly } = require('../middleware/auth');

// Public
router.get('/product/:productId', getProductReviews);
router.post('/:id/helpful', markHelpful);

// Protected
router.post('/', protect, createReview);
router.put('/:id', protect, updateReview);
router.delete('/:id', protect, deleteReview);

// Admin
router.get('/', protect, adminOnly, getAllReviews);
router.put('/:id/moderate', protect, adminOnly, moderateReview);

module.exports = router;
