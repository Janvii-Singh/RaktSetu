const axios = require('axios');
const User = require('../models/User');
const DonationHistory = require('../models/DonationHistory');
const env = require('../config/env');

// Blood group compatibility map (who can donate to whom)
const compatibilityMap = {
  'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
  'O+': ['O+', 'A+', 'B+', 'AB+'],
  'A-': ['A-', 'A+', 'AB-', 'AB+'],
  'A+': ['A+', 'AB+'],
  'B-': ['B-', 'B+', 'AB-', 'AB+'],
  'B+': ['B+', 'AB+'],
  'AB-': ['AB-', 'AB+'],
  'AB+': ['AB+'],
};

// Find compatible donor blood groups for a recipient
function getCompatibleDonorGroups(recipientBloodGroup) {
  const compatible = [];
  for (const [donorGroup, canDonateTo] of Object.entries(compatibilityMap)) {
    if (canDonateTo.includes(recipientBloodGroup)) {
      compatible.push(donorGroup);
    }
  }
  return compatible;
}

// Calculate distance between two coordinates in km
function calculateDistance(coord1, coord2) {
  const [lng1, lat1] = coord1;
  const [lng2, lat2] = coord2;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function findMatchingDonors(bloodRequest, options = {}) {
  const { radiusKm = 10, maxDonors = 20 } = options;
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const compatibleGroups = getCompatibleDonorGroups(bloodRequest.bloodGroup);

  // Find eligible donors within radius
  const donors = await User.find({
    role: 'donor',
    isAvailable: true,
    bloodGroup: { $in: compatibleGroups },
    $or: [
      { lastDonationDate: { $lt: ninetyDaysAgo } },
      { lastDonationDate: null },
    ],
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: bloodRequest.location.coordinates,
        },
        $maxDistance: radiusKm * 1000,
      },
    },
  }).limit(maxDonors * 2); // fetch extra to allow ML ranking

  if (donors.length === 0) return [];

  // Filter out donors with blocking health conditions
  const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
  const healthEligibleDonors = donors.filter((donor) => {
    const hs = donor.healthStatus;
    if (!hs) return true;
    if (hs.hasFever) return false;
    if (hs.isPregnant) return false;
    if (hs.onMedication) return false;
    if (hs.weight && hs.weight < 50) return false;
    if (hs.hadRecentSurgery && hs.surgeryDate && hs.surgeryDate > sixMonthsAgo) return false;
    if (hs.hadRecentTattooOrPiercing && hs.tattooOrPiercingDate && hs.tattooOrPiercingDate > sixMonthsAgo) return false;
    return true;
  });

  if (healthEligibleDonors.length === 0) return [];

  // Get donation history counts
  const donorIds = healthEligibleDonors.map((d) => d._id);
  const historyCounts = await DonationHistory.aggregate([
    { $match: { donorId: { $in: donorIds }, accepted: true } },
    { $group: { _id: '$donorId', count: { $sum: 1 } } },
  ]);
  const historyMap = {};
  historyCounts.forEach((h) => {
    historyMap[h._id.toString()] = h.count;
  });

  // Prepare features for ML service
  const now = new Date();
  const features = healthEligibleDonors.map((donor) => {
    const distance = calculateDistance(
      bloodRequest.location.coordinates,
      donor.location.coordinates
    );
    const daysSinceLastDonation = donor.lastDonationDate
      ? Math.floor((now - donor.lastDonationDate) / (1000 * 60 * 60 * 24))
      : 365;

    return {
      donorId: donor._id.toString(),
      distance_km: parseFloat(distance.toFixed(2)),
      time_of_day: now.getHours(),
      day_of_week: now.getDay(),
      past_donations_count: historyMap[donor._id.toString()] || 0,
      days_since_last_donation: daysSinceLastDonation,
      blood_group_match: donor.bloodGroup === bloodRequest.bloodGroup ? 1 : 0,
      request_urgency: bloodRequest.urgency === 'critical' ? 2 : bloodRequest.urgency === 'urgent' ? 1 : 0,
    };
  });

  // Try ML prediction
  let mlScores = null;
  try {
    const response = await axios.post(`${env.ML_SERVICE_URL}/predict`, { features }, { timeout: 5000 });
    mlScores = response.data.predictions;
  } catch {
    // ML service unavailable — use distance-based fallback
  }

  // Rank donors
  const rankedDonors = healthEligibleDonors.map((donor, i) => {
    const feature = features[i];
    const mlScore = mlScores ? mlScores[i] : 0.5;
    const proximityScore = 1 - feature.distance_km / radiusKm;
    const urgencyBoost = feature.request_urgency * 0.1;
    const exactMatchBoost = feature.blood_group_match * 0.15;

    const totalScore = mlScore * 0.4 + proximityScore * 0.35 + urgencyBoost + exactMatchBoost;

    return {
      donorId: donor._id,
      score: parseFloat(totalScore.toFixed(3)),
      distance: feature.distance_km,
      status: 'pending',
    };
  });

  rankedDonors.sort((a, b) => b.score - a.score);
  return rankedDonors.slice(0, maxDonors);
}

module.exports = { findMatchingDonors, getCompatibleDonorGroups, calculateDistance };
