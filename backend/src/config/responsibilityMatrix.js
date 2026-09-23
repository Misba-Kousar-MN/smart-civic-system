/**
 * Smart Civic System — Municipal Responsibility Matrix
 * Configurable mapping from civic service / department to municipal responsibility functionaries.
 * 
 * In real ULBs (Urban Local Bodies), grievances do not follow rigid universal government designations
 * (such as Ward Officer -> AEE -> Commissioner for every department).
 * Different departments have different operational resolvers, supervisory engineers/officers,
 * and executive authorities.
 */

const RESPONSIBILITY_MATRIX = {
  ROADS: {
    departmentCode: 'ROADS',
    departmentName: 'Roads & Public Works',
    operationalRole: 'Road Maintenance Engineer / Work Inspector',
    supervisoryRole: 'Supervisory Engineer (AEE / Sub-Division)',
    seniorAuthority: 'Executive Authority (Chief Engineer / Commissioner)',
    operationalDescription: 'Frontline road repair, pothole filling, and contractor dispatch.',
    supervisoryDescription: 'Technical oversight, resource coordination, and contractor SLA enforcement.',
    seniorDescription: 'Major infrastructure review, capital sanction, and multi-tier breach directives.'
  },
  SANITATION: {
    departmentCode: 'SANITATION',
    departmentName: 'Solid Waste & Sanitation',
    operationalRole: 'Health Inspector / Sanitary Supervisor',
    supervisoryRole: 'Senior Health Officer / Environmental Engineer',
    seniorAuthority: 'Executive Authority (Deputy Commissioner / Commissioner)',
    operationalDescription: 'Ground waste clearance, sanitary crew dispatch, and blackspot cleaning.',
    supervisoryDescription: 'Waste logistics oversight, ward sanitary inspection, and SLA breach interventions.',
    seniorDescription: 'City-wide cleanliness oversight, SWM contract accountability, and final directives.'
  },
  UGD: {
    departmentCode: 'UGD',
    departmentName: 'Underground Drainage & Water Supply',
    operationalRole: 'Drainage Inspector / Operations Crew',
    supervisoryRole: 'Assistant Executive Engineer (UGD / Water Supply)',
    seniorAuthority: 'Executive Authority (Chief Engineer / Commissioner)',
    operationalDescription: 'Sewer unblocking, manhole cover restoration, and pipeline emergency dispatch.',
    supervisoryDescription: 'Drainage network technical oversight, pump coordination, and SLA escalation handling.',
    seniorDescription: 'City drainage master-plan interventions and high-risk sewage breach directives.'
  },
  ELECTRICAL: {
    departmentCode: 'ELECTRICAL',
    departmentName: 'Street Lighting & Electrical',
    operationalRole: 'Electrical Inspector / Line Supervisor',
    supervisoryRole: 'Assistant Executive Engineer (Electrical)',
    seniorAuthority: 'Executive Authority (Chief Engineer / Commissioner)',
    operationalDescription: 'Luminaire replacement, cable fault repair, and junction box maintenance.',
    supervisoryDescription: 'Feeder line technical oversight, contractor inventory, and overdue repairs.',
    seniorDescription: 'City grid safety compliance and critical corridor blackout oversight.'
  },
  DEFAULT: {
    departmentCode: 'GENERAL',
    departmentName: 'Municipal Civic Administration',
    operationalRole: 'Designated Field Officer / Operational Resolver',
    supervisoryRole: 'Departmental Supervisory Officer',
    seniorAuthority: 'Senior Administrative Authority',
    operationalDescription: 'Operational handling and field resolution of reported civic grievances.',
    supervisoryDescription: 'Supervisory review, inter-agency coordination, and SLA interventions.',
    seniorDescription: 'Executive administrative oversight, final audit, and escalation directives.'
  }
};

/**
 * Resolve responsibility mapping for a given category and department code
 */
function getResponsibilityForIncident(category, departmentCode) {
  let code = (departmentCode || '').toUpperCase().trim();

  if (!code && category) {
    const cat = category.toLowerCase();
    if (cat.includes('garbage') || cat.includes('waste') || cat.includes('sanitation')) {
      code = 'SANITATION';
    } else if (cat.includes('pothole') || cat.includes('road') || cat.includes('footpath')) {
      code = 'ROADS';
    } else if (cat.includes('drain') || cat.includes('water') || cat.includes('sewage') || cat.includes('manhole')) {
      code = 'UGD';
    } else if (cat.includes('light') || cat.includes('street') || cat.includes('electric')) {
      code = 'ELECTRICAL';
    }
  }

  return RESPONSIBILITY_MATRIX[code] || RESPONSIBILITY_MATRIX.DEFAULT;
}

/**
 * Get role title for a specific level given category and department code
 */
function getRoleTitleForLevel(level, category, departmentCode) {
  const resp = getResponsibilityForIncident(category, departmentCode);
  switch (Number(level)) {
    case 1:
      return resp.operationalRole;
    case 2:
      return resp.supervisoryRole;
    case 3:
      return resp.seniorAuthority;
    default:
      return resp.operationalRole;
  }
}

module.exports = {
  RESPONSIBILITY_MATRIX,
  getResponsibilityForIncident,
  getRoleTitleForLevel
};
