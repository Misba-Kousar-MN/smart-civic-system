const analyticsService = require('../services/analyticsService');
const ApiError = require('../errors/apiError');

/**
 * Controller to fetch municipal governance overview analytics
 */
async function getOverviewAnalytics(req, res, next) {
  try {
    const { dateFrom, dateTo, category, departmentId, zoneId, priority, severity, status } = req.query;

    const data = await analyticsService.getOverviewAnalytics({
      dateFrom,
      dateTo,
      category,
      departmentId,
      zoneId,
      priority,
      severity,
      status
    });

    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller to fetch geographic heatmap dataset
 */
async function getHeatmapData(req, res, next) {
  try {
    const { dateFrom, dateTo, category, departmentId, zoneId, priority, severity, status } = req.query;

    const data = await analyticsService.getHeatmapData({
      dateFrom,
      dateTo,
      category,
      departmentId,
      zoneId,
      priority,
      severity,
      status
    });

    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getOverviewAnalytics,
  getHeatmapData
};
