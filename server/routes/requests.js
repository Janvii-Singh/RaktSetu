const express = require('express');
const router = express.Router();
const {
  createRequest,
  getRequests,
  getRequestById,
  updateRequest,
  respondToRequest,
  fulfillRequest,
  createRequestValidation,
} = require('../controllers/requestController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.post('/', protect, authorize('patient', 'hospital'), createRequestValidation, validate, createRequest);
router.get('/', protect, getRequests);
router.get('/:id', protect, getRequestById);
router.put('/:id', protect, authorize('patient', 'hospital'), updateRequest);
router.post('/:id/respond', protect, authorize('donor'), respondToRequest);
router.put('/:id/fulfill', protect, authorize('patient', 'hospital'), fulfillRequest);

module.exports = router;
