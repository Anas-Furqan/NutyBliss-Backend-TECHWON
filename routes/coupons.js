const express = require('express');
const router = express.Router();
const {
  validateCoupon,
  getAllCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  toggleCouponStatus
} = require('../controllers/couponController');
const { protect, adminOnly } = require('../middleware/auth');

// Public
router.post('/validate', validateCoupon);

// Admin
router.get('/', protect, adminOnly, getAllCoupons);
router.post('/', protect, adminOnly, createCoupon);
router.put('/:id', protect, adminOnly, updateCoupon);
router.delete('/:id', protect, adminOnly, deleteCoupon);
router.put('/:id/toggle', protect, adminOnly, toggleCouponStatus);

module.exports = router;
