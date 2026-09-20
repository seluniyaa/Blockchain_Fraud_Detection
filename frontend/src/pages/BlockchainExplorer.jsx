import React, { useState, useEffect } from 'react';
import { Blocks, ShieldCheck, AlertTriangle, RefreshCw, Key, Link, ShieldAlert, Cpu, Wrench, ArrowLeft, Lock, X } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export const BlockchainExplorer = () => {
  const { setActiveTab, setRoleStep } = useAuth();
  const [chainData, setChainData] = useState([]);
  const [verificationResult, setVerificationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tamperLoading, setTamperLoading] = useState(false);
  const [repairLoading, setRepairLoading] = useState(false);

  // Password authorization modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [repairPassword, setRepairPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const API_BASE = 'http://127.0.0.1:8000/api/blockchain';

  useEffect(() => {
    fetchChain();
    verifyChain();
  }, []);

  const fetchChain = async () => {
    try {
      const res = await axios.get(`${API_BASE}/chain`);
      setChainData(res.data.chain || []);
    } catch (e) {
      console.error(e);
    }
  };

  const verifyChain = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/verify`);
      setVerificationResult(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRepairModal = () => {
    setPasswordError('');
    setRepairPassword('');
    setShowPasswordModal(true);
  };

  const handleExecuteAutoRepair = async (e) => {
    if (e) e.preventDefault();
    if (!repairPassword) {
      setPasswordError("Administrator authorization password is required.");
      return;
    }
    setPasswordError('');
    setRepairLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/repair`, {
        admin_password: repairPassword
      });
      setShowPasswordModal(false);
      alert(res.data.message);
      await fetchChain();
      await verifyChain();
    } catch (err) {
      setPasswordError(err.response?.data?.detail || "Authorization Failed: Invalid administrator password.");
    } finally {
      setRepairLoading(false);
    }
  };

  const handleSimulateTamper = async (blockIndex) => {
    setTamperLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/tamper-test`, {
        block_index: blockIndex,
        tampered_amount: 99999.99
      });
      alert(res.data.message);
      fetchChain();
      verifyChain();
    } catch (e) {
      alert("Error: " + (e.response?.data?.detail || e.message));
    } finally {
      setTamperLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Banner & Control Bar */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            background: '#1e293b',
            border: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#60a5fa'
          }}>
            <Blocks size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
              Private SHA-256 Blockchain Ledger
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '2px' }}>
              Cryptographic transaction audit trail and proof-of-work consensus verification
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            className="btn-secondary"
            onClick={() => {
              setActiveTab('manager_dashboard');
              setRoleStep(1);
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '9px 16px' }}
          >
            <ArrowLeft size={16} /> Return to Monitoring
          </button>

          <button className="btn-primary" onClick={verifyChain} disabled={loading} style={{ fontSize: '0.82rem' }}>
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            {loading ? "Auditing..." : "Re-Audit Hashes"}
          </button>

          <button
            className="btn-primary"
            onClick={handleOpenRepairModal}
            disabled={repairLoading}
            style={{ fontSize: '0.82rem', background: '#059669', borderColor: '#10b981' }}
          >
            <Wrench size={16} className={repairLoading ? "animate-spin" : ""} />
            {repairLoading ? "Repairing..." : "Auto-Repair Ledger"}
          </button>
        </div>
      </div>

      {/* Chain Integrity Status Card */}
      {verificationResult && (
        <div className="glass-panel" style={{
          padding: '20px',
          borderLeft: `4px solid ${verificationResult.is_valid ? '#10b981' : '#ef4444'}`,
          background: verificationResult.is_valid ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.08)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {verificationResult.is_valid ? (
                <ShieldCheck size={26} color="#10b981" />
              ) : (
                <ShieldAlert size={26} color="#ef4444" />
              )}
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: verificationResult.is_valid ? '#10b981' : '#ef4444' }}>
                  {verificationResult.is_valid ? "Consensus Verified (100% Intact)" : "Consensus Failure: Tamper Alert Detected"}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#d1d5db', marginTop: '2px' }}>
                  {verificationResult.reason}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              {!verificationResult.is_valid && (
                <button
                  className="btn-primary"
                  style={{ fontSize: '0.8rem', padding: '8px 14px', background: '#059669', borderColor: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={handleOpenRepairModal}
                  disabled={repairLoading}
                >
                  <Wrench size={14} className={repairLoading ? "animate-spin" : ""} />
                  {repairLoading ? "Repairing..." : "Auto-Repair Now"}
                </button>
              )}

              {chainData.length > 1 && (
                <button
                  className="btn-danger"
                  style={{ fontSize: '0.8rem', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => handleSimulateTamper(1)}
                  disabled={tamperLoading}
                >
                  <ShieldAlert size={14} /> Simulate Hash Tamper
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Research & Architectural Context: Consensus Immutability vs ML Anomaly Detection */}
      <div className="glass-panel" style={{
        padding: '16px 20px',
        background: 'rgba(56, 189, 248, 0.04)',
        border: '1px solid rgba(56, 189, 248, 0.2)',
        borderRadius: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <Cpu size={16} color="#38bdf8" />
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#38bdf8' }}>
            Consensus Layer Architecture: Cryptographic Immutability vs. Application Fraud Filter
          </span>
        </div>
        <p style={{ fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.5, margin: 0 }}>
          <strong>Why is the ledger 100% INTACT even when an adversary transaction is approved?</strong> The blockchain validates Proof-of-Work SHA-256 cryptographic linkage (previous hash continuity and valid nonces). When a stealth exploit successfully evades the ML anomaly filter (&le;$150 stealth payload), it receives legitimate banking authorization and is validly mined into a new block. Thus, the blockchain ledger remains mathematically 100% intact. The ledger only flips to <code>CORRUPTED</code> if an attacker compromises the miner network to tamper with historical block records post-consensus.
        </p>
      </div>

      {/* Password Authorization Modal */}
      {showPasswordModal && (
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
              onClick={() => setShowPasswordModal(false)}
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

            <form onSubmit={handleExecuteAutoRepair} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                  Administrator Password
                </label>
                <input
                  type="password"
                  placeholder="Enter administrator password"
                  value={repairPassword}
                  onChange={(e) => {
                    setRepairPassword(e.target.value);
                    setPasswordError('');
                  }}
                  autoFocus
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: passwordError ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#fff',
                    fontSize: '0.85rem'
                  }}
                />
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '6px' }}>
                  Hint: <code>manager123</code>
                </div>
                {passwordError && (
                  <div style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '6px', fontWeight: 500 }}>
                    {passwordError}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '0.8rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={repairLoading}
                  style={{ padding: '8px 18px', fontSize: '0.8rem', background: '#059669', borderColor: '#10b981' }}
                >
                  <Wrench size={14} className={repairLoading ? "animate-spin" : ""} />
                  {repairLoading ? "Re-Mining Blocks..." : "Authorize & Re-Mine"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* Block Chain Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>
          Ledger Blocks ({chainData.length})
        </h3>

        {chainData.map((block, idx) => (
          <div key={block.block_index} className="glass-panel" style={{ padding: '24px', position: 'relative' }}>
            
            {/* Block Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{
                  background: '#1e293b',
                  border: '1px solid #3b82f6',
                  color: '#60a5fa',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  padding: '4px 12px',
                  borderRadius: '6px'
                }}>
                  BLOCK #{block.block_index}
                </span>
                <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                  Timestamp: {block.formatted_time}
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#9ca3af' }} className="font-mono">
                Nonce: <span style={{ color: '#f59e0b', fontWeight: 700 }}>{block.nonce}</span>
              </div>
            </div>

            {/* Cryptographic Hashes */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '10px' }}>
                <div style={{ fontSize: '0.7rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Link size={12} /> Previous Hash
                </div>
                <div className="font-mono" style={{ fontSize: '0.75rem', color: '#9ca3af', wordBreak: 'break-all', marginTop: '4px' }}>
                  {block.previous_hash}
                </div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '10px' }}>
                <div style={{ fontSize: '0.7rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Key size={12} /> SHA-256 Block Hash
                </div>
                <div className="font-mono" style={{ fontSize: '0.75rem', color: '#818cf8', wordBreak: 'break-all', marginTop: '4px', fontWeight: 600 }}>
                  {block.current_hash}
                </div>
              </div>
            </div>

            {/* Transactions inside Block */}
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '10px', padding: '14px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#d1d5db', marginBottom: '10px' }}>
                Payload Records ({block.tx_count}):
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {block.transactions?.map((tx, i) => {
                  const isAdversary = tx.attack_type && tx.attack_type !== 'Legitimate' && tx.attack_type !== 'Genesis Block';
                  const isApproved = tx.status === 'APPROVED';
                  return (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.8rem',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        background: isAdversary
                          ? (isApproved ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)')
                          : 'rgba(255, 255, 255, 0.02)',
                        border: isAdversary
                          ? (isApproved ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(245, 158, 11, 0.25)')
                          : '1px solid rgba(255, 255, 255, 0.04)',
                        flexWrap: 'wrap',
                        gap: '6px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ color: '#fff', fontWeight: 600 }}>{tx.merchant}</span>
                        <span style={{ color: '#38bdf8', fontWeight: 700 }}>${tx.amount?.toFixed(2)}</span>
                        
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: isApproved ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          color: isApproved ? '#34d399' : '#f87171'
                        }}>
                          {tx.status}
                        </span>

                        {isAdversary && (
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: isApproved ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                            color: isApproved ? '#fca5a5' : '#fbbf24',
                            border: `1px solid ${isApproved ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`
                          }}>
                            {isApproved ? `⚠️ ADVERSARY EXPLOIT SETTLED (${tx.attack_type})` : `🛡️ INTERCEPTED (${tx.attack_type})`}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {tx.card_number && (
                          <span className="font-mono" style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                            {tx.card_number.slice(-4) ? `•••• ${tx.card_number.slice(-4)}` : tx.card_number}
                          </span>
                        )}
                        <span className="font-mono" style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          {tx.tx_hash ? `${tx.tx_hash.slice(0, 16)}...` : ''}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        ))}
      </div>

    </div>
  );
};
