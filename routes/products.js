const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProduct,
  getRelatedProducts,
  getCategories,
  createProduct,
  updateProduct,
  deleteProduct,
  getAllProductsAdmin
} = require('../controllers/productController');
const { protect, adminOnly } = require('../middleware/auth');

// Public routes
router.get('/', getProducts);
router.get('/categories', getCategories);
router.get('/:id', getProduct);
router.get('/:id/related', getRelatedProducts);

// Admin routes
router.get('/admin/all', protect, adminOnly, getAllProductsAdmin);
router.post('/', protect, adminOnly, createProduct);
router.put('/:id', protect, adminOnly, updateProduct);
router.delete('/:id', protect, adminOnly, deleteProduct);

module.exports = router;
