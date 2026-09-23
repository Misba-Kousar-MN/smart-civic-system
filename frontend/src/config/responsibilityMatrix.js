/**
 * Smart Civic System — Municipal Responsibility Matrix
 * Maps service categories and municipal departments to configurable responsibility roles:
 * - Level 1: Operational Resolution
 * - Level 2: Supervisory Intervention
 * - Level 3: Senior Administrative Oversight
 */

export const RESPONSIBILITY_MATRIX = {
  ROADS: {
    departmentCode: 'ROADS',
    departmentName: 'Roads & Public Works',
    operationalRole: 'Road Maintenance Engineer / Work Inspector',
    supervisoryRole: 'Supervisory Engineer (AEE / Sub-Division)',
    seniorAuthority: 'Executive Authority (Chief Engineer / Commissioner)',
    operationalShort: 'Road Engineer',
    supervisoryShort: 'Supervisory Engineer',
    seniorShort: 'Executive Authority',
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
    operationalShort: 'Health Inspector',
    supervisoryShort: 'Senior Health Officer',
    seniorShort: 'Executive Authority',
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
    operationalShort: 'Drainage Inspector',
    supervisoryShort: 'AEE (UGD)',
    seniorShort: 'Executive Authority',
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
    operationalShort: 'Electrical Inspector',
    supervisoryShort: 'AEE (Electrical)',
    seniorShort: 'Executive Authority',
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
    operationalShort: 'Field Resolver',
    supervisoryShort: 'Supervisory Officer',
    seniorShort: 'Senior Authority',
    operationalDescription: 'Operational handling and field resolution of reported civic grievances.',
    supervisoryDescription: 'Supervisory review, inter-agency coordination, and SLA interventions.',
    seniorDescription: 'Executive administrative oversight, final audit, and escalation directives.'
  }
};

/**
 * Resolve responsibility mapping for a given category and department code
 */
export function getResponsibilityForIncident(category, departmentCode) {
  let code = (departmentCode || '').toUpperCase().trim();

  if (!code && category) {
    const cat = category.toLowerCase();
    if (cat.includes('garbage') || cat.includes('waste') || cat.includes('sanitation') || cat.includes('dump')) {
      code = 'SANITATION';
    } else if (cat.includes('pothole') || cat.includes('road') || cat.includes('footpath') || cat.includes('street damage')) {
      code = 'ROADS';
    } else if (cat.includes('drain') || cat.includes('water') || cat.includes('sewage') || cat.includes('manhole') || cat.includes('leakage')) {
      code = 'UGD';
    } else if (cat.includes('light') || cat.includes('street light') || cat.includes('electric') || cat.includes('power')) {
      code = 'ELECTRICAL';
    }
  }

  return RESPONSIBILITY_MATRIX[code] || RESPONSIBILITY_MATRIX.DEFAULT;
}
