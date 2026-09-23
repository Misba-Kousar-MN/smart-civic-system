const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const profileController = require('../controllers/profileController');

router.get('/me', authenticate, profileController.getMyProfile);
router.patch('/me', authenticate, profileController.updateMyProfile);
// Only admins may provision officer accounts — prevents citizen self-escalation
router.post('/provision-officer', authenticate, authorize('admin'), profileController.provisionOfficer);


module.exports = router;
