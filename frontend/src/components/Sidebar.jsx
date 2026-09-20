import React from 'react';
import { Shield, ShoppingBag, FileText, Crosshair, Terminal, Activity, LayoutDashboard, Brain, ShieldAlert, Blocks, Lock, CheckCircle2, RotateCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Sidebar = () => {
  const { user, activeTab, setActiveTab, roleStep, setRoleStep, completedSteps } = useAuth();

  if (!user) return null;

  const customerWorkflow = [
    {
      step: 1,
      title: '1. Card Security',
      subtitle: 'Freeze & Security Policies',
      icon: Shield
    },
    {
      step: 2,
      title: '2. Payment Terminal',
      subtitle: 'Authorization Simulator',
      icon: ShoppingBag
    },
    {
      step: 3,
      title: '3. Statement & Disputes',
      subtitle: 'Audit Receipts & Report Fraud',
      icon: FileText
    }
  ];

  const attackerWorkflow = [
    {
      step: 1,
      title: '1. Target Reconnaissance',
      subtitle: 'Target Profiles & Vectors',
      icon: Crosshair
    },
    {
      step: 2,
      title: '2. Exploit Weaponization',
      subtitle: 'Payloads & Signatures',
      icon: Terminal
    },
    {
      step: 3,
      title: '3. Defense Telemetry',
      subtitle: 'Barrier Resistance Metrics',
      icon: Activity
    }
  ];

  const managerWorkflow = [
    {
      step: 1,
      title: '1. SOC Monitoring',
      subtitle: 'Live Telemetry & Threats',
      icon: LayoutDashboard
    },
    {
      step: 2,
      title: '2. Explainable AI (XAI)',
      subtitle: 'Decision Attribution',
      icon: Brain
    },
    {
      step: 3,
      title: '3. Risk Policy & Governance',
      subtitle: 'Posture & Access Control',
      icon: ShieldAlert
    },
    {
      step: 4,
      title: '4. Forensics & Recovery',
      subtitle: 'Disputes, Traceback & Refund',
      icon: RotateCcw
    }
  ];

  const getWorkflowForRole = () => {
    if (user.role === 'customer') return customerWorkflow;
    if (user.role === 'attacker') return attackerWorkflow;
    return managerWorkflow;
  };

  const workflow = getWorkflowForRole();

  const handleStepClick = (s) => {
    const defaultTab = user.role === 'customer' 
      ? 'customer_portal' 
      : user.role === 'attacker' 
      ? 'attacker_sandbox' 
      : 'manager_dashboard';
    setActiveTab(defaultTab);
    setRoleStep(s.step);
  };

  return (
    <aside style={{
      width: '260px',
      background: '#0e1424',
      borderRight: '1px solid rgba(255, 255, 255, 0.08)',
      padding: '20px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      {/* Role Navigation Header */}
      <div style={{ padding: '0 6px 6px' }}>
        <div style={{
          fontSize: '0.68rem',
          fontWeight: 700,
          color: user.role === 'customer' ? '#60a5fa' : user.role === 'attacker' ? '#f87171' : '#34d399',
          letterSpacing: '0.8px',
          textTransform: 'uppercase'
        }}>
          {user.role === 'customer' ? "Cardholder Banking Services" : user.role === 'attacker' ? "Red-Team Exploit Suite" : "Fraud Operations Center"}
        </div>
        <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
          {user.role === 'customer' ? "Personal Account Management" : user.role === 'attacker' ? "Adversary Testing Pipeline" : "SOC Incident Mitigation"}
        </div>
      </div>

      {/* Stepper Navigation */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {workflow.map((item) => {
          const Icon = item.icon;
          const isCurrent = (activeTab !== 'blockchain_explorer') && (roleStep === item.step);

          return (
            <div
              key={item.step}
              onClick={() => handleStepClick(item)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: '8px',
                background: isCurrent ? '#1e293b' : 'transparent',
                border: isCurrent ? '1px solid #334155' : '1px solid transparent',
                cursor: 'pointer',
                opacity: 1,
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  background: isCurrent
                    ? user.role === 'customer' ? '#2563eb' : user.role === 'attacker' ? '#dc2626' : '#059669'
                    : '#1e293b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isCurrent ? '#fff' : '#94a3b8'
                }}>
                  <Icon size={15} />
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: isCurrent ? 600 : 500, color: isCurrent ? '#f8fafc' : '#94a3b8' }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: isCurrent ? '#cbd5e1' : '#64748b' }}>
                    {item.subtitle}
                  </div>
                </div>
              </div>

              <div>
                {isCurrent && (
                  <span style={{
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '4px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: '#e2e8f0'
                  }}>
                    ACTIVE
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>


      {/* Consensus Verification Link - Only accessible to Manager SOC operations */}
      {user?.role === 'manager' && (
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '6px', paddingLeft: '4px' }}>
            SOC Governance
          </div>

          <button
            onClick={() => setActiveTab('blockchain_explorer')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '9px 12px',
              borderRadius: '6px',
              background: activeTab === 'blockchain_explorer' ? '#1e293b' : 'transparent',
              border: activeTab === 'blockchain_explorer' ? '1px solid #10b981' : '1px solid transparent',
              color: activeTab === 'blockchain_explorer' ? '#f8fafc' : '#94a3b8',
              cursor: 'pointer',
              fontSize: '0.8rem',
              textAlign: 'left'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Blocks size={15} color="#10b981" />
              <span>Ledger Explorer</span>
            </div>
            <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '4px', background: '#1e293b', color: '#94a3b8' }}>
              Audit
            </span>
          </button>
        </div>
      )}
    </aside>
  );
};
