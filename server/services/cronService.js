const cron = require('node-cron');
const User = require('../models/User');
const Notification = require('../models/Notification');

// ─── Feature 1: Auto-reset availability after 90 days post-donation ──────────
// Runs every day at 6:00 AM
// Finds donors who are unavailable due to donation (lastDonationDate > 90 days ago)
// and have no blocking health conditions → marks them available again
async function resetAvailabilityAfterCooldown() {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);

  const donors = await User.find({
    role: 'donor',
    isAvailable: false,
    lastDonationDate: { $lt: ninetyDaysAgo, $ne: null },
  });

  let resetCount = 0;
  for (const donor of donors) {
    const hs = donor.healthStatus || {};

    // Do not auto-reset if a health condition is still blocking
    const healthBlocking =
      hs.hasFever ||
      hs.isPregnant ||
      hs.onMedication ||
      (hs.weight && hs.weight < 50) ||
      (hs.hadRecentSurgery && hs.surgeryDate && hs.surgeryDate > sixMonthsAgo) ||
      (hs.hadRecentTattooOrPiercing && hs.tattooOrPiercingDate && hs.tattooOrPiercingDate > sixMonthsAgo);

    if (!healthBlocking) {
      await User.findByIdAndUpdate(donor._id, { isAvailable: true });

      // Notify donor they are eligible again
      await Notification.create({
        userId: donor._id,
        type: 'general',
        message: 'You are now eligible to donate blood again! Your 90-day cooldown has ended.',
      });

      resetCount++;
    }
  }

  if (resetCount > 0) {
    console.log(`[Cron] Auto-reset availability for ${resetCount} donor(s)`);
  }
}

// ─── Feature 3: Inactivity detection ─────────────────────────────────────────
// Runs every day at 7:00 AM
// Finds donors who haven't logged in for 30+ days and are still marked available
// → marks them unavailable and sends a reminder notification
async function detectInactiveDonors() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const inactiveDonors = await User.find({
    role: 'donor',
    isAvailable: true,
    $or: [
      { lastLoginDate: { $lt: thirtyDaysAgo } },
      { lastLoginDate: null }, // never logged in after seeding
    ],
  });

  let count = 0;
  for (const donor of inactiveDonors) {
    await User.findByIdAndUpdate(donor._id, { isAvailable: false });

    await Notification.create({
      userId: donor._id,
      type: 'general',
      message:
        'You have been marked unavailable due to inactivity (30+ days since last login). ' +
        'Please log in and update your availability status.',
    });

    count++;
  }

  if (count > 0) {
    console.log(`[Cron] Marked ${count} inactive donor(s) as unavailable`);
  }
}

function initCronJobs() {
  // Auto-reset availability at 6:00 AM daily
  cron.schedule('0 6 * * *', () => {
    console.log('[Cron] Running: auto-reset donor availability after 90-day cooldown');
    resetAvailabilityAfterCooldown().catch((err) =>
      console.error('[Cron] Error in resetAvailabilityAfterCooldown:', err)
    );
  });

  // Inactivity detection at 7:00 AM daily
  cron.schedule('0 7 * * *', () => {
    console.log('[Cron] Running: inactivity detection');
    detectInactiveDonors().catch((err) =>
      console.error('[Cron] Error in detectInactiveDonors:', err)
    );
  });

  console.log('[Cron] Jobs scheduled: availability reset (6AM), inactivity check (7AM)');
}

module.exports = { initCronJobs, resetAvailabilityAfterCooldown, detectInactiveDonors };
