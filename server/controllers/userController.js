const User = require('../models/User');

// @desc    Update user profile
// @route   PUT /api/users/profile
exports.updateProfile = async (req, res, next) => {
  try {
    const allowedFields = ['name', 'phone', 'bloodGroup', 'location', 'isAvailable', 'lastDonationDate'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    // Handle health status update for donors
    if (req.user.role === 'donor' && req.body.healthStatus) {
      updates.healthStatus = {
        ...req.body.healthStatus,
        lastUpdated: new Date(),
      };

      // Auto-set unavailable if any blocking health condition is present
      const hs = updates.healthStatus;
      const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
      const healthBlocking =
        hs.hasFever ||
        hs.isPregnant ||
        hs.onMedication ||
        (hs.weight && hs.weight < 50) ||
        (hs.hadRecentSurgery && hs.surgeryDate && new Date(hs.surgeryDate) > sixMonthsAgo) ||
        (hs.hadRecentTattooOrPiercing && hs.tattooOrPiercingDate && new Date(hs.tattooOrPiercingDate) > sixMonthsAgo);

      if (healthBlocking) {
        updates.isAvailable = false;
      }
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    res.json({ user });
  } catch (error) {
    next(error);
  }
};

// @desc    Get donors (hospital role, with filters)
// @route   GET /api/users/donors
exports.getDonors = async (req, res, next) => {
  try {
    const { bloodGroup, available, lng, lat, radius } = req.query;

    const filter = { role: 'donor' };

    if (bloodGroup) filter.bloodGroup = bloodGroup;
    if (available === 'true') filter.isAvailable = true;

    // Geo-spatial query if coordinates provided
    if (lng && lat) {
      const maxDistance = (parseFloat(radius) || 10) * 1000; // km to meters
      filter.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          $maxDistance: maxDistance,
        },
      };
    }

    const donors = await User.find(filter).select('-password');
    res.json({ donors, count: donors.length });
  } catch (error) {
    next(error);
  }
};
