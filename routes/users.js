const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');

router.get('/', protect, (req, res) => {
  res.json({ success: true, user: req.user });
});

module.exports = router;
