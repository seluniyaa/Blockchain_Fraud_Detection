import React from 'react';
import { ShieldCheck, AlertTriangle, ShieldAlert } from 'lucide-react';

export const RiskBadge = ({ score, status }) => {
  let badgeClass = 'badge-approved';
  let Icon = ShieldCheck;
  let label = 'LOW RISK';

  if (status === 'DETECTED') {
    badgeClass = 'badge-detected';
    Icon = ShieldAlert;
    label = 'COUNTER-DETECTED';
  } else if (score >= 70 || status === 'BLOCKED') {
    badgeClass = 'badge-blocked';
    Icon = ShieldAlert;
    label = 'CRITICAL FRAUD';
  } else if (score >= 30 || status === 'FLAGGED') {
    badgeClass = 'badge-flagged';
    Icon = AlertTriangle;
    label = 'SUSPICIOUS';
  }

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
      <span className={`badge ${badgeClass}`}>
        <Icon size={14} />
        {status || label} ({score}%)
      </span>
    </div>
  );
};
