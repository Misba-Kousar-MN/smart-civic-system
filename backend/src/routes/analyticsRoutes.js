const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const analyticsController = require('../controllers/analyticsController');

// Municipal Analytics & Heatmap endpoints (Enforces server-side RBAC authorization)
router.get(
  '/overview',
  authenticate,
  authorize('admin', 'commissioner', 'aee', 'ward_officer'),
  analyticsController.getOverviewAnalytics
);

router.get(
  '/heatmap',
  authenticate,
  authorize('admin', 'commissioner', 'aee', 'ward_officer'),
  analyticsController.getHeatmapData
);

module.exports = router;
