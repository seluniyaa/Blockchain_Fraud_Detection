import React from 'react';
import { X, Brain, AlertCircle, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { RiskBadge } from './RiskBadge';

export const XAIModal = ({ transaction, onClose }) => {
  if (!transaction) return null;

  const insights = transaction.xai_reason || [];
  const riskScore = transaction.risk_score || 0;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '650px',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '28px',
        position: 'relative'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            color: '#9ca3af',
            padding: '8px',
            borderRadius: '50%',
            cursor: 'pointer'
          }}
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: '#1e293b',
            border: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#818cf8'
          }}>
            <Brain size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#fff' }}>
              Explainable AI (XAI) Risk Inspection
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
              Feature attribution & machine learning decision breakdown
            </p>
          </div>
        </div>

        {/* Summary Card */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '12px'
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Merchant / Amount</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginTop: '2px' }}>
              {transaction.merchant} (${transaction.amount?.toFixed(2)})
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Risk Assessment</div>
            <div style={{ marginTop: '4px' }}>
              <RiskBadge score={riskScore} status={transaction.status} />
            </div>
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Transaction Hash</div>
            <div className="font-mono" style={{ fontSize: '0.75rem', color: '#818cf8', wordBreak: 'break-all', marginTop: '2px' }}>
              {transaction.tx_hash}
            </div>
          </div>
        </div>

        {/* XAI Factor Breakdown */}
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f3f4f6', marginBottom: '14px' }}>
          Key Risk Drivers & Attribution Weights:
        </h3>

        {insights && insights.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {insights.map((item, idx) => (
              <div
                key={idx}
                style={{
                  padding: '14px',
                  borderRadius: '10px',
                  background: item.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.1)' : item.severity === 'HIGH' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.08)',
                  border: `1px solid ${item.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.3)' : item.severity === 'HIGH' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.2)'}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: item.severity === 'CRITICAL' ? '#ef4444' : item.severity === 'HIGH' ? '#f59e0b' : '#10b981' }}>
                    {item.feature}
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff', background: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: '6px' }}>
                    {item.risk_impact}
                  </div>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#d1d5db', lineHeight: '1.4' }}>
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '10px', color: '#9ca3af', fontSize: '0.85rem' }}>
            No anomaly flags triggered. Transaction matches standard customer behavioral baseline.
          </div>
        )}

        <div style={{ marginTop: '24px', textAlign: 'right' }}>
          <button className="btn-secondary" onClick={onClose}>
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
