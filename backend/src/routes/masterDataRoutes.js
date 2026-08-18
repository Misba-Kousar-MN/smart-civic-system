const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const masterDataController = require('../controllers/masterDataController');

router.get('/zones', authenticate, masterDataController.getZones);
router.get('/departments', authenticate, masterDataController.getDepartments);
router.get('/sla-policies', authenticate, masterDataController.getSlaPolicies);
router.get('/officers', authenticate, masterDataController.getOfficers);
router.get('/officers/:officerId', authenticate, masterDataController.getOfficerById);

module.exports = router;
