import React, { useState, useEffect } from 'react';
import { Zap, ShieldAlert, Code, RefreshCw, AlertTriangle, Terminal, Play, Sliders, ShieldX, Globe, ArrowRight, Crosshair, Check, Activity, ShieldCheck, X } from 'lucide-react';
import axios from 'axios';
import { RiskBadge } from '../components/RiskBadge';
import { useAuth } from '../context/AuthContext';

export const AttackerPage = () => {
  const { roleStep, setRoleStep, advanceToNextStep, resetRoleWorkflow } = useAuth();

  const [attackLogs, setAttackLogs] = useState([]);
  const [targetCards, setTargetCards] = useState([]);
  const [loadingScenario, setLoadingScenario] = useState(null);

  // Custom payload studio state
  const [selectedCard, setSelectedCard] = useState("4532-8901-2345-6789");
  const [selectedScenarioKey, setSelectedScenarioKey] = useState("transaction_tampering");
  const [customAmount, setCustomAmount] = useState(4999.99);
  const [customMerchant, setCustomMerchant] = useState("Offshore Crypto Exchange");
  const [customLocation, setCustomLocation] = useState("RU");
  const [customIp, setCustomIp] = useState("185.220.101.4");
  const [tamperSignature, setTamperSignature] = useState(true);
  const [customAttackType, setCustomAttackType] = useState("Transaction Tampering");
  const [priority, setPriority] = useState("high");
  const [lastAttackResult, setLastAttackResult] = useState(null);

  // Exploit Terminal Modal State
  const [showTerminal, setShowTerminal] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState([]);
  const [terminalProgress, setTerminalProgress] = useState(0);
  const [terminalResult, setTerminalResult] = useState(null);
  const [terminalRunning, setTerminalRunning] = useState(false);

  const API_BASE = 'http://127.0.0.1:8000/api/attacker';

  useEffect(() => {
    fetchTargetCards();
  }, []);

  const fetchTargetCards = async () => {
    try {
      const res = await axios.get(`${API_BASE}/target-cards`);
      setTargetCards(res.data || []);
      if (res.data && res.data.length > 0) {
        setSelectedCard(res.data[0].card_number);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getVipBadge = (tier) => {
    if (tier === 'PLATINUM_VIP') {
      return {
        label: 'L3 ULTRA-VIP',
        color: '#c084fc',
        bg: 'rgba(168, 85, 247, 0.15)',
        border: 'rgba(168, 85, 247, 0.4)',
        sub: 'Private Wealth • Zero-Tolerance Foreign Honeypot • Stealth Cap $150'
      };
    }
    if (tier === 'GOLD_VIP') {
      return {
        label: 'L2 GOLD-VIP',
        color: '#fbbf24',
        bg: 'rgba(245, 158, 11, 0.15)',
        border: 'rgba(245, 158, 11, 0.4)',
        sub: 'Executive VIP • Amount Cap $120 • +35% Anomaly Sensitivity'
      };
    }
    return {
      label: 'L1 STANDARD',
      color: '#38bdf8',
      bg: 'rgba(56, 189, 248, 0.15)',
      border: 'rgba(56, 189, 248, 0.4)',
      sub: 'Standard Retail • Baseline ML • Stealth Micro-Payments (<$75) Evade'
    };
  };

  const scenarios = [
    {
      key: 'card_testing',
      title: 'Card Testing Micro-Spam',
      attackType: 'Card Testing Micro-Spam',
      priority: 'low',
      probText: '~75% Bypass Probability',
      probBadge: 'LOW PRIORITY • EASIEST PENETRATION',
      defaultAmount: 1.25,
      defaultMerchant: 'Online Micro-Merchant',
      defaultLocation: 'US',
      defaultIp: '198.51.100.22',
      tamperSig: false,
      desc: 'Low-priority stealth probe. Fires rapid micro charges ($1.25). Low financial footprint slips past standard thresholds unless customer micro-lock is active.',
      color: '#10b981'
    },
    {
      key: 'low_profile_stealth',
      title: 'Stealth Category Evasion',
      attackType: 'Stealth Category Evasion',
      priority: 'low',
      probText: '~75% Bypass Probability',
      probBadge: 'LOW PRIORITY • HIGH BYPASS RATE',
      defaultAmount: 32.50,
      defaultMerchant: 'Neighborhood Market & Cafe',
      defaultLocation: 'US',
      defaultIp: '192.168.1.100',
      tamperSig: false,
      desc: 'Low-priority stealth vector. Simulates ordinary domestic retail purchase ($32.50) to avoid triggering ML anomaly z-scores.',
      color: '#34d399'
    },
    {
      key: 'identity_spoofing',
      title: 'Identity & IP Geolocation Spoofing',
      attackType: 'IP Geolocation Spoofing',
      priority: 'medium',
      probText: '~40% Bypass Probability',
      probBadge: 'MEDIUM PRIORITY • MODERATE CHALLENGE',
      defaultAmount: 110.00,
      defaultMerchant: 'Foreign Electronics Mart',
      defaultLocation: 'RU',
      defaultIp: '185.220.101.4',
      tamperSig: false,
      desc: 'Medium-priority exploit. Transmits $110 purchase from Russian IP (185.220.101.4). Intercepted on Platinum VIP (honeypot) and geofences; may evade standard accounts.',
      color: '#f59e0b'
    },
    {
      key: 'transaction_tampering',
      title: 'Transaction Payload Tampering',
      attackType: 'Transaction Tampering',
      priority: 'high',
      probText: '<5% Bypass Probability',
      probBadge: 'HIGH PRIORITY • HARD TO PENETRATE',
      defaultAmount: 4999.99,
      defaultMerchant: 'Offshore Crypto Exchange',
      defaultLocation: 'RU',
      defaultIp: '185.220.101.4',
      tamperSig: true,
      desc: 'High-priority aggressive attack. Alters payment amount ($25 -> $4,999) in transit. Cryptographic HMAC signature checks and Honeypot traps defend aggressively.',
      color: '#ef4444'
    },
    {
      key: 'replay_attack',
      title: 'Cryptographic Replay Attack',
      attackType: 'Replay Attack',
      priority: 'high',
      probText: '<5% Bypass Probability',
      probBadge: 'HIGH PRIORITY • HARD TO PENETRATE',
      defaultAmount: 350.00,
      defaultMerchant: 'Luxury Watch Boutique',
      defaultLocation: 'US',
      defaultIp: '192.168.1.100',
      tamperSig: false,
      desc: 'High-priority cryptographic vector. Replays previous authorized nonce. Blockchain ledger deduplication catches replay collision.',
      color: '#dc2626'
    },
    {
      key: 'account_takeover',
      title: 'Account Takeover (ATO) Velocity Drain',
      attackType: 'Account Takeover Drain',
      priority: 'high',
      probText: '~10% Bypass Probability',
      probBadge: 'HIGH PRIORITY • VELOCITY ANOMALY',
      defaultAmount: 480.00,
      defaultMerchant: 'High-Value Electronics Outlet',
      defaultLocation: 'US',
      defaultIp: '198.51.100.44',
      tamperSig: false,
      desc: 'High-priority credential compromise attempt. Rapid balance drain near card limits; intercepted by card velocity and anomaly guards.',
      color: '#c026d3'
    },
    {
      key: 'signature_tamper',
      title: 'Cryptographic HMAC Signature Tampering',
      attackType: 'Signature Tampering',
      priority: 'high',
      probText: '<2% Bypass Probability',
      probBadge: 'HIGH PRIORITY • CRYPTO ATTACK',
      defaultAmount: 3200.00,
      defaultMerchant: 'Unverified Peer Node',
      defaultLocation: 'US',
      defaultIp: '192.168.1.99',
      tamperSig: true,
      desc: 'Payload tampering attack modifying transaction amount in transit with an invalid or broken HMAC signature.',
      color: '#b91c1c'
    },
    {
      key: 'abnormal_spike',
      title: 'Abnormal Transaction Volume Spike',
      attackType: 'Abnormal Volume Spike',
      priority: 'high',
      probText: '<1% Bypass Probability',
      probBadge: 'HIGH PRIORITY • CRITICAL ANOMALY',
      defaultAmount: 16500.00,
      defaultMerchant: 'Superyacht Charter LLC',
      defaultLocation: 'US',
      defaultIp: '192.168.1.100',
      tamperSig: false,
      desc: 'High-priority luxury purchase. Extreme deviation (>4 standard deviations, >$500 cutoff) unconditionally blocked by ML z-score detector.',
      color: '#991b1b'
    },
    {
      key: 'blockchain_tamper',
      title: 'Consensus Block & Ledger Tampering (51% Exploit)',
      attackType: 'Consensus Ledger Tampering',
      priority: 'high',
      probText: '100% Chain Integrity Breach',
      probBadge: 'CRITICAL CONSENSUS ATTACK',
      defaultAmount: 99999.99,
      defaultMerchant: 'Adversary Miner Collective',
      defaultLocation: 'RU',
      defaultIp: '185.220.101.5',
      tamperSig: true,
      desc: 'Direct block ledger corruption: overwrites historical Block #1 transaction record in database. Flips Blockchain status to CORRUPTED and triggers SOC auto-repair workflow.',
      color: '#e11d48'
    }
  ];

  const handleSelectScenario = (sc) => {
    setSelectedScenarioKey(sc.key);
    setCustomAttackType(sc.attackType);
    setCustomAmount(sc.defaultAmount);
    setCustomMerchant(sc.defaultMerchant);
    setCustomLocation(sc.defaultLocation);
    setCustomIp(sc.defaultIp);
    setTamperSignature(sc.tamperSig);
    setPriority(sc.priority || 'medium');
  };

  const executeExploitWithTerminal = (payloadData) => {
    setShowTerminal(true);
    setTerminalRunning(true);
    setTerminalProgress(10);
    setTerminalResult(null);

    const targetMasked = payloadData.card_number
      ? `${payloadData.card_number.slice(0, 4)}-****-****-${payloadData.card_number.slice(-4)}`
      : 'TARGET_CARD';

    // Fully randomized duration between 3.2s and 5.2s
    const totalDuration = Math.floor(Math.random() * 2000) + 3200;
    const t1 = Math.round(totalDuration * 0.20);
    const t2 = Math.round(totalDuration * 0.42);
    const t3 = Math.round(totalDuration * 0.65);
    const t4 = Math.round(totalDuration * 0.84);

    const fmtTime = (ms) => {
      const sec = (ms / 1000).toFixed(2);
      return `00:${sec.padStart(5, '0')}`;
    };

    setTerminalLogs([
      { time: '00:00.08', tag: 'INIT', text: `Initializing Red-Team C2 Exploit Framework v4.8...`, color: '#60a5fa' }
    ]);

    // Fire API request asynchronously
    const backendPromise = axios.post(`${API_BASE}/custom-payload`, payloadData)
      .then(res => res.data)
      .catch(err => ({ error: err.response?.data?.detail || err.message }));

    // Timed step 1
    setTimeout(() => {
      setTerminalProgress(28);
      setTerminalLogs(prev => [
        ...prev,
        {
          time: fmtTime(t1),
          tag: 'TARGET',
          text: `Compromised account armed: ${targetMasked} | Priority: [${(payloadData.priority || 'MEDIUM').toUpperCase()}]`,
          color: payloadData.priority === 'low' ? '#34d399' : payloadData.priority === 'high' ? '#ef4444' : '#fbbf24'
        }
      ]);
    }, t1);

    // Timed step 2
    setTimeout(() => {
      setTerminalProgress(52);
      setTerminalLogs(prev => [
        ...prev,
        {
          time: fmtTime(t2),
          tag: 'PROXY',
          text: `Hopping Tor onion relays... Spoofing origin IP (${payloadData.ip_address}) & Country (${payloadData.location})`,
          color: '#c084fc'
        }
      ]);
    }, t2);

    // Timed step 3
    setTimeout(() => {
      setTerminalProgress(74);
      setTerminalLogs(prev => [
        ...prev,
        {
          time: fmtTime(t3),
          tag: 'INJECT',
          text: `Transmitting forged merchant payment packet: $${parseFloat(payloadData.amount).toFixed(2)} USD at '${payloadData.merchant}'...`,
          color: '#38bdf8'
        }
      ]);
    }, t3);

    // Timed step 4
    setTimeout(() => {
      setTerminalProgress(91);
      setTerminalLogs(prev => [
        ...prev,
        {
          time: fmtTime(t4),
          tag: 'EVAL',
          text: `Evaluating Bank ML Anomaly Engine, Isolation Forest z-scores & SHA-256 Ledger Consensus response...`,
          color: '#fbbf24'
        }
      ]);
    }, t4);

    // Timed step 5 (totalDuration) - Final Resolution
    setTimeout(async () => {
      const data = await backendPromise;
      setTerminalProgress(100);
      setTerminalRunning(false);

      if (data.error) {
        setTerminalLogs(prev => [
          ...prev,
          { time: fmtTime(totalDuration), tag: 'ERROR', text: `C2 Exploit Transmission Error: ${data.error}`, color: '#ef4444' }
        ]);
        return;
      }

      setTerminalResult(data);
      setLastAttackResult(data);
      setAttackLogs(prev => [data, ...prev]);

      let finalTag = 'RESULT';
      let finalText = '';
      let finalColor = '#fff';

      if (data.status === 'APPROVED') {
        finalTag = 'SUCCESS';
        finalText = `[+] EXPLOIT BYPASS SUCCESSFUL! $${data.amount?.toFixed(2)} exfiltrated. Bank ML thresholds bypassed. Persisted in Blockchain Block #${data.block_index}.`;
        finalColor = '#34d399';
      } else if (data.status === 'DETECTED') {
        finalTag = 'DETECTED';
        finalText = `[!] BANK SOC HONEYPOT TRACEBACK! Origin connection ${payloadData.ip_address} was detected back and automatically blacklisted by Bank SOC!`;
        finalColor = '#f87171';
      } else {
        finalTag = 'BLOCKED';
        finalText = `[-] EXPLOIT INTERCEPTED: Bank Defense Barrier engaged. Transaction blocked with ${data.risk_score}% ML risk cutoff.`;
        finalColor = '#ef4444';
      }

      setTerminalLogs(prev => [
        ...prev,
        { time: fmtTime(totalDuration), tag: finalTag, text: finalText, color: finalColor }
      ]);
    }, totalDuration);
  };

  const handleQuickLaunchScenario = (sc) => {
    handleSelectScenario(sc);
    const fakeSig = sc.tamperSig ? "TAMPERED_INVALID_HMAC_SIG_9999" : null;
    const payloadData = {
      card_number: selectedCard,
      merchant: sc.defaultMerchant,
      amount: parseFloat(sc.defaultAmount),
      location: sc.defaultLocation,
      ip_address: sc.defaultIp,
      signature: fakeSig,
      attack_type: sc.attackType,
      priority: sc.priority || 'medium'
    };
    executeExploitWithTerminal(payloadData);
  };

  const handleInjectCustomPayload = (e) => {
    e.preventDefault();
    const fakeSig = tamperSignature ? "TAMPERED_INVALID_HMAC_SIG_9999" : null;
    const payloadData = {
      card_number: selectedCard,
      merchant: customMerchant,
      amount: parseFloat(customAmount),
      location: customLocation,
      ip_address: customIp,
      signature: fakeSig,
      attack_type: customAttackType,
      priority: priority
    };
    executeExploitWithTerminal(payloadData);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Forward Workflow Step Tracker */}
      <div className="glass-panel" style={{
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderLeft: '3px solid #ef4444',
        borderRadius: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {[
            { num: 1, name: 'Target Reconnaissance' },
            { num: 2, name: 'Exploit Weaponization' },
            { num: 3, name: 'Interception Telemetry' }
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
                background: roleStep === st.num ? 'rgba(220, 38, 38, 0.2)' : 'transparent',
                border: roleStep === st.num ? '1px solid #ef4444' : '1px solid transparent',
                transition: 'all 0.15s ease'
              }}
              title={`Jump to ${st.name}`}
            >
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: roleStep === st.num ? '#dc2626' : '#1e293b',
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
              {idx < 2 && <ArrowRight size={13} color="#475569" style={{ marginLeft: '4px' }} />}
            </div>
          ))}
        </div>
      </div>

      {/* STAGE 1: TARGET CARD & SCENARIO SELECTION */}
      {roleStep === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Target Card Picker */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Crosshair size={20} color="#ef4444" /> Target Reconnaissance: Account Selection
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '16px' }}>
              Select target account profile to evaluate detection thresholds and perimeter defenses.
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
              {targetCards.map((c) => {
                const vip = getVipBadge(c.vip_tier);
                const isSelected = selectedCard === c.card_number;
                return (
                  <div
                    key={c.card_number}
                    onClick={() => setSelectedCard(c.card_number)}
                    style={{
                      padding: '16px',
                      borderRadius: '10px',
                      border: isSelected ? '2px solid #ef4444' : '1px solid rgba(255,255,255,0.08)',
                      background: isSelected ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255,255,255,0.03)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>{c.holder_name}</span>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        color: vip.color,
                        background: vip.bg,
                        border: `1px solid ${vip.border}`,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        letterSpacing: '0.5px'
                      }}>
                        {vip.label}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="font-mono" style={{ fontSize: '0.88rem', color: '#d1d5db', letterSpacing: '1px' }}>
                        {c.card_number}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: 700 }}>
                        ${c.balance?.toLocaleString()}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                      {c.card_type || 'Debit Card'} • Home: {c.home_country}
                      {c.card_locked === 1 && <span style={{ color: '#ef4444', fontWeight: 700, marginLeft: '6px' }}>[FROZEN]</span>}
                    </div>
                    <div style={{
                      fontSize: '0.68rem',
                      color: vip.color,
                      background: 'rgba(0,0,0,0.25)',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      borderLeft: `2px solid ${vip.color}`
                    }}>
                      🛡️ Security: {vip.sub}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Preset Attack Scenarios Grid */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={20} color="#ef4444" /> Exploit Vectors & Attack Scenarios
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#94a3af' }}>
                Priority Tiers: Low (Stealth) • High (Aggressive)
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '18px' }}>
              Select attack vector. Detection probability varies across ML feature weights, signature heuristics, and honeytoken triggers.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '22px' }}>
              {scenarios.map((sc) => {
                const isSelected = selectedScenarioKey === sc.key;
                return (
                  <div
                    key={sc.key}
                    onClick={() => handleSelectScenario(sc)}
                    style={{
                      padding: '18px',
                      borderRadius: '10px',
                      border: isSelected ? `2px solid ${sc.color}` : '1px solid rgba(255,255,255,0.08)',
                      background: isSelected ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <div>
                          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', display: 'block' }}>{sc.title}</span>
                          <span style={{
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            color: sc.priority === 'low' ? '#34d399' : sc.priority === 'high' ? '#f87171' : '#fbbf24',
                            letterSpacing: '0.5px',
                            textTransform: 'uppercase'
                          }}>
                            {sc.probBadge}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: `${sc.color}25`, color: sc.color, fontWeight: 700 }}>
                          {isSelected ? "ARMED" : "SELECT"}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.78rem', color: '#9ca3af', lineHeight: '1.4', margin: '8px 0 12px 0' }}>
                        {sc.desc}
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickLaunchScenario(sc);
                        }}
                        className="btn-danger"
                        style={{ flex: 1, padding: '7px 10px', fontSize: '0.75rem', justifyContent: 'center' }}
                      >
                        <Play size={12} /> Launch Payload
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Stage Navigation */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => advanceToNextStep(2)}
                className="btn-primary"
                style={{
                  flex: 1,
                  justifyContent: 'center',
                  padding: '12px',
                  fontSize: '0.95rem',
                  borderRadius: '8px'
                }}
              >
                Configure Exploit Payload <ArrowRight size={16} />
              </button>
            </div>
          </div>

        </div>
      )}

      {/* STAGE 2: CUSTOM PAYLOAD CRAFTSMAN STUDIO */}
      {roleStep === 2 && (
        <div style={{ maxWidth: '840px', margin: '0 auto', width: '100%' }}>
          <div className="glass-panel" style={{ padding: '32px' }}>
            <div style={{ marginBottom: '22px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Terminal size={22} color="#ef4444" /> Exploit Payload Studio
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: '4px' }}>
                Configuring payload against victim card <strong className="font-mono" style={{ color: '#fff' }}>{selectedCard}</strong> with vector <strong style={{ color: '#ef4444' }}>{customAttackType}</strong>.
              </p>
            </div>

            <form onSubmit={handleInjectCustomPayload} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              
              {/* Priority & Difficulty Tier Selector */}
              <div>
                <label style={{ fontSize: '0.8rem', color: '#9ca3af', display: 'block', marginBottom: '8px' }}>
                  Attack Priority & Evasion Tier
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  {[
                    { id: 'low', label: 'Low (Stealth Bypass)', prob: '~75% Bypass', desc: 'Low anomaly z-score slips past basic thresholds', color: '#10b981' },
                    { id: 'medium', label: 'Medium (Standard)', prob: '~42% Bypass', desc: 'Balanced payload testing standard rule triggers', color: '#f59e0b' },
                    { id: 'high', label: 'High (Aggressive Siphon)', prob: '~15% Bypass', desc: 'High anomaly footprint triggering ML model & SOC traceback', color: '#ef4444' }
                  ].map(p => (
                    <div
                      key={p.id}
                      onClick={() => setPriority(p.id)}
                      style={{
                        padding: '14px',
                        borderRadius: '8px',
                        border: priority === p.id ? `2px solid ${p.color}` : '1px solid rgba(255,255,255,0.08)',
                        background: priority === p.id ? `${p.color}15` : 'rgba(255,255,255,0.02)',
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', display: 'block' }}>{p.label}</span>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: p.color, display: 'block', margin: '4px 0 6px 0' }}>{p.prob}</span>
                      <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: 0, lineHeight: 1.3 }}>{p.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>
                    Exploit Vector / Scenario Classification
                  </label>
                  <input
                    type="text"
                    value={customAttackType}
                    onChange={(e) => setCustomAttackType(e.target.value)}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: '0.9rem' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>
                    Target Merchant Destination (Forged Entity)
                  </label>
                  <input
                    type="text"
                    value={customMerchant}
                    onChange={(e) => setCustomMerchant(e.target.value)}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: '0.9rem' }}
                    required
                  />
                </div>
              </div>

              {/* Selected Target Card Security Tier Banner */}
              {(() => {
                const curCard = targetCards.find(c => c.card_number === selectedCard);
                const vip = getVipBadge(curCard?.vip_tier);
                return curCard ? (
                  <div style={{
                    background: vip.bg,
                    border: `1px solid ${vip.border}`,
                    borderRadius: '8px',
                    padding: '12px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                    flexWrap: 'wrap'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: vip.color, letterSpacing: '0.5px' }}>
                        TARGET DEFENSE TIER: {vip.label} ({curCard.holder_name})
                      </span>
                      <p style={{ fontSize: '0.74rem', color: '#e2e8f0', margin: '3px 0 0 0' }}>
                        {curCard.vip_tier === 'PLATINUM_VIP' && "Ultra-VIP Wealth: Zero-tolerance origin checking. Foreign IPs trigger instant honeypot traceback. Max stealth evasion cap: $150."}
                        {curCard.vip_tier === 'GOLD_VIP' && "Executive VIP Account: Maximum stealth limit capped at $120. Anomaly sensitivity increased by +35%."}
                        {curCard.vip_tier === 'STANDARD' && "Retail Standard Account: Baseline behavioral heuristics. Micro payments (<$75) have highest bypass probability."}
                      </p>
                    </div>
                    <span className="font-mono" style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                      Daily Limit: ${curCard.daily_limit || 2000}/day
                    </span>
                  </div>
                ) : null;
              })()}

              {/* Amount Selector with Preset Chips & Precision Input */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '18px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 700 }}>Exploit Siphon Amount</span>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block' }}>
                      Amounts &gt; $500 are automatically intercepted by ML anomaly z-score thresholds.
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>$</span>
                    <input
                      type="number"
                      min="0.5"
                      max="100000"
                      step="0.5"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      style={{
                        width: '120px',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: 'rgba(0,0,0,0.5)',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        color: '#ef4444',
                        fontSize: '1.05rem',
                        fontWeight: 800,
                        textAlign: 'right'
                      }}
                    />
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>USD</span>
                  </div>
                </div>

                <input
                  type="range"
                  min="1"
                  max="5000"
                  step="5"
                  value={Math.min(customAmount, 5000)}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  style={{ width: '100%', cursor: 'pointer', marginBottom: '12px' }}
                />

                {/* Quick Preset Buttons */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Quick Presets:</span>
                  {[
                    { label: 'Micro ($28)', amt: 28.00 },
                    { label: 'Stealth ($65)', amt: 65.00 },
                    { label: 'Moderate ($115)', amt: 115.00 },
                    { label: 'Elevated ($350)', amt: 350.00 },
                    { label: 'Interception Spike ($1,200)', amt: 1200.00 }
                  ].map(p => (
                    <button
                      key={p.amt}
                      type="button"
                      onClick={() => setCustomAmount(p.amt)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background: Math.abs(customAmount - p.amt) < 0.1 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.05)',
                        border: Math.abs(customAmount - p.amt) < 0.1 ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.08)',
                        color: Math.abs(customAmount - p.amt) < 0.1 ? '#f87171' : '#cbd5e1',
                        fontSize: '0.72rem',
                        cursor: 'pointer'
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <div style={{
                  marginTop: '10px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: parseFloat(customAmount) > 500 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                  borderLeft: `3px solid ${parseFloat(customAmount) > 500 ? '#ef4444' : '#10b981'}`,
                  fontSize: '0.72rem',
                  color: parseFloat(customAmount) > 500 ? '#fca5a5' : '#86efac'
                }}>
                  {parseFloat(customAmount) > 500 ? (
                    <>⛔ <strong>Guaranteed Interception:</strong> Siphon amount (${parseFloat(customAmount).toFixed(2)}) exceeds the $500 ML threshold. The anomaly engine will tag this transaction as HIGH RISK and block settlement.</>
                  ) : parseFloat(customAmount) <= 75 ? (
                    <>✨ <strong>Stealth Micro-Amount Window:</strong> Siphon amount (${parseFloat(customAmount).toFixed(2)}) is within the micro-transaction threshold. Highest chance of evading standard anomaly filters if perimeter rules (geofence, micro-lock) are inactive.</>
                  ) : (
                    <>⚖️ <strong>Moderate Anomaly Range:</strong> Siphon amount (${parseFloat(customAmount).toFixed(2)}) is subject to cardholder VIP tier multipliers and velocity checks.</>
                  )}
                </div>
              </div>

              {/* Geolocation & Spoofed IP */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>
                    Spoofed Origin Country (Geofence Target)
                  </label>
                  <select
                    value={customLocation}
                    onChange={(e) => setCustomLocation(e.target.value)}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: '0.9rem' }}
                  >
                    <option value="RU" style={{ background: '#111' }}>RU - Russia (High-Risk Anomaly Origin)</option>
                    <option value="CN" style={{ background: '#111' }}>CN - China (Foreign Jurisdiction)</option>
                    <option value="UK" style={{ background: '#111' }}>UK - United Kingdom</option>
                    <option value="US" style={{ background: '#111' }}>US - United States (Domestic Mask)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>
                    Spoofed Source IP (SOC Telemetry Target)
                  </label>
                  <input
                    type="text"
                    value={customIp}
                    onChange={(e) => setCustomIp(e.target.value)}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: '0.9rem' }}
                    required
                  />
                </div>
              </div>

              {/* HMAC Signature Tamper Switch */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '14px 18px', borderRadius: '10px' }}>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff' }}>Tamper Cryptographic HMAC Signature</div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Inject invalid cryptographic signature hash to test blockchain signature barrier</div>
                </div>
                <input
                  type="checkbox"
                  checked={tamperSignature}
                  onChange={(e) => setTamperSignature(e.target.checked)}
                  style={{ width: '22px', height: '22px', cursor: 'pointer' }}
                />
              </div>

              <button
                type="submit"
                className="btn-danger"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  padding: '12px',
                  fontSize: '0.95rem',
                  borderRadius: '8px'
                }}
              >
                Execute Exploit Payload <ArrowRight size={16} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* STAGE 3: ADVERSARY STRUGGLE & DEFENSE RESISTANCE CONSOLE */}
      {roleStep === 3 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
          
          {/* Defense Resistance Analysis Card */}
          <div className="glass-panel" style={{
            padding: '28px',
            borderLeft: `4px solid ${lastAttackResult?.status === 'APPROVED' ? '#10b981' : lastAttackResult?.status === 'DETECTED' ? '#f59e0b' : '#ef4444'}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {lastAttackResult?.status === 'APPROVED' && <ShieldCheck size={24} color="#10b981" />}
                {lastAttackResult?.status === 'BLOCKED' && <ShieldAlert size={24} color="#ef4444" />}
                {lastAttackResult?.status === 'DETECTED' && <AlertTriangle size={24} color="#f59e0b" />}
                Exploit Outcome: {lastAttackResult?.status === 'APPROVED' ? "BYPASSED (SUCCESS)" : lastAttackResult?.status === 'DETECTED' ? "COUNTER-DETECTED" : "BLOCKED"}
              </h3>
              {lastAttackResult && (
                <RiskBadge score={lastAttackResult.risk_score} status={lastAttackResult.status} />
              )}
            </div>

            <p style={{ fontSize: '0.9rem', color: '#d1d5db', marginBottom: '18px' }}>
              Vector <strong style={{ color: '#ef4444' }}>{lastAttackResult?.attack_type}</strong> (Priority: <strong style={{ textTransform: 'uppercase', color: '#fff' }}>{lastAttackResult?.priority || 'MEDIUM'}</strong>) against target card <strong className="font-mono" style={{ color: '#fff' }}>{lastAttackResult?.card_number}</strong> was processed by defense pipeline.
            </p>

            {/* Defense Barrier Breakdown */}
            <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '10px', padding: '18px', marginBottom: '20px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#9ca3af', marginBottom: '10px', textTransform: 'uppercase' }}>
                Defense Barrier Attribution:
              </div>
              
              {lastAttackResult?.xai_insights?.map((x, i) => (
                <div key={i} style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: lastAttackResult.status === 'APPROVED' ? 'rgba(16, 185, 129, 0.08)' : lastAttackResult.status === 'DETECTED' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${lastAttackResult.status === 'APPROVED' ? 'rgba(16, 185, 129, 0.25)' : lastAttackResult.status === 'DETECTED' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.25)'}`,
                  marginBottom: '8px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', fontWeight: 700, color: lastAttackResult.status === 'APPROVED' ? '#34d399' : lastAttackResult.status === 'DETECTED' ? '#fbbf24' : '#fca5a5' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {lastAttackResult.status === 'APPROVED' ? <Check size={14} /> : <ShieldAlert size={14} />} {x.feature}
                    </span>
                    <span>Impact: {x.risk_impact}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#d1d5db', marginTop: '4px' }}>
                    {x.description}
                  </div>
                </div>
              ))}

              {lastAttackResult?.blockchain_tampered ? (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid #ef4444',
                  borderRadius: '8px',
                  padding: '12px',
                  marginTop: '12px',
                  fontSize: '0.78rem',
                  color: '#fca5a5'
                }}>
                  <strong style={{ color: '#ef4444' }}>⚠️ 51% CONSENSUS LEDGER CORRUPTED:</strong> Block #1 database records were tampered. Blockchain status flipped to <code>CORRUPTED</code>. Manager authorization required to auto-repair.
                </div>
              ) : (
                <div style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  marginTop: '12px',
                  fontSize: '0.75rem',
                  color: '#9ca3af'
                }}>
                  <strong style={{ color: '#38bdf8' }}>Consensus Audit Note:</strong> Ledger Block #{lastAttackResult?.block_index} mined with SHA-256 Proof-of-Work.
                  {lastAttackResult?.status === 'APPROVED' ? (
                    <span> While ML defenses were bypassed, cryptographic block hashes remain 100% INTACT.</span>
                  ) : (
                    <span> Intercepted exploit was logged and preserved immutably in the forensic audit ledger.</span>
                  )}
                </div>
              )}
            </div>

            {/* Action to Start New Attack (Cycle restart) */}
            <button
              onClick={resetRoleWorkflow}
              className="btn-secondary"
              style={{ width: '100%', justifyContent: 'center', padding: '12px', borderRadius: '8px', fontSize: '0.9rem' }}
            >
              <RefreshCw size={15} /> New Exploit Simulation
            </button>
          </div>

          {/* Live Adversary Console Log */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Code size={18} color="#ef4444" /> Red-Team Exploit History
            </h3>

            <div style={{ maxHeight: '380px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {attackLogs.map((log, idx) => (
                <div key={idx} style={{ background: 'rgba(0,0,0,0.5)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                    <span style={{ color: '#ef4444', fontWeight: 700 }}>
                      {log.attack_type} <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>[{log.priority || 'MED'}]</span>
                    </span>
                    <RiskBadge score={log.risk_score} status={log.status} />
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                    Target: {log.card_number} • Amount: ${log.amount?.toFixed(2)}
                  </div>
                  <div className="font-mono" style={{ fontSize: '0.7rem', color: '#818cf8', marginTop: '4px' }}>
                    Block #{log.block_index} • TX: {log.tx_hash?.slice(0, 18)}...
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Interactive Red-Team Exploit Terminal Modal */}
      {showTerminal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100,
          padding: '20px'
        }}>
          <div style={{
            width: '100%', maxWidth: '780px',
            background: '#0a0e17',
            border: '1px solid #334155',
            borderRadius: '12px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.85), 0 0 30px rgba(239, 68, 68, 0.15)',
            overflow: 'hidden',
            display: 'flex', flexDirection: 'column'
          }}>
            {/* Terminal Window Title Bar */}
            <div style={{
              background: '#111827',
              padding: '12px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #1f2937'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }}></span>
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }}></span>
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                <span className="font-mono" style={{ fontSize: '0.78rem', color: '#9ca3af', marginLeft: '8px' }}>
                  root@redteam-c2: ~/c2_harness/exploit_runner.sh
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: terminalRunning ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                  color: terminalRunning ? '#f87171' : '#34d399',
                  border: terminalRunning ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)'
                }}>
                  {terminalRunning ? "EXPLOIT INJECTION IN PROGRESS (3-5s)" : "SIMULATION CONCLUDED"}
                </span>
              </div>
            </div>

            {/* Progress Gauge */}
            <div style={{ height: '4px', background: '#1f2937', width: '100%', position: 'relative' }}>
              <div style={{
                height: '100%',
                width: `${terminalProgress}%`,
                background: terminalResult?.status === 'APPROVED' ? '#10b981' : terminalResult?.status === 'DETECTED' ? '#f59e0b' : '#ef4444',
                transition: 'width 0.6s ease'
              }} />
            </div>

            {/* Terminal Screen Body */}
            <div className="font-mono" style={{
              padding: '20px',
              minHeight: '260px',
              maxHeight: '340px',
              overflowY: 'auto',
              fontSize: '0.82rem',
              lineHeight: 1.6,
              background: '#070b12',
              color: '#d1d5db',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              {terminalLogs.map((log, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <span style={{ color: '#64748b' }}>[{log.time}]</span>
                  <span style={{ color: log.color, fontWeight: 700, minWidth: '95px' }}>[{log.tag}]</span>
                  <span style={{ color: log.color || '#e2e8f0', wordBreak: 'break-word' }}>{log.text}</span>
                </div>
              ))}
              {terminalRunning && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8', marginTop: '6px' }}>
                  <span className="terminal-cursor">_</span> Injecting vector packets & analyzing defense barrier responses...
                </div>
              )}
            </div>

            {/* Terminal Outcome Resolution Card */}
            {!terminalRunning && terminalResult && (
              <div style={{
                padding: '16px 20px',
                background: terminalResult.status === 'APPROVED' ? 'rgba(16, 185, 129, 0.08)' : terminalResult.status === 'DETECTED' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.08)',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{
                    fontSize: '0.95rem',
                    fontWeight: 800,
                    color: terminalResult.status === 'APPROVED' ? '#34d399' : terminalResult.status === 'DETECTED' ? '#fbbf24' : '#f87171',
                    display: 'flex', alignItems: 'center', gap: '8px'
                  }}>
                    {terminalResult.status === 'APPROVED' && <ShieldCheck size={18} color="#34d399" />}
                    {terminalResult.status === 'BLOCKED' && <ShieldAlert size={18} color="#ef4444" />}
                    {terminalResult.status === 'DETECTED' && <AlertTriangle size={18} color="#fbbf24" />}
                    {terminalResult.status === 'APPROVED' && "EXPLOIT OUTCOME: BYPASS SUCCESSFUL (FUNDS EXFILTRATED)"}
                    {terminalResult.status === 'BLOCKED' && "EXPLOIT OUTCOME: INTERCEPTED BY BANK DEFENSES"}
                    {terminalResult.status === 'DETECTED' && "EXPLOIT OUTCOME: DETECTED BACK BY BANK SOC HONEYPOT"}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '3px' }}>
                    {terminalResult.status === 'APPROVED' && `Target card balance siphoned. Transaction cryptographically mined into Blockchain Block #${terminalResult.block_index}.`}
                    {terminalResult.status === 'BLOCKED' && `Bank anomaly barriers intercepted transaction. Risk score: ${terminalResult.risk_score}%.`}
                    {terminalResult.status === 'DETECTED' && `The bank traced origin connection back and automatically added IP ${terminalResult.feature_metrics?.ip_address || customIp} to SOC Blacklist.`}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => {
                      setShowTerminal(false);
                      advanceToNextStep(3);
                    }}
                    className="btn-primary"
                    style={{ fontSize: '0.8rem', padding: '8px 14px' }}
                  >
                    View Telemetry in Stage 3 <ArrowRight size={14} />
                  </button>
                  <button
                    onClick={() => setShowTerminal(false)}
                    className="btn-secondary"
                    style={{ fontSize: '0.8rem', padding: '8px 14px' }}
                  >
                    Close Terminal
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
