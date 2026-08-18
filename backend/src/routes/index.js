const express = require('express');
const router = express.Router();

const profileRoutes = require('./profileRoutes');
const reportRoutes = require('./reportRoutes');
const incidentRoutes = require('./incidentRoutes');
const notificationRoutes = require('./notificationRoutes');
const masterDataRoutes = require('./masterDataRoutes');

router.use('/profile', profileRoutes);
router.use('/reports', reportRoutes);
router.use('/incidents', incidentRoutes);
router.use('/notifications', notificationRoutes);

// Master data endpoints (/zones, /departments, /sla-policies, /officers)
router.use('/', masterDataRoutes);

module.exports = router;
