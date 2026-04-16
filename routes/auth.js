const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  updateProfile,
  updatePassword,
<<<<<<< HEAD
  logout,
=======
>>>>>>> 31ff1966709dec4a1950373b2618f45c0bda59d2
  addAddress,
  updateAddress,
  deleteAddress
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
<<<<<<< HEAD
router.post('/logout', logout);
=======
>>>>>>> 31ff1966709dec4a1950373b2618f45c0bda59d2
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/password', protect, updatePassword);
router.post('/addresses', protect, addAddress);
router.put('/addresses/:addressId', protect, updateAddress);
router.delete('/addresses/:addressId', protect, deleteAddress);

module.exports = router;
