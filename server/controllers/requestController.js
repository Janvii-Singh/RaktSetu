const { body } = require('express-validator');
const BloodRequest = require('../models/BloodRequest');
const DonationHistory = require('../models/DonationHistory');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { findMatchingDonors } = require('../services/matchingService');

exports.createRequestValidation = [
  body('bloodGroup').isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).withMessage('Valid blood group required'),
  body('urgency').optional().isIn(['normal', 'urgent', 'critical']),
  body('location.coordinates').isArray({ min: 2, max: 2 }).withMessage('Location coordinates required'),
];

// @desc    Create blood request
// @route   POST /api/requests
exports.createRequest = async (req, res, next) => {
  try {
    const { bloodGroup, urgency, location, hospitalName, contactPhone, notes, unitsNeeded } = req.body;

    const request = await BloodRequest.create({
      requesterId: req.user._id,
      bloodGroup,
      urgency,
      location,
      hospitalName,
      contactPhone,
      notes,
      unitsNeeded,
    });

    // Find matching donors
    const matchedDonors = await findMatchingDonors(request);
    request.matchedDonors = matchedDonors;
    if (matchedDonors.length > 0) {
      request.status = 'matched';
    }
    await request.save();

    // Notify matched donors
    const io = req.app.get('io');
    for (const match of matchedDonors) {
      const notification = await Notification.create({
        userId: match.donorId,
        type: 'new-request',
        message: `New ${urgency || 'normal'} blood request for ${bloodGroup} near you`,
        requestId: request._id,
      });

      if (io) {
        io.to(match.donorId.toString()).emit('new-request', {
          notification,
          request: {
            _id: request._id,
            bloodGroup: request.bloodGroup,
            urgency: request.urgency,
            hospitalName: request.hospitalName,
            distance: match.distance,
          },
        });
      }
    }

    res.status(201).json({ request });
  } catch (error) {
    next(error);
  }
};

// @desc    Get requests (role-filtered)
// @route   GET /api/requests
exports.getRequests = async (req, res, next) => {
  try {
    let filter = {};
    const { status, bloodGroup } = req.query;

    if (req.user.role === 'donor') {
      // Donors see requests they've been matched to
      filter = { 'matchedDonors.donorId': req.user._id };
    } else if (req.user.role === 'patient') {
      filter = { requesterId: req.user._id };
    }
    // Hospital sees all requests (no extra filter)

    if (status) filter.status = status;
    if (bloodGroup) filter.bloodGroup = bloodGroup;

    const requests = await BloodRequest.find(filter)
      .populate('requesterId', 'name email phone role')
      .sort({ createdAt: -1 });

    res.json({ requests, count: requests.length });
  } catch (error) {
    next(error);
  }
};

// @desc    Get request by ID
// @route   GET /api/requests/:id
exports.getRequestById = async (req, res, next) => {
  try {
    const request = await BloodRequest.findById(req.params.id)
      .populate('requesterId', 'name email phone role')
      .populate('matchedDonors.donorId', 'name phone bloodGroup location')
      .populate('fulfilledBy', 'name phone bloodGroup');

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    res.json({ request });
  } catch (error) {
    next(error);
  }
};

// @desc    Update request status
// @route   PUT /api/requests/:id
exports.updateRequest = async (req, res, next) => {
  try {
    const request = await BloodRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Only requester or hospital can update
    if (
      request.requesterId.toString() !== req.user._id.toString() &&
      req.user.role !== 'hospital'
    ) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { status } = req.body;
    if (status) request.status = status;
    await request.save();

    res.json({ request });
  } catch (error) {
    next(error);
  }
};

// @desc    Donor responds to a request
// @route   POST /api/requests/:id/respond
exports.respondToRequest = async (req, res, next) => {
  try {
    const { accepted } = req.body;
    const request = await BloodRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    const matchIndex = request.matchedDonors.findIndex(
      (m) => m.donorId.toString() === req.user._id.toString()
    );

    if (matchIndex === -1) {
      return res.status(403).json({ message: 'You are not matched to this request' });
    }

    request.matchedDonors[matchIndex].status = accepted ? 'accepted' : 'declined';
    request.matchedDonors[matchIndex].respondedAt = new Date();
    await request.save();

    // Save to donation history
    await DonationHistory.create({
      donorId: req.user._id,
      requestId: request._id,
      accepted,
    });

    // Notify requester
    const io = req.app.get('io');
    const notification = await Notification.create({
      userId: request.requesterId,
      type: 'donor-response',
      message: `A donor has ${accepted ? 'accepted' : 'declined'} your blood request for ${request.bloodGroup}`,
      requestId: request._id,
    });

    if (io) {
      io.to(request.requesterId.toString()).emit('donor-response', {
        notification,
        requestId: request._id,
        donorId: req.user._id,
        accepted,
      });
    }

    res.json({ message: `Request ${accepted ? 'accepted' : 'declined'}`, request });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark request as fulfilled
// @route   PUT /api/requests/:id/fulfill
exports.fulfillRequest = async (req, res, next) => {
  try {
    const request = await BloodRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    const { donorId } = req.body;
    request.status = 'fulfilled';
    request.fulfilledBy = donorId || req.user._id;
    await request.save();

    // Update donor: set last donation date and mark unavailable for 90-day cooldown
    await User.findByIdAndUpdate(request.fulfilledBy, {
      lastDonationDate: new Date(),
      isAvailable: false,
    });

    // Notify the donor about their 90-day cooldown
    await Notification.create({
      userId: request.fulfilledBy,
      type: 'general',
      message: `Thank you for donating blood! You have been marked unavailable for the next 90 days as per medical guidelines. You will be automatically re-enabled after the cooldown.`,
    });

    // Update donation history
    await DonationHistory.findOneAndUpdate(
      { donorId: request.fulfilledBy, requestId: request._id },
      { donatedAt: new Date() }
    );

    // Notify all parties
    const io = req.app.get('io');
    const usersToNotify = [
      request.requesterId,
      ...request.matchedDonors
        .filter((m) => m.status === 'accepted')
        .map((m) => m.donorId),
    ];

    for (const userId of usersToNotify) {
      const notification = await Notification.create({
        userId,
        type: 'request-fulfilled',
        message: `Blood request for ${request.bloodGroup} has been fulfilled`,
        requestId: request._id,
      });

      if (io) {
        io.to(userId.toString()).emit('request-fulfilled', { notification, requestId: request._id });
      }
    }

    res.json({ message: 'Request fulfilled', request });
  } catch (error) {
    next(error);
  }
};
