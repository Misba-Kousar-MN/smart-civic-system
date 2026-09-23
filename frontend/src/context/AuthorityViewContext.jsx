import React, { createContext, useContext, useState } from 'react';

const AuthorityViewContext = createContext();

export const AUTHORITY_TIERS = {
  1: {
    level: 1,
    code: 'OPERATIONAL_RESOLUTION',
    shortCode: 'L1',
    title: 'Operational Resolution',
    authority: 'Departmental Field Team',
    badgeText: 'L1 • Operational Resolution',
    roleLabel: 'Operational Field Resolution',
    tagline: 'Frontline Field Handling & Resolution',
    focusTitle: 'OPERATIONAL RESOLUTION QUEUE',
    focusSubtitle: 'Active municipal workorders assigned to frontline departmental teams for site resolution.',
    themeAccent: '#2F8F68',
    themeBg: '#E6F3EB',
    borderAccent: '#CDE5D7',
    iconColor: '#174C3B'
  },
  2: {
    level: 2,
    code: 'SUPERVISORY_INTERVENTION',
    shortCode: 'L2',
    title: 'Supervisory Intervention',
    authority: 'Departmental Supervisory Authority',
    badgeText: 'L2 • Supervisory Intervention',
    roleLabel: 'Supervisory Technical Oversight',
    tagline: 'Supervisory Oversight & SLA Interventions',
    focusTitle: 'SUPERVISORY INTERVENTION QUEUE',
    focusSubtitle: 'Overdue workorders, blocked work, and QA failures requiring supervisory intervention.',
    themeAccent: '#734785',
    themeBg: '#EFE3F5',
    borderAccent: '#DCBFEC',
    iconColor: '#553363'
  },
  3: {
    level: 3,
    code: 'SENIOR_ADMINISTRATIVE_OVERSIGHT',
    shortCode: 'L3',
    title: 'Senior Administrative Oversight',
    authority: 'Senior Administrative Authority',
    badgeText: 'L3 • Senior Administrative Oversight',
    roleLabel: 'Senior Executive Directive',
    tagline: 'Senior Administrative Oversight & Final SLA Accountability',
    focusTitle: 'SENIOR ADMINISTRATIVE OVERSIGHT QUEUE',
    focusSubtitle: 'High-priority civic matters, terminal SLA breaches, and multi-tier escalated cases.',
    themeAccent: '#A6473D',
    themeBg: '#FAECEB',
    borderAccent: '#F3C5BF',
    iconColor: '#7A2A22'
  }
};

export const AuthorityViewProvider = ({ children }) => {
  const [selectedView, setSelectedView] = useState(() => {
    try {
      const saved = localStorage.getItem('officer_authority_view');
      const num = parseInt(saved, 10);
      return [1, 2, 3].includes(num) ? num : 1;
    } catch {
      return 1;
    }
  });

  const changeView = (lvl) => {
    const num = parseInt(lvl, 10);
    if ([1, 2, 3].includes(num)) {
      setSelectedView(num);
      try {
        localStorage.setItem('officer_authority_view', String(num));
      } catch (e) {
        console.warn('Failed to save officer_authority_view to localStorage:', e);
      }
    }
  };

  return (
    <AuthorityViewContext.Provider
      value={{
        selectedView,
        setSelectedView: changeView,
        currentTierInfo: AUTHORITY_TIERS[selectedView] || AUTHORITY_TIERS[1],
        tiers: AUTHORITY_TIERS
      }}
    >
      {children}
    </AuthorityViewContext.Provider>
  );
};

export const useAuthorityView = () => {
  const ctx = useContext(AuthorityViewContext);
  if (!ctx) {
    throw new Error('useAuthorityView must be used within an AuthorityViewProvider');
  }
  return ctx;
};
