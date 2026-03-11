const mongoose = require('mongoose');

const donationHistorySchema = new mongoose.Schema({
  donorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  requestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BloodRequest',
    required: true,
  },
  respondedAt: {
    type: Date,
    default: Date.now,
  },
  accepted: {
    type: Boolean,
    required: true,
  },
  donatedAt: {
    type: Date,
  },
});

donationHistorySchema.index({ donorId: 1 });
donationHistorySchema.index({ requestId: 1 });

module.exports = mongoose.model('DonationHistory', donationHistorySchema);
