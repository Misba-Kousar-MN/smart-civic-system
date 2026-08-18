const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const profileController = require('../controllers/profileController');

router.get('/me', authenticate, profileController.getMyProfile);
router.patch('/me', authenticate, profileController.updateMyProfile);

module.exports = router;
