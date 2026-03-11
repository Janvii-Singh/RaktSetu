const mongoose = require('mongoose');

const bloodRequestSchema = new mongoose.Schema({
  requesterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    required: [true, 'Blood group is required'],
  },
  urgency: {
    type: String,
    enum: ['normal', 'urgent', 'critical'],
    default: 'normal',
  },
  unitsNeeded: {
    type: Number,
    default: 1,
    min: 1,
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
    address: String,
  },
  status: {
    type: String,
    enum: ['open', 'matched', 'fulfilled', 'expired'],
    default: 'open',
  },
  matchedDonors: [{
    donorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    score: Number,
    distance: Number,
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined'],
      default: 'pending',
    },
    respondedAt: Date,
  }],
  fulfilledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  hospitalName: String,
  contactPhone: String,
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
  },
});

// Geo-spatial index
bloodRequestSchema.index({ location: '2dsphere' });
bloodRequestSchema.index({ status: 1, bloodGroup: 1 });

module.exports = mongoose.model('BloodRequest', bloodRequestSchema);
