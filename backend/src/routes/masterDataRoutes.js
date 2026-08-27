const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const masterDataController = require('../controllers/masterDataController');

router.get('/zones', authenticate, masterDataController.getZones);
router.get('/departments', authenticate, masterDataController.getDepartments);
router.get('/sla-policies', authenticate, masterDataController.getSlaPolicies);

// STRICTLY RESTRICTED TO ADMIN & COMMISSIONER ROLES
router.get('/officers', authenticate, authorize('admin', 'commissioner'), masterDataController.getOfficers);
router.get('/officers/:officerId', authenticate, authorize('admin', 'commissioner'), masterDataController.getOfficerById);
router.get('/admin-metrics', authenticate, authorize('admin', 'commissioner'), masterDataController.getAdminMetrics);

module.exports = router;
