import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, DollarSign, Activity, FileText, Brain, RefreshCw, Layers, Shield, Sliders, ShieldX, Wrench, Trash2, ArrowRight, Check, CreditCard, Lock, X, RotateCcw, Search, Crosshair, Radio, CheckCircle2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';

import { RiskBadge } from '../components/RiskBadge';
import { useAuth } from '../context/AuthContext';

export const ManagerDashboard = () => {
  const { roleStep, setRoleStep, advanceToNextStep, resetRoleWorkflow } = useAuth();

  const [metrics, setMetrics] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [selectedTxForXAI, setSelectedTxForXAI] = useState(null);

  // SOC Security Controls state
  const [secSettings, setSecSettings] = useState({});
  const [blacklistedIps, setBlacklistedIps] = useState([]);
  const [newBlacklistIp, setNewBlacklistIp] = useState('');
  const [newBlacklistReason, setNewBlacklistReason] = useState('Known Tor Exit Node & Spoofing Source');
  const [repairingBlockchain, setRepairingBlockchain] = useState(false);

  // Stage 4 Forensics & Asset Recovery state
  const [disputes, setDisputes] = useState([]);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [tracebackLoading, setTracebackLoading] = useState(false);
  const [tracebackData, setTracebackData] = useState(null);
  const [countermeasureLoading, setCountermeasureLoading] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryModalDispute, setRecoveryModalDispute] = useState(null);
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [recoveryPasswordError, setRecoveryPasswordError] = useState('');

  // Auto-repair password prompt modal state
  const [showRepairModal, setShowRepairModal] = useState(false);
  const [repairModalPassword, setRepairModalPassword] = useState('');
  const [repairModalError, setRepairModalError] = useState('');

  // Cardholder credit applications review state
  const [cardRequests, setCardRequests] = useState([]);
  const [processingCardReqId, setProcessingCardReqId] = useState(null);

  // Administrator password authorization state
  const [adminPassword, setAdminPassword] = useState('');
  const [adminPasswordError, setAdminPasswordError] = useState('');

  const API_BASE = 'http://127.0.0.1:8000/api/manager';

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 5000);
    return () => clearInterval(interval);
  }, [filterStatus]);

  const fetchAllData = async () => {
    try {
      const [mRes, tRes, txRes, secRes, crRes, dispRes] = await Promise.all([
        axios.get(`${API_BASE}/metrics`),
        axios.get(`${API_BASE}/timeline`),
        axios.get(`${API_BASE}/transactions?status=${filterStatus}`),
        axios.get(`${API_BASE}/security-settings`),
        axios.get(`${API_BASE}/card-requests`),
        axios.get(`${API_BASE}/disputes`)
      ]);

      setMetrics(mRes.data);
      setTimeline(tRes.data);
      setTransactions(txRes.data);
      setSelectedTxForXAI(prev => prev || txRes.data?.[0] || null);
      setSecSettings(secRes.data.settings || {});
      setBlacklistedIps(secRes.data.blacklisted_ips || []);
      setCardRequests(crRes.data || []);
      setDisputes(dispRes.data || []);
      setSelectedDispute(prev => prev ? (dispRes.data?.find(d => d.id === prev.id) || prev) : (dispRes.data?.[0] || null));
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateDefenseMode = async (mode) => {
    if (!adminPassword) {
      setAdminPasswordError("Administrator authorization password is required to change defense posture.");
      return;
    }
    setAdminPasswordError('');
    try {
      await axios.post(`${API_BASE}/security-settings`, {
        defense_mode: mode,
        admin_password: adminPassword
      });
      fetchAllData();
    } catch (e) {
      setAdminPasswordError(e.response?.data?.detail || "Authorization Failed: Invalid administrator password.");
    }
  };

  const handleUpdateRiskThreshold = async (threshold) => {
    if (!adminPassword) {
      setAdminPasswordError("Administrator authorization password is required to adjust risk cutoff.");
      return;
    }
    setAdminPasswordError('');
    try {
      await axios.post(`${API_BASE}/security-settings`, {
        risk_threshold_override: parseFloat(threshold),
        admin_password: adminPassword
      });
      fetchAllData();
    } catch (e) {
      setAdminPasswordError(e.response?.data?.detail || "Authorization Failed: Invalid administrator password.");
    }
  };

  const handleAddBlacklistIp = async (e) => {
    e.preventDefault();
    if (!newBlacklistIp) return;
    if (!adminPassword) {
      setAdminPasswordError("Administrator authorization password is required to blacklist IP.");
      return;
    }
    setAdminPasswordError('');
    try {
      await axios.post(`${API_BASE}/blacklist-ip`, {
        ip_address: newBlacklistIp,
        reason: newBlacklistReason,
        admin_password: adminPassword
      });
      setNewBlacklistIp('');
      fetchAllData();
    } catch (e) {
      setAdminPasswordError(e.response?.data?.detail || "Authorization Failed: Invalid administrator password.");
    }
  };

  const handleUnblockIp = async (ip) => {
    try {
      await axios.delete(`${API_BASE}/blacklist-ip/${ip}`);
      fetchAllData();
    } catch (e) {
      alert("Unblock error: " + e.message);
    }
  };

  const handleOpenRepairModal = () => {
    setRepairModalError('');
    setRepairModalPassword(adminPassword || '');
    setShowRepairModal(true);
  };

  const handleExecuteRepairFromModal = async (e) => {
    if (e) e.preventDefault();
    if (!repairModalPassword) {
      setRepairModalError("Administrator authorization password is required.");
      return;
    }
    setRepairModalError('');
    setRepairingBlockchain(true);
    try {
      const res = await axios.post(`${API_BASE}/repair-blockchain`, {
        admin_password: repairModalPassword
      });
      setShowRepairModal(false);
      alert(res.data.message);
      fetchAllData();
    } catch (err) {
      setRepairModalError(err.response?.data?.detail || "Authorization Failed: Invalid administrator password.");
    } finally {
      setRepairingBlockchain(false);
    }
  };


  const handleApproveCard = async (reqId) => {
    if (!adminPassword) {
      setAdminPasswordError("Administrator authorization password is required to approve & issue credit cards.");
      return;
    }
    setAdminPasswordError('');
    setProcessingCardReqId(reqId);
    try {
      const res = await axios.post(`${API_BASE}/card-requests/${reqId}/approve`, {
        admin_password: adminPassword
      });
      alert(res.data.message);
      fetchAllData();
    } catch (e) {
      setAdminPasswordError(e.response?.data?.detail || "Card Approval Failed: Invalid administrator password.");
    } finally {
      setProcessingCardReqId(null);
    }
  };

  const handleRejectCard = async (reqId) => {
    if (!adminPassword) {
      setAdminPasswordError("Administrator authorization password is required to decline credit card requests.");
      return;
    }
    setAdminPasswordError('');
    setProcessingCardReqId(reqId);
    try {
      const res = await axios.post(`${API_BASE}/card-requests/${reqId}/reject`, {
        admin_password: adminPassword
      });
      alert(res.data.message);
      fetchAllData();
    } catch (e) {
      setAdminPasswordError(e.response?.data?.detail || "Card Rejection Failed: Invalid administrator password.");
    } finally {
      setProcessingCardReqId(null);
    }
  };

  const handleInspectXAI = (tx) => {
    setSelectedTxForXAI(tx);
    // Forward-only advancement to Step 2: Explainable AI Inspection
    advanceToNextStep(2);
  };

  // Stage 4 Forensics & Asset Recovery Handlers
  const handleExecuteTraceback = async (disputeId) => {
    setTracebackLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/disputes/${disputeId}/traceback`);
      setTracebackData(res.data);
      fetchAllData();
    } catch (e) {
      alert("Traceback failed: " + (e.response?.data?.detail || e.message));
    } finally {
      setTracebackLoading(false);
    }
  };

  const handleDeployCountermeasure = async (disputeId) => {
    if (!adminPassword) {
      setAdminPasswordError("Administrator authorization password is required to deploy active honeytoken sinkholes.");
      return;
    }
    setAdminPasswordError('');
    setCountermeasureLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/disputes/${disputeId}/countermeasure`, {
        admin_password: adminPassword
      });
      alert(res.data.message);
      fetchAllData();
    } catch (e) {
      setAdminPasswordError(e.response?.data?.detail || "Countermeasure failed: Invalid administrator password.");
    } finally {
      setCountermeasureLoading(false);
    }
  };

  const handleOpenRecoveryModal = (dispute) => {
    setRecoveryModalDispute(dispute);
    setRecoveryPassword('');
    setRecoveryPasswordError('');
    setShowRecoveryModal(true);
  };

  const handleExecuteRecoveryFromModal = async (e) => {
    e.preventDefault();
    if (!recoveryPassword) {
      setRecoveryPasswordError("Administrator password required to authorize asset recovery.");
      return;
    }
    setRecoveryPasswordError('');
    setRecoveryLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/disputes/${recoveryModalDispute.id}/recover-funds`, {
        admin_password: recoveryPassword
      });
      setShowRecoveryModal(false);
      alert(res.data.message);
      fetchAllData();
    } catch (err) {
      setRecoveryPasswordError(err.response?.data?.detail || "Asset recovery failed: Invalid administrator password.");
    } finally {
      setRecoveryLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Forward Workflow Step Tracker */}
      <div className="glass-panel" style={{
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderLeft: '3px solid #10b981',
        borderRadius: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {[
            { num: 1, name: 'SOC Live Monitoring' },
            { num: 2, name: 'Explainable AI (XAI)' },
            { num: 3, name: 'Risk Policy & Controls' },
            { num: 4, name: 'Forensics & Recovery' }
          ].map((st, idx) => (
            <div
              key={st.num}
              onClick={() => setRoleStep(st.num)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                padding: '5px 10px',
                borderRadius: '6px',
                background: roleStep === st.num ? 'rgba(5, 150, 105, 0.2)' : 'transparent',
                border: roleStep === st.num ? '1px solid #10b981' : '1px solid transparent',
                transition: 'all 0.15s ease'
              }}
              title={`Jump to ${st.name}`}
            >
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: roleStep === st.num ? '#059669' : '#1e293b',
                color: '#fff',
                fontSize: '0.75rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {st.num}
              </div>
              <span style={{
                fontSize: '0.8rem',
                fontWeight: roleStep === st.num ? 700 : 500,
                color: roleStep === st.num ? '#f8fafc' : '#94a3b8'
              }}>
                {st.name}
              </span>
              {idx < 3 && <ArrowRight size={13} color="#475569" style={{ marginLeft: '4px' }} />}
            </div>
          ))}
        </div>
      </div>

      {/* Top Metric Cards Row (Always Visible for Context) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '16px'
      }}>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 600 }}>Total Processed</span>
            <Activity size={20} color="#6366f1" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', marginTop: '8px' }}>
            {metrics?.total_transactions || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '4px' }}>
            Live ML Evaluated
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #ef4444' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 600 }}>Blocked Fraud Attacks</span>
            <ShieldAlert size={20} color="#ef4444" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ef4444', marginTop: '8px' }}>
            {metrics?.blocked_count || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '4px' }}>
            Auto-Mitigated
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 600 }}>Prevented Loss</span>
            <DollarSign size={20} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981', marginTop: '8px' }}>
            ${metrics?.prevented_loss_usd?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || "0.00"}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '4px' }}>
            Saved Capital
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 600 }}>Blockchain Ledger</span>
            <Layers size={20} color="#8b5cf6" />
          </div>
          {(() => {
            const isIntact = metrics?.blockchain_status === 'INTACT' || metrics?.blockchain_status === 'INTECT';
            return (
              <>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: isIntact ? '#10b981' : '#ef4444', marginTop: '8px' }}>
                  {isIntact ? "100% INTACT" : "CORRUPTED"}
                </div>
                {isIntact ? (
                  <div style={{ fontSize: '0.72rem', color: metrics?.adversary_settled_count > 0 ? '#f59e0b' : '#10b981', marginTop: '4px', fontWeight: 500 }}>
                    {metrics?.adversary_settled_count > 0 
                      ? `⚠️ ${metrics.adversary_settled_count} Adversary TX(s) Settled` 
                      : "Cryptographic PoW Verified"}
                  </div>
                ) : (
                  <button
                    onClick={handleOpenRepairModal}
                    disabled={repairingBlockchain}
                    className="btn-danger"
                    style={{ padding: '4px 10px', fontSize: '0.7rem', marginTop: '6px' }}
                  >
                    <Wrench size={12} /> Auto-Repair Chain
                  </button>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* STAGE 1: SOC THREAT RADAR & LIVE FEED */}
      {roleStep === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Charts Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '20px' }}>
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>
                  Telemetry Timeline (Approved vs Blocked)
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Live SOC Radar</span>
              </div>
              <div style={{ height: '260px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeline}>
                    <defs>
                      <linearGradient id="colorApproved" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorBlocked" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.5}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="time_window" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }} />
                    <Area type="monotone" dataKey="approved" name="Approved Payments" stroke="#10b981" fillOpacity={1} fill="url(#colorApproved)" />
                    <Area type="monotone" dataKey="blocked" name="Blocked Fraud Attacks" stroke="#ef4444" fillOpacity={1} fill="url(#colorBlocked)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginBottom: '16px' }}>
                Triggered Threat Vectors
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {metrics?.threat_distribution?.map((t, idx) => (
                  <div key={idx}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                      <span style={{ color: '#d1d5db', fontWeight: 500 }}>{t.attack_type}</span>
                      <span style={{ color: '#ef4444', fontWeight: 700 }}>{t.count} events</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${Math.min(100, (t.count / (metrics.total_transactions || 1)) * 100)}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #ef4444, #f59e0b)',
                        borderRadius: '4px'
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Transaction Audit Table with XAI action to advance */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                  Live Transaction Stream
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                  Select any transaction to launch Explainable AI (XAI) feature attribution.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['ALL', 'APPROVED', 'FLAGGED', 'BLOCKED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setFilterStatus(st)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: filterStatus === st ? '#10b981' : 'transparent',
                      color: filterStatus === st ? '#fff' : '#9ca3af',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ overflowX: 'auto', maxHeight: '420px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', color: '#6b7280' }}>
                    <th style={{ padding: '12px' }}>Timestamp</th>
                    <th style={{ padding: '12px' }}>Card / User</th>
                    <th style={{ padding: '12px' }}>Merchant</th>
                    <th style={{ padding: '12px' }}>Amount ($)</th>
                    <th style={{ padding: '12px' }}>Attack Vector</th>
                    <th style={{ padding: '12px' }}>Status / Risk</th>
                    <th style={{ padding: '12px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.slice(0, 15).map((tx) => (
                    <tr key={tx.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '12px', color: '#9ca3af', fontSize: '0.75rem' }}>{tx.timestamp}</td>
                      <td style={{ padding: '12px', color: '#fff' }} className="font-mono">{tx.card_number}</td>
                      <td style={{ padding: '12px', color: '#fff', fontWeight: 600 }}>{tx.merchant}</td>
                      <td style={{ padding: '12px', color: '#fff', fontWeight: 700 }}>${tx.amount?.toFixed(2)}</td>
                      <td style={{ padding: '12px', color: tx.attack_type === 'Legitimate' ? '#10b981' : '#f59e0b' }}>
                        {tx.attack_type}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <RiskBadge score={tx.risk_score} status={tx.status} />
                      </td>
                      <td style={{ padding: '12px' }}>
                        <button
                          onClick={() => handleInspectXAI(tx)}
                          className="btn-primary"
                          style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                        >
                          <Brain size={14} /> Inspect XAI <ArrowRight size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* STAGE 2: EXPLAINABLE AI (XAI) DEEP INSPECTOR */}
      {roleStep === 2 && (
        <div style={{ maxWidth: '880px', margin: '0 auto', width: '100%' }}>
          <div className="glass-panel" style={{ padding: '32px' }}>
            <div style={{ marginBottom: '22px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Brain size={22} color="#10b981" /> Explainable AI (XAI) Decision Attribution
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: '4px' }}>
                Feature attribution weights for transaction <strong className="font-mono" style={{ color: '#fff' }}>{selectedTxForXAI?.tx_hash?.slice(0, 18) || "Recent Transaction"}</strong>.
              </p>
            </div>

            {/* Transaction Selection Bar */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '10px',
              padding: '14px 18px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 600 }}>
                  Select Transaction to Inspect with Explainable AI:
                </label>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  {transactions.length} Total Telemetry Events
                </span>
              </div>
              <select
                value={selectedTxForXAI?.id || ''}
                onChange={(e) => {
                  const found = transactions.find(t => t.id === parseInt(e.target.value));
                  if (found) setSelectedTxForXAI(found);
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: '#1e293b',
                  border: '1px solid #334155',
                  color: '#fff',
                  fontSize: '0.85rem'
                }}
              >
                {transactions.map(tx => (
                  <option key={tx.id} value={tx.id}>
                    [{tx.status}] ${tx.amount?.toFixed(2)} at {tx.merchant} ({tx.card_number}) • Risk: {tx.risk_score}% • {tx.attack_type}
                  </option>
                ))}
              </select>

              {/* Quick Anomaly Selection Chips */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                <span style={{ fontSize: '0.72rem', color: '#9ca3af', alignSelf: 'center' }}>Quick Select:</span>
                {transactions.slice(0, 5).map(tx => (
                  <button
                    key={tx.id}
                    onClick={() => setSelectedTxForXAI(tx)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: selectedTxForXAI?.id === tx.id ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                      background: selectedTxForXAI?.id === tx.id ? 'rgba(16, 185, 129, 0.2)' : 'rgba(0, 0, 0, 0.3)',
                      color: tx.status === 'APPROVED' ? '#34d399' : tx.status === 'DETECTED' ? '#fbbf24' : '#f87171'
                    }}
                  >
                    {tx.status} ${tx.amount?.toFixed(0)} ({tx.attack_type})
                  </button>
                ))}
              </div>
            </div>

            {selectedTxForXAI ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', background: 'rgba(0,0,0,0.4)', padding: '16px', borderRadius: '12px' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Card Number</div>
                    <div className="font-mono" style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 700 }}>{selectedTxForXAI.card_number}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Merchant</div>
                    <div style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 700 }}>{selectedTxForXAI.merchant}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Amount</div>
                    <div style={{ fontSize: '0.9rem', color: '#10b981', fontWeight: 800 }}>${selectedTxForXAI.amount?.toFixed(2)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Attack Vector</div>
                    <div style={{ fontSize: '0.82rem', color: selectedTxForXAI.attack_type === 'Legitimate' ? '#34d399' : '#f59e0b', fontWeight: 700 }}>
                      {selectedTxForXAI.attack_type || 'Legitimate'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Origin / IP</div>
                    <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }} className="font-mono">
                      {selectedTxForXAI.location || 'US'} ({selectedTxForXAI.ip_address || 'Local'})
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Status & Risk</div>
                    <RiskBadge score={selectedTxForXAI.risk_score} status={selectedTxForXAI.status} />
                  </div>
                </div>

                {/* Feature Attribution List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>
                    Model Feature Impact Breakdown:
                  </div>
                  {Array.isArray(selectedTxForXAI.xai_reason) ? selectedTxForXAI.xai_reason.map((f, idx) => (
                    <div key={idx} style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ color: '#fff', fontWeight: 700 }}>{f.feature}</span>
                        <span style={{ color: f.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b', fontWeight: 800 }}>{f.risk_impact}</span>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: '#9ca3af', margin: 0 }}>{f.description}</p>
                    </div>
                  )) : (
                    <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', color: '#d1d5db', fontSize: '0.85rem' }}>
                      Standard Behavioral Profile: Passed all ML and rule checks.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>
                Select an anomaly from the stream or proceed directly to countermeasures.
              </div>
            )}

            <button
              onClick={() => advanceToNextStep(3)}
              className="btn-primary"
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '12px',
                fontSize: '0.95rem',
                borderRadius: '8px',
                marginTop: '20px'
              }}
            >
              Proceed to Risk Policy & Controls <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STAGE 3: ACTIVE MITIGATION & LEDGER REPAIR */}
      {roleStep === 3 && (
        <div style={{ maxWidth: '980px', margin: '0 auto', width: '100%' }}>
          <div className="glass-panel" style={{ padding: '32px', borderLeft: '4px solid #10b981' }}>
            <div style={{ marginBottom: '22px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={22} color="#10b981" /> Risk Policy & Threat Countermeasures
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: '4px' }}>
                Configure defense postures, manage IP blacklists, and review credit card issuances.
              </p>
            </div>

            {/* Administrator Authorization Password Gate */}
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              padding: '14px 18px',
              borderRadius: '8px',
              border: adminPasswordError ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.1)',
              marginBottom: '20px'
            }}>
              <label style={{ fontSize: '0.8rem', color: '#f8fafc', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <Shield size={14} color="#10b981" /> Administrator Password Authorization
              </label>
              <input
                type="password"
                placeholder="Enter SOC admin password"
                value={adminPassword}
                onChange={(e) => {
                  setAdminPassword(e.target.value);
                  setAdminPasswordError('');
                }}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff',
                  fontSize: '0.85rem'
                }}
              />
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '6px' }}>
                Hint: <code>manager123</code> (Required for security policy modifications and card approvals)
              </div>
              {adminPasswordError && (
                <div style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '6px', fontWeight: 500 }}>
                  {adminPasswordError}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', marginBottom: '24px' }}>
              {/* Defense Posture & Risk Threshold Controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#9ca3af', display: 'block', marginBottom: '8px' }}>
                    Active SOC Defense Posture Mode
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[
                      { id: 'STANDARD', label: 'Standard ML', color: '#10b981' },
                      { id: 'STRICT_ZERO_TRUST', label: 'Zero-Trust', color: '#f59e0b' },
                      { id: 'EMERGENCY_LOCKDOWN', label: 'Lockdown', color: '#ef4444' }
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() => handleUpdateDefenseMode(mode.id)}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '8px',
                          border: '1px solid',
                          borderColor: secSettings.defense_mode === mode.id ? mode.color : 'rgba(255,255,255,0.08)',
                          background: secSettings.defense_mode === mode.id ? `${mode.color}20` : 'rgba(255,255,255,0.03)',
                          color: secSettings.defense_mode === mode.id ? '#fff' : '#9ca3af',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          flex: 1
                        }}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#9ca3af', marginBottom: '6px' }}>
                    <span>ML Fraud Block Threshold Slider:</span>
                    <span style={{ color: '#fff', fontWeight: 800 }}>{secSettings.risk_threshold_override || 70}% Risk Cutoff</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="85"
                    step="5"
                    value={secSettings.risk_threshold_override || 70}
                    onChange={(e) => handleUpdateRiskThreshold(e.target.value)}
                    style={{ width: '100%', cursor: 'pointer' }}
                  />
                </div>
              </div>

              {/* Active IP Blacklist Manager */}
              <div>
                <label style={{ fontSize: '0.8rem', color: '#9ca3af', display: 'block', marginBottom: '8px' }}>
                  Add Suspicious IP to SOC Blacklist
                </label>
                <form onSubmit={handleAddBlacklistIp} style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <input
                    type="text"
                    placeholder="IP Address (e.g. 185.220.101.4)"
                    value={newBlacklistIp}
                    onChange={(e) => setNewBlacklistIp(e.target.value)}
                    style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.85rem' }}
                    required
                  />
                  <button type="submit" className="btn-danger" style={{ padding: '8px 14px', fontSize: '0.8rem' }}>
                    <ShieldX size={14} /> Blacklist IP
                  </button>
                </form>

                <div style={{ maxHeight: '100px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {blacklistedIps.map((b) => (
                    <div key={b.ip_address} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.4)', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem' }}>
                      <span className="font-mono" style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <ShieldAlert size={12} /> {b.ip_address}
                      </span>
                      <span style={{ color: '#9ca3af' }}>{b.reason}</span>
                      <button onClick={() => handleUnblockIp(b.ip_address)} style={{ background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer' }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Cardholder Credit Applications Governance Review */}
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '10px',
              padding: '18px 20px',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CreditCard size={16} color="#60a5fa" /> Cardholder Credit Applications & Issuance Governance
                  </h4>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '3px 0 0 0' }}>
                    Separation of Duties: Customers request card products; Bank SOC & Operations underwrite, approve, and officially issue new accounts.
                  </p>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '3px 10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  Queue: {cardRequests.filter(r => r.status === 'PENDING_APPROVAL').length} Pending
                </span>
              </div>

              {cardRequests.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center', padding: '16px' }}>
                  No customer credit card applications found in system queue.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', textAlign: 'left' }}>
                        <th style={{ padding: '8px 10px', fontWeight: 600 }}>App #</th>
                        <th style={{ padding: '8px 10px', fontWeight: 600 }}>Applicant</th>
                        <th style={{ padding: '8px 10px', fontWeight: 600 }}>Product Tier</th>
                        <th style={{ padding: '8px 10px', fontWeight: 600 }}>Limit ($)</th>
                        <th style={{ padding: '8px 10px', fontWeight: 600 }}>Status</th>
                        <th style={{ padding: '8px 10px', fontWeight: 600, textAlign: 'right' }}>Governance Decision</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cardRequests.map((req) => (
                        <tr key={req.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '10px', color: '#818cf8', fontWeight: 600 }} className="font-mono">#{req.id}</td>
                          <td style={{ padding: '10px', color: '#f8fafc', fontWeight: 500 }}>
                            {req.holder_name} <span style={{ fontSize: '0.7rem', color: '#64748b' }}>({req.username || `User #${req.user_id}`})</span>
                          </td>
                          <td style={{ padding: '10px', color: '#cbd5e1' }}>{req.card_type}</td>
                          <td style={{ padding: '10px', color: '#34d399', fontWeight: 600 }}>${req.requested_limit?.toLocaleString()}</td>
                          <td style={{ padding: '10px' }}>
                            {req.status === 'PENDING_APPROVAL' && (
                              <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                                PENDING REVIEW
                              </span>
                            )}
                            {req.status === 'APPROVED' && (
                              <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                                ISSUED & ACTIVE
                              </span>
                            )}
                            {req.status === 'REJECTED' && (
                              <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                                DECLINED
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '10px', textAlign: 'right' }}>
                            {req.status === 'PENDING_APPROVAL' ? (
                              <div style={{ display: 'inline-flex', gap: '8px' }}>
                                <button
                                  onClick={() => handleApproveCard(req.id)}
                                  disabled={processingCardReqId === req.id}
                                  className="btn-primary"
                                  style={{ padding: '5px 12px', fontSize: '0.74rem', borderRadius: '5px', background: '#059669', borderColor: '#10b981' }}
                                >
                                  {processingCardReqId === req.id ? "Issuing..." : "Approve & Issue Card"}
                                </button>
                                <button
                                  onClick={() => handleRejectCard(req.id)}
                                  disabled={processingCardReqId === req.id}
                                  className="btn-secondary"
                                  style={{ padding: '5px 10px', fontSize: '0.74rem', borderRadius: '5px', color: '#f87171' }}
                                >
                                  Decline
                                </button>
                              </div>
                            ) : req.status === 'APPROVED' ? (
                              <span className="font-mono" style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                Account {req.card_number || 'Issued'}
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Archived</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Stage Navigation */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => advanceToNextStep(4)}
                className="btn-primary"
                style={{
                  flex: 1,
                  justifyContent: 'center',
                  padding: '12px',
                  fontSize: '0.95rem',
                  borderRadius: '8px'
                }}
              >
                Advance to Incident Forensics & Asset Recovery <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STAGE 4: INCIDENT FORENSICS, REVERSE TRACEBACK & ASSET RECOVERY */}
      {roleStep === 4 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.2fr', gap: '24px' }}>
          
          {/* Dispute Incident Queue Panel */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <RotateCcw size={20} color="#10b981" /> Customer Fraud Incident Queue
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '3px 0 0 0' }}>
                  Customer-disputed unauthorized charges requiring SOC investigation and asset recovery.
                </p>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.12)', padding: '4px 8px', borderRadius: '6px' }}>
                {disputes.filter(d => d.status !== 'FUNDS_RECOVERED').length} Active Disputes
              </span>
            </div>

            {disputes.length === 0 ? (
              <div style={{ padding: '36px', textAlign: 'center', color: '#9ca3af', background: 'rgba(0,0,0,0.2)', borderRadius: '10px' }}>
                <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 10px auto', display: 'block' }} />
                <div style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 600 }}>No Pending Fraud Disputes</div>
                <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>All customer transaction statement disputes are investigated and resolved.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '560px', overflowY: 'auto' }}>
                {disputes.map((d) => {
                  const isSelected = selectedDispute?.id === d.id;
                  return (
                    <div
                      key={d.id}
                      onClick={() => {
                        setSelectedDispute(d);
                        setTracebackData(null);
                      }}
                      style={{
                        padding: '16px',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        border: isSelected ? '2px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
                        background: isSelected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.02)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>
                          Incident #{d.id} • {d.customer_name}
                        </span>
                        <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ef4444' }}>
                          ${d.amount?.toFixed(2)}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#9ca3af', marginBottom: '6px' }}>
                        <span>Merchant: <strong style={{ color: '#d1d5db' }}>{d.merchant}</strong></span>
                        <span className="font-mono">{d.card_number}</span>
                      </div>

                      <div style={{ fontSize: '0.72rem', color: '#cbd5e1', background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: '6px', marginBottom: '8px' }}>
                        "{d.reason}"
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: d.status === 'FUNDS_RECOVERED' ? 'rgba(16, 185, 129, 0.2)' : d.status === 'SINKHOLED' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          color: d.status === 'FUNDS_RECOVERED' ? '#34d399' : d.status === 'SINKHOLED' ? '#38bdf8' : '#f87171'
                        }}>
                          {d.status === 'FUNDS_RECOVERED' ? "✅ FUNDS RESTORED" : d.status === 'SINKHOLED' ? "🛡️ ADVERSARY QUARANTINED" : d.status === 'INVESTIGATING' ? "🔍 TRACEBACK ACTIVE" : "🚨 PENDING INVESTIGATION"}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          {d.disputed_at?.slice(0, 16)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Forensic Incident Deck (Traceback, Reverse Hacking & Asset Recovery) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {selectedDispute ? (
              <>
                {/* Forensic Dossier & Hacker Traceback Card */}
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Crosshair size={18} color="#ef4444" /> Adversary Reverse Traceback & Attribution
                    </h3>
                    <button
                      onClick={() => handleExecuteTraceback(selectedDispute.id)}
                      disabled={tracebackLoading}
                      className="btn-primary"
                      style={{ padding: '6px 14px', fontSize: '0.75rem', background: '#3b82f6', borderColor: '#60a5fa' }}
                    >
                      <Search size={14} className={tracebackLoading ? "animate-spin" : ""} />
                      {tracebackLoading ? "Tracing Socket..." : "Trace Hacker"}
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '10px', marginBottom: '14px' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Identified Origin IP</div>
                      <div className="font-mono" style={{ fontSize: '0.85rem', color: '#ef4444', fontWeight: 700 }}>
                        {tracebackData?.traceback_ip || selectedDispute.traceback_ip || "185.220.101.4"}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Jurisdiction / Location</div>
                      <div style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600 }}>
                        {tracebackData?.traceback_country || selectedDispute.traceback_country || "RU (Russia)"}
                      </div>
                    </div>
                  </div>

                  {/* Deep Attribution Dossier */}
                  <div style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    background: tracebackData || selectedDispute.traceback_asn ? 'rgba(56, 189, 248, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    fontSize: '0.78rem',
                    color: '#d1d5db',
                    lineHeight: 1.5
                  }}>
                    <strong style={{ color: '#38bdf8' }}>Autonomous System (ASN) Attribution:</strong>
                    <div style={{ marginTop: '2px', color: '#fff' }}>
                      {tracebackData?.traceback_asn || selectedDispute.traceback_asn || "Run 'Trace Hacker' to initiate reverse ASN lookup and proxy/Tor exit node identification."}
                    </div>
                    {tracebackData?.threat_actor && (
                      <div style={{ marginTop: '6px', color: '#fca5a5' }}>
                        <strong>Correlated Threat Group:</strong> {tracebackData.threat_actor}
                      </div>
                    )}
                  </div>
                </div>

                {/* Active Defense Countermeasure ("Reverse Hacking") */}
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Radio size={18} color="#f59e0b" /> Active Countermeasure: Honeytoken Sinkhole
                      </h3>
                      <p style={{ fontSize: '0.74rem', color: '#9ca3af', margin: '3px 0 0 0' }}>
                        Deploy active defense: quarantine attacker socket across bank perimeter and transmit poisoned telemetry.
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeployCountermeasure(selectedDispute.id)}
                      disabled={countermeasureLoading || selectedDispute.status === 'SINKHOLED'}
                      className="btn-danger"
                      style={{ padding: '7px 14px', fontSize: '0.75rem' }}
                    >
                      <ShieldX size={14} className={countermeasureLoading ? "animate-spin" : ""} />
                      {countermeasureLoading ? "Engaging..." : selectedDispute.status === 'SINKHOLED' ? "Adversary Quarantined" : "Deploy Sinkhole"}
                    </button>
                  </div>

                  {selectedDispute.countermeasure_log && (
                    <div style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      fontSize: '0.74rem',
                      color: '#fca5a5',
                      fontFamily: 'monospace'
                    }}>
                      {selectedDispute.countermeasure_log}
                    </div>
                  )}
                </div>

                {/* Stolen Asset Recovery & Blockchain Compensation Reversal */}
                <div className="glass-panel" style={{ padding: '24px', borderLeft: `4px solid ${selectedDispute.status === 'FUNDS_RECOVERED' ? '#10b981' : '#f59e0b'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <DollarSign size={18} color="#10b981" /> Financial Asset Recovery & Ledger Reversal
                      </h3>
                      <p style={{ fontSize: '0.74rem', color: '#9ca3af', margin: '3px 0 0 0' }}>
                        Reimburse stolen capital (${selectedDispute.amount?.toFixed(2)}) to cardholder and mine a Proof-of-Work compensating reversal block.
                      </p>
                    </div>

                    {selectedDispute.status !== 'FUNDS_RECOVERED' ? (
                      <button
                        onClick={() => handleOpenRecoveryModal(selectedDispute)}
                        disabled={recoveryLoading}
                        className="btn-primary"
                        style={{ padding: '8px 16px', fontSize: '0.8rem', background: '#059669', borderColor: '#10b981' }}
                      >
                        <RotateCcw size={14} className={recoveryLoading ? "animate-spin" : ""} />
                        {recoveryLoading ? "Restoring..." : "Authorize Asset Recovery"}
                      </button>
                    ) : (
                      <span style={{
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        color: '#34d399',
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <CheckCircle2 size={14} /> Full Asset Restitution Complete
                      </span>
                    )}
                  </div>

                  {selectedDispute.status === 'FUNDS_RECOVERED' && (
                    <div style={{
                      background: 'rgba(16, 185, 129, 0.08)',
                      padding: '14px',
                      borderRadius: '8px',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      fontSize: '0.78rem',
                      color: '#d1fae5'
                    }}>
                      <div style={{ fontWeight: 700, color: '#34d399', marginBottom: '6px' }}>
                        ✅ Cryptographic Reversal Block Settled
                      </div>
                      <div>Compensating Reversal Block Index: <strong className="font-mono" style={{ color: '#fff' }}>#{selectedDispute.reversal_block_index}</strong></div>
                      <div className="font-mono" style={{ fontSize: '0.72rem', color: '#6ee7b7', wordBreak: 'break-all', marginTop: '4px' }}>
                        TX: {selectedDispute.reversal_tx_hash}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#9ca3af', marginTop: '6px' }}>
                        Cardholder <strong>{selectedDispute.customer_name}</strong> has received a 100% financial reimbursement into their core bank account.
                      </div>
                    </div>
                  )}
                </div>

                {/* Return button */}
                <button
                  onClick={resetRoleWorkflow}
                  className="btn-secondary"
                  style={{ width: '100%', justifyContent: 'center', padding: '12px', borderRadius: '8px', fontSize: '0.9rem' }}
                >
                  <RefreshCw size={15} /> Return to SOC Monitoring
                </button>
              </>
            ) : (
              <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                <Crosshair size={40} color="#64748b" style={{ margin: '0 auto 12px auto', display: 'block' }} />
                <h4 style={{ color: '#fff', fontSize: '1rem', margin: '0 0 6px 0' }}>Select an Incident from the Queue</h4>
                <p style={{ fontSize: '0.78rem', margin: 0 }}>
                  Select any customer dispute to execute reverse forensic traceback, engage honeytoken sinkholes, or issue a blockchain asset refund.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Auto-Repair Administrator Password Modal */}
      {showRepairModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '24px', position: 'relative' }}>
            <button
              onClick={() => setShowRepairModal(false)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                <Lock size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>Authorize Ledger Auto-Repair</h3>
                <p style={{ fontSize: '0.74rem', color: '#94a3b8', margin: '2px 0 0 0' }}>Administrator authorization required to re-mine consensus blocks.</p>
              </div>
            </div>

            <form onSubmit={handleExecuteRepairFromModal} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                  Administrator Password
                </label>
                <input
                  type="password"
                  placeholder="Enter administrator password"
                  value={repairModalPassword}
                  onChange={(e) => {
                    setRepairModalPassword(e.target.value);
                    setRepairModalError('');
                  }}
                  autoFocus
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: repairModalError ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#fff',
                    fontSize: '0.85rem'
                  }}
                />
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '6px' }}>
                  Hint: <code>manager123</code>
                </div>
                {repairModalError && (
                  <div style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '6px', fontWeight: 500 }}>
                    {repairModalError}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowRepairModal(false)}
                  className="btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '0.8rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={repairingBlockchain}
                  style={{ padding: '8px 18px', fontSize: '0.8rem', background: '#059669', borderColor: '#10b981' }}
                >
                  <Wrench size={14} className={repairingBlockchain ? "animate-spin" : ""} />
                  {repairingBlockchain ? "Re-Mining..." : "Authorize & Re-Mine"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Asset Recovery Administrator Password Modal */}
      {showRecoveryModal && recoveryModalDispute && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '24px', position: 'relative' }}>
            <button
              onClick={() => setShowRecoveryModal(false)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                <Lock size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>Authorize Financial Asset Recovery</h3>
                <p style={{ fontSize: '0.74rem', color: '#94a3b8', margin: '2px 0 0 0' }}>Reimburse ${recoveryModalDispute.amount?.toFixed(2)} to {recoveryModalDispute.customer_name} & mine reversal block.</p>
              </div>
            </div>

            <form onSubmit={handleExecuteRecoveryFromModal} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                  Administrator Password
                </label>
                <input
                  type="password"
                  placeholder="Enter administrator password"
                  value={recoveryPassword}
                  onChange={(e) => {
                    setRecoveryPassword(e.target.value);
                    setRecoveryPasswordError('');
                  }}
                  autoFocus
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: recoveryPasswordError ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#fff',
                    fontSize: '0.85rem'
                  }}
                />
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '6px' }}>
                  Hint: <code>manager123</code>
                </div>
                {recoveryPasswordError && (
                  <div style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '6px', fontWeight: 500 }}>
                    {recoveryPasswordError}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowRecoveryModal(false)}
                  className="btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '0.8rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={recoveryLoading}
                  style={{ padding: '8px 18px', fontSize: '0.8rem', background: '#059669', borderColor: '#10b981' }}
                >
                  <RotateCcw size={14} className={recoveryLoading ? "animate-spin" : ""} />
                  {recoveryLoading ? "Executing Recovery..." : "Authorize Recovery"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
