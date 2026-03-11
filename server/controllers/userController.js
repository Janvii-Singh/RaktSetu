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
