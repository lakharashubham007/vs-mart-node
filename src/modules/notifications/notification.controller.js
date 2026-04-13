const Notification = require('./notification.model');

/**
 * GET /notifications
 * Admins get targetRole:'admin' notifications.
 * Mobile users get their own userId + targetRole:'user' notifications.
 */
exports.getNotifications = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const userType = req.userType; // established in auth middleware

        let query;
        if (userType === 'staff') {
            // Admin/Staff sees all admin-targeted notifications
            query = { targetRole: 'admin' };
        } else if (userType === 'delivery') {
            // Delivery Boy sees only their own assignments
            query = { userId: userId, targetRole: 'delivery_boy' };
        } else {
            // Mobile user/Customer sees only their own user notifications
            query = { userId: userId, targetRole: 'user' };
        }

        // Handle date filter
        if (req.query.filter === 'today') {
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            query.createdAt = { $gte: startOfDay };
        } else {
            // Default: last 7 days
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            sevenDaysAgo.setHours(0, 0, 0, 0);
            query.createdAt = { $gte: sevenDaysAgo };
        }

        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .limit(200);

        // Unread count scoped correctly per role
        let unreadQuery;
        if (userType === 'staff') unreadQuery = { targetRole: 'admin', isRead: false };
        else if (userType === 'delivery') unreadQuery = { userId: userId, targetRole: 'delivery_boy', isRead: false };
        else unreadQuery = { userId: userId, targetRole: 'user', isRead: false };

        const unreadCount = await Notification.countDocuments(unreadQuery);

        res.json({
            success: true,
            data: notifications,
            unreadCount
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * PATCH /notifications/:id/read
 */
exports.markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findByIdAndUpdate(
            req.params.id,
            { isRead: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        res.json({ success: true, data: notification });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * PATCH /notifications/read-all
 */
exports.markAllAsRead = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const userType = req.userType;

        let filter;
        if (userType === 'staff') {
            filter = { targetRole: 'admin', isRead: false };
        } else if (userType === 'delivery') {
            filter = { userId: userId, targetRole: 'delivery_boy', isRead: false };
        } else {
            filter = { userId: userId, targetRole: 'user', isRead: false };
        }

        await Notification.updateMany(filter, { isRead: true });

        res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
