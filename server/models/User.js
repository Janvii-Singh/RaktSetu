const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false,
  },
  role: {
    type: String,
    enum: ['donor', 'patient', 'hospital'],
    required: [true, 'Role is required'],
  },
  phone: {
    type: String,
    trim: true,
  },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      default: [0, 0],
    },
    address: String,
  },
  lastDonationDate: {
    type: Date,
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
  lastLoginDate: {
    type: Date,
  },

  // Health status — donors only, required at registration, updated regularly
  healthStatus: {
    hasFever: { type: Boolean, default: false },
    isPregnant: { type: Boolean, default: false },
    onMedication: { type: Boolean, default: false },
    hadRecentSurgery: { type: Boolean, default: false },
    surgeryDate: { type: Date },
    hadRecentTattooOrPiercing: { type: Boolean, default: false },
    tattooOrPiercingDate: { type: Date },
    weight: { type: Number }, // in kg, must be >= 50
    lastUpdated: { type: Date },
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Geo-spatial index
userSchema.index({ location: '2dsphere' });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Virtual: compute health-based eligibility reason for donors
userSchema.methods.getHealthEligibility = function () {
  const hs = this.healthStatus;
  if (!hs) return { eligible: true };

  const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);

  if (hs.hasFever) return { eligible: false, reason: 'Currently has fever' };
  if (hs.isPregnant) return { eligible: false, reason: 'Currently pregnant' };
  if (hs.onMedication) return { eligible: false, reason: 'Currently on medication' };
  if (hs.weight && hs.weight < 50) return { eligible: false, reason: 'Weight below 50kg' };
  if (hs.hadRecentSurgery && hs.surgeryDate && hs.surgeryDate > sixMonthsAgo) {
    return { eligible: false, reason: 'Had surgery within last 6 months' };
  }
  if (hs.hadRecentTattooOrPiercing && hs.tattooOrPiercingDate && hs.tattooOrPiercingDate > sixMonthsAgo) {
    return { eligible: false, reason: 'Had tattoo/piercing within last 6 months' };
  }

  return { eligible: true };
};

module.exports = mongoose.model('User', userSchema);
