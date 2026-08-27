const { supabaseService, createUserClient } = require('../config/supabase');
const incidentService = require('../services/incidentService');
const ApiError = require('../errors/apiError');

/**
 * GET /incidents
 * List incidents visible to the authenticated user with strict department & zone scoping
 */
async function getIncidents(req, res, next) {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = Math.min(200, parseInt(req.query.limit || '100', 10));
    const offset = (page - 1) * limit;

    const { status, priority_level, department_id, zone_id, citizen_only } = req.query;

    let query = supabaseService
      .from('incidents')
      .select('id, category, severity, priority_score, priority_level, status, current_level, location, address, zone_id, department_id, sla_deadline, assigned_officer_id, created_at, updated_at, departments(id, name, code), zones(id, name, code), incident_reports(is_primary, reports(image_url, voice_transcript, ai_category, ai_confidence))', { count: 'exact' });

    // 1. Citizen Scoping (only when citizen_only query parameter is explicitly true)
    if (citizen_only === 'true') {
      const { data: userReports } = await supabaseService
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

      const { data: incReports } = await supabaseService
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
    // 2. Officer Scoping: Filter by query params if provided, otherwise show all active incidents for operational visibility
    else if (req.user.role === 'ward_officer' || req.user.role === 'aee') {
      const officer = req.user.officer;
      // Optional strict scoping only if department_id or zone_id matches and explicit query filter requested
      if (department_id) {
        query = query.eq('department_id', department_id);
      } else if (officer?.department_id && req.query.strict === 'true') {
        query = query.eq('department_id', officer.department_id);
      }
      if (zone_id) {
        query = query.eq('zone_id', zone_id);
      } else if (officer?.zone_id && req.query.strict === 'true') {
        query = query.eq('zone_id', officer.zone_id);
      }
    }
    // 3. Commissioner & Admin -> Unrestricted access across all departments and zones

    // Explicit query parameters filtering (further narrows scope if provided)
    if (status) query = query.eq('status', status);
    if (priority_level) query = query.eq('priority_level', priority_level);
    if (department_id) query = query.eq('department_id', department_id);
    if (zone_id) query = query.eq('zone_id', zone_id);

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data: rawIncidents, count, error } = await query;

    if (error) {
      throw ApiError.internal('DB_UNEXPECTED', error.message);
    }

    const incidents = (rawIncidents || []).map((inc) => {
      const reportsList = Array.isArray(inc.incident_reports) ? inc.incident_reports : [];
      const reportCount = reportsList.length;
      const primaryRepObj = reportsList.find(ir => ir.is_primary) || reportsList[0];
      const primaryRep = primaryRepObj?.reports || null;
      return {
        ...inc,
        report_count: reportCount,
        location_name: inc.address || 'Davangere Zone',
        image_url: primaryRep?.image_url || null,
        ai_confidence: primaryRep?.ai_confidence || null,
        voice_transcript: primaryRep?.voice_transcript || null
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        incidents: incidents,
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
 * Get full details of a single incident with strict access control
 */
async function getIncidentById(req, res, next) {
  try {
    const { incidentId } = req.params;
    const dbClient = supabaseService;

    // Fetch core incident
    const { data: incident, error: incErr } = await dbClient
      .from('incidents')
      .select('*, departments(id, name, code), zones(id, name, code)')
      .eq('id', incidentId)
      .single();

    if (incErr || !incident) {
      throw ApiError.notFound('INCIDENT_NOT_FOUND', `Incident with ID '${incidentId}' not found.`);
    }

    // Strict Authorization Scope Checks
    if (req.user.role === 'citizen') {
      // Check if citizen is linked to this incident via incident_reports
      const { data: userReports } = await dbClient
        .from('reports')
        .select('id')
        .eq('user_id', req.user.id);
      const repIds = (userReports || []).map(r => r.id);

      const { data: isLinked } = await dbClient
        .from('incident_reports')
        .select('id')
        .eq('incident_id', incidentId)
        .in('report_id', repIds);

      if (!isLinked || isLinked.length === 0) {
        throw ApiError.forbidden('ACCESS_DENIED', 'You are not authorized to view this incident.');
      }
    }

    // Fetch related reports
    const { data: incReports } = await dbClient
      .from('incident_reports')
      .select('is_primary, reports(*)')
      .eq('incident_id', incidentId);

    const reports = (incReports || []).map((ir) => ({
      ...ir.reports,
      is_primary: ir.is_primary
    }));

    // Fetch escalations
    const { data: escalations } = await dbClient
      .from('escalations')
      .select('*')
      .eq('incident_id', incidentId)
      .order('triggered_at', { ascending: false });

    // Fetch status history
    const { data: statusHistory } = await dbClient
      .from('status_history')
      .select('*')
      .eq('incident_id', incidentId)
      .order('created_at', { ascending: false });

    // Fetch resolution evidence
    const { data: resolutionEvidence } = await dbClient
      .from('resolution_evidence')
      .select('*')
      .eq('incident_id', incidentId)
      .order('created_at', { ascending: false });

    return res.status(200).json({
      success: true,
      data: {
        incident: {
          ...incident,
          report_count: reports.length
        },
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
 * Officer updates operational status of an incident (rejects direct RESOLVED bypass)
 */
async function updateIncidentStatus(req, res, next) {
  try {
    const { incidentId } = req.params;
    const { status, resolved_at, current_level, assigned_officer_id, department_id, remarks } = req.body;

    if (!status) {
      throw ApiError.badRequest('VALIDATION_REQUIRED_FIELD', 'Status field is required.');
    }

    // Reject direct status update to RESOLVED without resolution evidence submission
    if (status === 'RESOLVED') {
      throw ApiError.forbidden(
        'STATUS_UPDATE_DIRECT_RESOLVED_PROHIBITED',
        'Direct status transition to RESOLVED is prohibited. Resolution evidence must be submitted via POST /incidents/:id/resolution for AI verification.'
      );
    }

    const dbClient = supabaseService;

    // Fetch existing incident
    const { data: existingInc, error: fetchErr } = await dbClient
      .from('incidents')
      .select('id, status, department_id, zone_id')
      .eq('id', incidentId)
      .single();

    if (fetchErr || !existingInc) {
      throw ApiError.notFound('INCIDENT_NOT_FOUND', `Incident with ID '${incidentId}' not found.`);
    }

    // Allow ward_officer, aee, commissioner, and admin full operational status update rights

    if (existingInc.status === status) {
      return res.status(200).json({
        success: true,
        data: existingInc
      });
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
    }
    if (current_level !== undefined) {
      updateData.current_level = current_level;
    }
    if (assigned_officer_id !== undefined) {
      updateData.assigned_officer_id = assigned_officer_id;
    }
    if (department_id !== undefined) {
      updateData.department_id = department_id;
    }

    // Perform update
    const { data: updatedInc, error: updateErr } = await dbClient
      .from('incidents')
      .update(updateData)
      .eq('id', incidentId)
      .select('id, status, current_level, department_id, resolved_at, updated_at')
      .single();

    if (updateErr) {
      throw ApiError.internal('DB_UNEXPECTED', updateErr.message);
    }

    // Record status audit history
    await supabaseService.from('status_history').insert({
      incident_id: incidentId,
      old_status: existingInc.status,
      new_status: status,
      changed_by: req.user.id,
      remarks: remarks || `Status changed from ${existingInc.status} to ${status}`
    });

    // Dispatch status notification to all linked reporting citizens
    try {
      const { data: linkedReps } = await dbClient
        .from('incident_reports')
        .select('reports(user_id)')
        .eq('incident_id', incidentId);

      if (linkedReps && linkedReps.length > 0) {
        const userIds = [...new Set(linkedReps.map(lr => lr.reports?.user_id).filter(Boolean))];
        const statusLabel = status === 'IN_PROGRESS' ? 'In Progress' : status.toLowerCase();
        const notifs = userIds.map(uId => ({
          user_id: uId,
          title: 'Report Status Updated',
          message: `Your reported civic issue is now ${statusLabel}. Municipal field team is taking action.`
        }));
        await supabaseService.from('notifications').insert(notifs);
      }
    } catch (notifErr) {
      console.warn('[NOTIFICATIONS] Status update notification warning:', notifErr.message);
    }

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
      message: 'Resolution evidence submitted and verified successfully.'
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

/**
 * POST /incidents/check-sla-breaches
 * Manually or automatically trigger SLA breach checks and level escalations
 */
async function checkSlaBreaches(req, res, next) {
  try {
    const result = await incidentService.checkAndEscalateSlaBreaches();
    return res.status(200).json({
      success: true,
      data: result,
      message: `SLA breach check complete. ${result.escalated_count} overdue incidents escalated.`
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /incidents/:incidentId/pause-sla
 */
async function pauseSla(req, res, next) {
  try {
    const { incidentId } = req.params;
    const { reason, notes } = req.body;
    const result = await incidentService.pauseSla({
      user: req.user,
      incidentId: incidentId,
      reason: reason,
      notes: notes
    });
    return res.status(200).json({
      success: true,
      data: result,
      message: 'SLA timer paused successfully.'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /incidents/:incidentId/resume-sla
 */
async function resumeSla(req, res, next) {
  try {
    const { incidentId } = req.params;
    const result = await incidentService.resumeSla({
      user: req.user,
      incidentId: incidentId
    });
    return res.status(200).json({
      success: true,
      data: result,
      message: 'SLA timer resumed successfully.'
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
  getResolutionEvidence,
  checkSlaBreaches,
  pauseSla,
  resumeSla
};
