const { supabaseService, createUserClient } = require('../config/supabase');
const incidentService = require('../services/incidentService');
const ApiError = require('../errors/apiError');

/**
 * GET /incidents
 * List incidents visible to the authenticated user
 */
async function getIncidents(req, res, next) {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = Math.min(100, parseInt(req.query.limit || '20', 10));
    const offset = (page - 1) * limit;

    const { status, priority_level, department_id, zone_id } = req.query;

    const userClient = createUserClient(req.token);
    let query = userClient
      .from('incidents')
      .select('id, category, severity, priority_score, priority_level, status, current_level, location, address, zone_id, department_id, sla_deadline, assigned_officer_id, created_at, updated_at', { count: 'exact' });

    // Officer scope filtering based on AUTH_CONTRACT
    if (req.user.role === 'ward_officer' && req.user.officer) {
      if (req.user.officer.department_id) {
        query = query.eq('department_id', req.user.officer.department_id);
      }
      if (req.user.officer.zone_id) {
        query = query.eq('zone_id', req.user.officer.zone_id);
      }
    } else if (req.user.role === 'aee' && req.user.officer) {
      if (req.user.officer.department_id) {
        query = query.eq('department_id', req.user.officer.department_id);
      }
    } else if (req.user.role === 'citizen') {
      // Citizen only sees incidents linked to their submitted reports
      const { data: userReports } = await userClient
        .from('reports')
        .select('id')
        .eq('user_id', req.user.id);

      const reportIds = (userReports || []).map((r) => r.id);
      if (reportIds.length === 0) {
        return res.status(200).json({
          success: true,
          data: { incidents: [], pagination: { page, limit, total: 0, total_pages: 0 } }
        });
      }

      const { data: incReports } = await userClient
        .from('incident_reports')
        .select('incident_id')
        .in('report_id', reportIds);

      const incidentIds = (incReports || []).map((ir) => ir.incident_id);
      if (incidentIds.length === 0) {
        return res.status(200).json({
          success: true,
          data: { incidents: [], pagination: { page, limit, total: 0, total_pages: 0 } }
        });
      }

      query = query.in('id', incidentIds);
    }

    // Query parameters filtering
    if (status) query = query.eq('status', status);
    if (priority_level) query = query.eq('priority_level', priority_level);
    if (department_id) query = query.eq('department_id', department_id);
    if (zone_id) query = query.eq('zone_id', zone_id);

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data: incidents, count, error } = await query;

    if (error) {
      throw ApiError.internal('DB_UNEXPECTED', error.message);
    }

    return res.status(200).json({
      success: true,
      data: {
        incidents: incidents || [],
        pagination: {
          page: page,
          limit: limit,
          total: count || 0,
          total_pages: Math.ceil((count || 0) / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /incidents/:incidentId
 * Get full details of a single incident including reports, escalations, status history, and evidence
 */
async function getIncidentById(req, res, next) {
  try {
    const { incidentId } = req.params;
    const userClient = createUserClient(req.token);

    // Fetch core incident
    const { data: incident, error: incErr } = await userClient
      .from('incidents')
      .select('*')
      .eq('id', incidentId)
      .single();

    if (incErr || !incident) {
      throw ApiError.notFound('INCIDENT_NOT_FOUND', `Incident with ID '${incidentId}' not found.`);
    }

    // Fetch related reports
    const { data: incReports } = await userClient
      .from('incident_reports')
      .select('is_primary, reports(*)')
      .eq('incident_id', incidentId);

    const reports = (incReports || []).map((ir) => ({
      ...ir.reports,
      is_primary: ir.is_primary
    }));

    // Fetch escalations
    const { data: escalations } = await userClient
      .from('escalations')
      .select('*')
      .eq('incident_id', incidentId)
      .order('triggered_at', { ascending: false });

    // Fetch status history
    const { data: statusHistory } = await userClient
      .from('status_history')
      .select('*')
      .eq('incident_id', incidentId)
      .order('created_at', { ascending: false });

    // Fetch resolution evidence
    const { data: resolutionEvidence } = await userClient
      .from('resolution_evidence')
      .select('*')
      .eq('incident_id', incidentId)
      .order('created_at', { ascending: false });

    return res.status(200).json({
      success: true,
      data: {
        incident: incident,
        reports: reports,
        escalations: escalations || [],
        status_history: statusHistory || [],
        resolution_evidence: resolutionEvidence || []
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /incidents/:incidentId/status
 * Officer updates operational status of an incident
 */
async function updateIncidentStatus(req, res, next) {
  try {
    const { incidentId } = req.params;
    const { status, resolved_at } = req.body;

    if (!status) {
      throw ApiError.badRequest('VALIDATION_REQUIRED_FIELD', 'Status field is required.');
    }

    const userClient = createUserClient(req.token);

    // Fetch existing incident
    const { data: existingInc, error: fetchErr } = await userClient
      .from('incidents')
      .select('id, status')
      .eq('id', incidentId)
      .single();

    if (fetchErr || !existingInc) {
      throw ApiError.notFound('INCIDENT_NOT_FOUND', `Incident with ID '${incidentId}' not found.`);
    }

    // Validate permitted status transition
    const allowedNext = incidentService.VALID_TRANSITIONS[existingInc.status] || [];
    if (existingInc.status !== status && !allowedNext.includes(status)) {
      throw ApiError.unprocessable(
        'INCIDENT_INVALID_STATUS_TRANSITION',
        `Cannot transition incident status from '${existingInc.status}' to '${status}'.`
      );
    }

    const updateData = {
      status: status,
      updated_at: new Date().toISOString()
    };

    if (resolved_at !== undefined) {
      updateData.resolved_at = resolved_at;
    } else if (status === 'RESOLVED') {
      updateData.resolved_at = new Date().toISOString();
    }

    // Perform update
    const { data: updatedInc, error: updateErr } = await userClient
      .from('incidents')
      .update(updateData)
      .eq('id', incidentId)
      .select('id, status, resolved_at, updated_at')
      .single();

    if (updateErr) {
      if (updateErr.message && updateErr.message.includes('column protection')) {
        throw ApiError.forbidden(
          'INCIDENT_UPDATE_FORBIDDEN',
          'Officer attempted to modify a protected incident field.'
        );
      }
      throw ApiError.internal('DB_UNEXPECTED', updateErr.message);
    }

    // Record status audit history
    await supabaseService.from('status_history').insert({
      incident_id: incidentId,
      old_status: existingInc.status,
      new_status: status,
      changed_by: req.user.id,
      remarks: `Status changed from ${existingInc.status} to ${status}`
    });

    return res.status(200).json({
      success: true,
      data: updatedInc
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /incidents/:incidentId/escalate
 * Trigger atomic escalation to next level via public.trigger_incident_escalation() RPC
 */
async function escalateIncident(req, res, next) {
  try {
    const { incidentId } = req.params;
    const { reason } = req.body;

    const result = await incidentService.escalateIncident({
      user: req.user,
      incidentId: incidentId,
      reason: reason
    });

    return res.status(201).json({
      success: true,
      data: result,
      message: `Incident escalated to Level ${result.incident.current_level}.`
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /incidents/:incidentId/escalations
 * List escalation records for an incident
 */
async function getIncidentEscalations(req, res, next) {
  try {
    const { incidentId } = req.params;
    const userClient = createUserClient(req.token);

    const { data: escalations, error } = await userClient
      .from('escalations')
      .select('id, incident_id, from_level, to_level, reason, triggered_at, status')
      .eq('incident_id', incidentId)
      .order('triggered_at', { ascending: false });

    if (error) {
      throw ApiError.internal('DB_UNEXPECTED', error.message);
    }

    return res.status(200).json({
      success: true,
      data: {
        escalations: escalations || []
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /incidents/:incidentId/resolution
 * Officer submits before/after resolution evidence for AI verification
 */
async function submitResolutionEvidence(req, res, next) {
  try {
    const { incidentId } = req.params;

    const result = await incidentService.submitResolutionEvidence({
      user: req.user,
      incidentId: incidentId,
      files: req.files
    });

    return res.status(201).json({
      success: true,
      data: {
        resolution_evidence: result.resolution_evidence
      },
      message: 'Resolution evidence submitted. AI verification passed.'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /incidents/:incidentId/resolution
 * Get resolution evidence records for an incident
 */
async function getResolutionEvidence(req, res, next) {
  try {
    const { incidentId } = req.params;
    const userClient = createUserClient(req.token);

    const { data: evidence, error } = await userClient
      .from('resolution_evidence')
      .select('id, incident_id, before_image_url, after_image_url, ai_verification_passed, ai_confidence, submitted_by, created_at')
      .eq('incident_id', incidentId)
      .order('created_at', { ascending: false });

    if (error) {
      throw ApiError.internal('DB_UNEXPECTED', error.message);
    }

    return res.status(200).json({
      success: true,
      data: {
        resolution_evidence: evidence || []
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getIncidents,
  getIncidentById,
  updateIncidentStatus,
  escalateIncident,
  getIncidentEscalations,
  submitResolutionEvidence,
  getResolutionEvidence
};
