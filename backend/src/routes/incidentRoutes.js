const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { resolutionUpload } = require('../middleware/uploadMiddleware');
const incidentController = require('../controllers/incidentController');

router.get('/', authenticate, incidentController.getIncidents);
router.get('/:incidentId', authenticate, incidentController.getIncidentById);

router.patch(
  '/:incidentId/status',
  authenticate,
  authorize('ward_officer', 'aee', 'commissioner', 'admin'),
  incidentController.updateIncidentStatus
);

router.post(
  '/:incidentId/escalate',
  authenticate,
  authorize('ward_officer', 'aee', 'admin'),
  incidentController.escalateIncident
);

router.get(
  '/:incidentId/escalations',
  authenticate,
  authorize('ward_officer', 'aee', 'commissioner', 'admin'),
  incidentController.getIncidentEscalations
);

router.post(
  '/:incidentId/resolution',
  authenticate,
  authorize('ward_officer', 'aee', 'commissioner', 'admin'),
  resolutionUpload,
  incidentController.submitResolutionEvidence
);

router.get(
  '/:incidentId/resolution',
  authenticate,
  incidentController.getResolutionEvidence
);

module.exports = router;
