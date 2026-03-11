const Notification = require('../models/Notification');

// @desc    Get user notifications
// @route   GET /api/notifications
exports.getNotifications = async (req, res, next) => {
  try {
    const { unread } = req.query;
    const filter = { userId: req.user._id };
    if (unread === 'true') filter.read = false;

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      userId: req.user._id,
      read: false,
    });

    res.json({ notifications, unreadCount });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark notifications as read
// @route   PUT /api/notifications/read
exports.markAsRead = async (req, res, next) => {
  try {
    const { notificationIds } = req.body;

    if (notificationIds && notificationIds.length > 0) {
      await Notification.updateMany(
        { _id: { $in: notificationIds }, userId: req.user._id },
        { read: true }
      );
    } else {
      // Mark all as read
      await Notification.updateMany({ userId: req.user._id, read: false }, { read: true });
    }

    res.json({ message: 'Notifications marked as read' });
  } catch (error) {
    next(error);
  }
};
