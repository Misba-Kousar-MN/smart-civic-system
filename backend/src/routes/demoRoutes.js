const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const demoController = require('../controllers/demoController');

// All demo clock endpoints require authenticated officer/admin — citizens cannot manipulate simulation time
router.get('/clock', authenticate, authorize('ward_officer', 'aee', 'commissioner', 'admin'), demoController.getClockStatus);
router.post('/clock/toggle', authenticate, authorize('ward_officer', 'aee', 'commissioner', 'admin'), demoController.toggleClock);
router.post('/clock/advance', authenticate, authorize('ward_officer', 'aee', 'commissioner', 'admin'), demoController.advanceClock);
router.post('/clock/reset', authenticate, authorize('ward_officer', 'aee', 'commissioner', 'admin'), demoController.resetClock);

module.exports = router;
