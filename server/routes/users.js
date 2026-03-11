const express = require('express');
const router = express.Router();
const { updateProfile, getDonors } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.put('/profile', protect, updateProfile);
router.get('/donors', protect, authorize('hospital'), getDonors);

module.exports = router;
