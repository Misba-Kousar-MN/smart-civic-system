const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const notificationController = require('../controllers/notificationController');

router.get('/', authenticate, notificationController.getNotifications);
router.patch('/read-all', authenticate, notificationController.markAllNotificationsAsRead);
router.patch('/:notificationId/read', authenticate, notificationController.markNotificationAsRead);

module.exports = router;
