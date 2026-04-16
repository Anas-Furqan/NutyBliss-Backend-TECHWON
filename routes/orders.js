const express = require('express');
const router = express.Router();
const {
  createOrder,
  getMyOrders,
  getOrder,
  trackOrder,
  getAllOrders,
  updateOrderStatus,
  cancelOrder
} = require('../controllers/orderController');
<<<<<<< HEAD
const { protect, adminOnly } = require('../middleware/auth');
=======
const { protect, optionalAuth, adminOnly } = require('../middleware/auth');
>>>>>>> 31ff1966709dec4a1950373b2618f45c0bda59d2

// Public
router.get('/track', trackOrder);

// Protected
<<<<<<< HEAD
router.post('/', protect, createOrder);
=======
router.post('/', optionalAuth, createOrder);
>>>>>>> 31ff1966709dec4a1950373b2618f45c0bda59d2
router.get('/my-orders', protect, getMyOrders);
router.get('/:id', protect, getOrder);

// Admin
router.get('/', protect, adminOnly, getAllOrders);
router.put('/:id/status', protect, adminOnly, updateOrderStatus);
router.put('/:id/cancel', protect, adminOnly, cancelOrder);

module.exports = router;
