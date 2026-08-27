const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { reportUpload } = require('../middleware/uploadMiddleware');
const reportController = require('../controllers/reportController');

router.post('/', authenticate, authorize('citizen'), reportUpload, reportController.submitReport);
router.post('/transcribe', authenticate, authorize('citizen'), reportUpload, reportController.transcribeAudio);
router.get('/', authenticate, reportController.getReports);
router.get('/:reportId', authenticate, reportController.getReportById);

module.exports = router;
