import React, { useState, useEffect } from 'react';
import { CreditCard, DollarSign, ShoppingBag, MapPin, CheckCircle2, ShieldAlert, Plus, Copy, Check, Lock, Unlock, Shield, ArrowRight, RefreshCw, FileText, CheckCircle, AlertTriangle, RotateCcw, X, ShieldCheck } from 'lucide-react';
import axios from 'axios';
import { RiskBadge } from '../components/RiskBadge';
import { useAuth } from '../context/AuthContext';

export const CustomerPage = () => {
  const { user, roleStep, setRoleStep, advanceToNextStep, resetRoleWorkflow } = useAuth();
  
  const [cards, setCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  
  const [merchant, setMerchant] = useState('Apple Store Fifth Ave');
  const [amount, setAmount] = useState(1299.00);
  const [location, setLocation] = useState('US');
  const [loading, setLoading] = useState(false);
  const [recentTxs, setRecentTxs] = useState([]);
  const [lastPaymentResult, setLastPaymentResult] = useState(null);

  // Card defense settings state
  const [cardLocked, setCardLocked] = useState(false);
  const [geofenceCountry, setGeofenceCountry] = useState('US');
  const [dailyLimit, setDailyLimit] = useState(3500.0);
  const [blockMicroTx, setBlockMicroTx] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [updatingDefense, setUpdatingDefense] = useState(false);

  // Cardholder password confirmation state
  const [confirmationPassword, setConfirmationPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Card application modal state
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [newCardName, setNewCardName] = useState(user?.full_name || 'Alice Smith');
  const [newCardType, setNewCardType] = useState('Visa Signature');
  const [newCardLimit, setNewCardLimit] = useState(5000.0);
  const [appPassword, setAppPassword] = useState('');
  const [appPasswordError, setAppPasswordError] = useState('');
  const [submittingApp, setSubmittingApp] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);

  const [copiedHash, setCopiedHash] = useState(false);

  // Customer Fraud Dispute Modal State
  const [disputes, setDisputes] = useState([]);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [selectedDisputeTx, setSelectedDisputeTx] = useState(null);
  const [disputeReason, setDisputeReason] = useState('Unauthorized transaction - I did not make or authorize this purchase');
  const [disputePassword, setDisputePassword] = useState('');
  const [disputePasswordError, setDisputePasswordError] = useState('');
  const [submittingDispute, setSubmittingDispute] = useState(false);
  const [statementFilter, setStatementFilter] = useState('ALL'); // 'ALL' or 'MY_CARDS'

  const API_BASE = 'http://127.0.0.1:8000/api/customer';

  useEffect(() => {
    fetchCustomerCards();
    fetchTransactions();
    fetchPendingRequests();
    fetchDisputes();
    if (user?.full_name) {
      setNewCardName(user.full_name);
    }

    // Auto-refresh customer statement & telemetry every 4 seconds so attacks appear in real-time
    const interval = setInterval(() => {
      fetchTransactions();
      fetchDisputes();
      fetchCustomerCards();
    }, 4000);

    return () => clearInterval(interval);
  }, [user, statementFilter]);

  const fetchDisputes = async () => {
    try {
      const res = await axios.get(`${API_BASE}/disputes/${user?.user_id || 1}`);
      setDisputes(res.data || []);
    } catch (e) {
      console.error("Disputes fetch error:", e);
    }
  };

  const handleOpenDisputeModal = (tx) => {
    setSelectedDisputeTx(tx);
    setDisputeReason('Unauthorized transaction - I did not make or authorize this purchase');
    setDisputePassword('');
    setDisputePasswordError('');
    setShowDisputeModal(true);
  };

  const handleSubmitDispute = async (e) => {
    e.preventDefault();
    if (!disputePassword) {
      setDisputePasswordError("Customer confirmation password required to submit dispute.");
      return;
    }
    setDisputePasswordError('');
    setSubmittingDispute(true);
    try {
      const res = await axios.post(`${API_BASE}/disputes`, {
        user_id: user?.user_id || 1,
        card_number: selectedDisputeTx.card_number,
        tx_hash: selectedDisputeTx.tx_hash,
        merchant: selectedDisputeTx.merchant,
        amount: parseFloat(selectedDisputeTx.amount),
        reason: disputeReason,
        confirmation_password: disputePassword
      });
      alert(res.data.message);
      setShowDisputeModal(false);
      await fetchDisputes();
      await fetchTransactions();
      await fetchCustomerCards();
    } catch (err) {
      setDisputePasswordError(err.response?.data?.detail || "Dispute failed: Invalid confirmation password.");
    } finally {
      setSubmittingDispute(false);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const res = await axios.get(`${API_BASE}/card-requests/${user?.user_id || 1}`);
      setPendingRequests(res.data || []);
    } catch (e) {
      console.error("Card requests fetch error:", e);
    }
  };

  const fetchCustomerCards = async () => {
    try {
      const res = await axios.get(`${API_BASE}/cards/${user?.user_id || 1}`);
      setCards(res.data || []);
      if (res.data && res.data.length > 0) {
        const active = res.data[0];
        setSelectedCard(active);
        syncDefenseState(active);
      }
    } catch (e) {
      console.error("Card fetch error:", e);
    }
  };

  const syncDefenseState = (card) => {
    if (!card) return;
    setCardLocked(card.card_locked === 1);
    setGeofenceCountry(card.geofence_country || 'US');
    setDailyLimit(card.daily_limit || 3500.0);
    setBlockMicroTx(card.block_micro_tx === 1);
    setMfaRequired(card.mfa_required === 1);
  };

  const handleSelectCard = (card) => {
    setSelectedCard(card);
    syncDefenseState(card);
  };

  const fetchTransactions = async () => {
    try {
      const url = statementFilter === 'MY_CARDS'
        ? `${API_BASE}/transactions?user_id=${user?.user_id || 1}`
        : `${API_BASE}/transactions`;
      const res = await axios.get(url);
      setRecentTxs(res.data || []);
    } catch (e) {
      console.error("Transactions fetch error:", e);
    }
  };

  const handleSaveCardDefensesAndAdvance = async () => {
    if (!selectedCard) return;
    if (!confirmationPassword) {
      setPasswordError("Cardholder authorization password is required to save security rules.");
      return;
    }

    setPasswordError('');
    setUpdatingDefense(true);

    try {
      await axios.post(`${API_BASE}/card-security`, {
        card_number: selectedCard.card_number,
        confirmation_password: confirmationPassword,
        card_locked: cardLocked ? 1 : 0,
        geofence_country: geofenceCountry,
        daily_limit: parseFloat(dailyLimit),
        block_micro_tx: blockMicroTx ? 1 : 0,
        mfa_required: mfaRequired ? 1 : 0
      });

      fetchCustomerCards();
      advanceToNextStep(2);
    } catch (e) {
      setPasswordError(e.response?.data?.detail || "Security Authorization Failed: Invalid cardholder password.");
    } finally {
      setUpdatingDefense(false);
    }
  };

  const handlePay = async (e) => {
    e.preventDefault();
    if (!selectedCard) return alert("Please select or issue a card.");
    setLoading(true);
    setLastPaymentResult(null);

    try {
      const res = await axios.post(`${API_BASE}/pay`, {
        card_number: selectedCard.card_number,
        merchant: merchant,
        amount: parseFloat(amount),
        location: location,
        ip_address: selectedCard.home_ip || "192.168.1.100"
      });

      setLastPaymentResult(res.data);
      fetchCustomerCards();
      fetchTransactions();
      // Forward-only advancement to Step 3: Blockchain Receipt & Proof
      advanceToNextStep(3);
    } catch (e) {
      alert("Payment processing error: " + (e.response?.data?.detail || e.message));
    } finally {
      setLoading(false);
    }
  };

  const handleApplyForCard = async (e) => {
    e.preventDefault();
    if (!appPassword) {
      setAppPasswordError("Cardholder authorization password is required to submit application.");
      return;
    }
    setAppPasswordError('');
    setSubmittingApp(true);
    try {
      const res = await axios.post(`${API_BASE}/request-card`, {
        user_id: user?.user_id || 1,
        holder_name: newCardName,
        card_type: newCardType,
        requested_limit: parseFloat(newCardLimit),
        confirmation_password: appPassword
      });
      alert(res.data.message);
      setShowAddCardModal(false);
      setAppPassword('');
      fetchPendingRequests();
    } catch (e) {
      setAppPasswordError(e.response?.data?.detail || "Application submission failed: " + e.message);
    } finally {
      setSubmittingApp(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Forward Workflow Step Tracker */}
      <div className="glass-panel" style={{
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderLeft: '3px solid #3b82f6',
        borderRadius: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {[
            { num: 1, name: 'Card Security Controls' },
            { num: 2, name: 'Payment Terminal' },
            { num: 3, name: 'Transaction Statement' }
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
                background: roleStep === st.num ? 'rgba(37, 99, 235, 0.2)' : 'transparent',
                border: roleStep === st.num ? '1px solid #3b82f6' : '1px solid transparent',
                transition: 'all 0.15s ease'
              }}
              title={`Jump to ${st.name}`}
            >
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: roleStep === st.num ? '#2563eb' : '#1e293b',
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

      {/* STAGE 1: CARD & PREBUILT DEFENSE SETUP */}
      {roleStep === 1 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.2fr', gap: '20px' }}>
          
          {/* Left Column: Visual Card & Card Switcher */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={18} color="#60a5fa" /> Registered Card Accounts ({cards.length})
              </h3>
              <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '6px' }} onClick={() => setShowAddCardModal(true)}>
                <Plus size={13} /> Request New Card
              </button>
            </div>

            {selectedCard && (
              <div style={{
                background: cardLocked ? '#2e1515' : '#1e293b',
                borderRadius: '12px',
                padding: '24px',
                color: '#f8fafc',
                border: cardLocked ? '1px solid #7f1d1d' : '1px solid #334155',
                position: 'relative',
                boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: cardLocked ? '#f87171' : '#94a3b8' }}>
                    {cardLocked ? "CARD AUTHORIZATION FROZEN" : selectedCard.card_number.startsWith('5') ? "MASTERCARD WORLD" : "VISA CORPORATE"}
                  </span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, fontStyle: 'italic', color: '#f1f5f9' }}>
                    {selectedCard.card_number.startsWith('5') ? "Mastercard" : "VISA"}
                  </span>
                </div>

                <div className="font-mono" style={{ fontSize: '1.25rem', letterSpacing: '2px', marginBottom: '24px', color: '#f8fafc' }}>
                  {selectedCard.card_number}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#94a3b8' }}>Cardholder</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: '2px' }}>{selectedCard.holder_name}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#94a3b8' }}>Geofence Policy</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '2px', color: '#fbbf24' }}>{geofenceCountry} Region</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#94a3b8' }}>Available Balance</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#34d399', marginTop: '2px' }}>
                      ${selectedCard.balance?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Pending Application Notice if present */}
            {pendingRequests.filter(r => r.status === 'PENDING_APPROVAL').length > 0 && (
              <div style={{
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                borderRadius: '8px',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#fef3c7' }}>
                    Card Application: {pendingRequests.find(r => r.status === 'PENDING_APPROVAL')?.card_type} (${pendingRequests.find(r => r.status === 'PENDING_APPROVAL')?.requested_limit?.toLocaleString()})
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#fcd34d' }}>
                    Status: Awaiting Bank Manager Review & Approval
                  </div>
                </div>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24' }}>
                  PENDING
                </span>
              </div>
            )}
          </div>

          {/* Right Column: Prebuilt Customer Defense Controls */}
          <div className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid #3b82f6', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ marginBottom: '4px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Shield size={18} color="#3b82f6" /> Card Security Policies
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {cardLocked ? <Lock size={15} color="#ef4444" /> : <Unlock size={15} color="#10b981" />} Card Freeze Lock
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>Temporarily block all incoming authorizations</div>
                </div>
                <input
                  type="checkbox"
                  checked={cardLocked}
                  onChange={(e) => setCardLocked(e.target.checked)}
                  style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#3b82f6' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <label style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>Regional Authorization Lock</label>
                  <select
                    value={geofenceCountry}
                    onChange={(e) => setGeofenceCountry(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', background: '#1e293b', border: '1px solid #334155', color: '#fff', fontSize: '0.82rem' }}
                  >
                    <option value="US">US Only (Deny Foreign)</option>
                    <option value="UK">UK Only (Deny Foreign)</option>
                    <option value="ANY">Global (Any Region)</option>
                  </select>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <label style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>Daily Spending Limit ($)</label>
                  <input
                    type="number"
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', background: '#1e293b', border: '1px solid #334155', color: '#fff', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>Block Micro-Authorizations (&le; $3.00)</div>
                  <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>Mitigate automated card validation and credential stuffing sweeps</div>
                </div>
                <input
                  type="checkbox"
                  checked={blockMicroTx}
                  onChange={(e) => setBlockMicroTx(e.target.checked)}
                  style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#3b82f6' }}
                />
              </div>

              {/* Password Authorization Box */}
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                padding: '12px 16px',
                borderRadius: '8px',
                border: passwordError ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.08)'
              }}>
                <label style={{ fontSize: '0.78rem', color: '#f8fafc', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <Lock size={13} color="#60a5fa" /> Cardholder Authorization Password
                </label>
                <input
                  type="password"
                  placeholder="Enter cardholder password"
                  value={confirmationPassword}
                  onChange={(e) => {
                    setConfirmationPassword(e.target.value);
                    setPasswordError('');
                  }}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '6px',
                    background: '#1e293b',
                    border: '1px solid #334155',
                    color: '#fff',
                    fontSize: '0.82rem'
                  }}
                />
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '5px' }}>
                  Hint: <code>{user?.username ? `${user.username}123` : 'alice123'}</code> (Required to authorize security policy updates)
                </div>
                {passwordError && (
                  <div style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '5px', fontWeight: 500 }}>
                    {passwordError}
                  </div>
                )}
              </div>

              {/* Forward Navigation Action Button */}
              <button
                onClick={handleSaveCardDefensesAndAdvance}
                disabled={updatingDefense}
                className="btn-primary"
                style={{
                  padding: '11px',
                  fontSize: '0.88rem',
                  borderRadius: '8px',
                  justifyContent: 'center',
                  marginTop: '2px'
                }}
              >
                {updatingDefense ? "Saving Rules..." : "Save Policies & Continue"} <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STAGE 2: REAL-TIME PAYMENT TERMINAL */}
      {roleStep === 2 && (
        <div style={{ maxWidth: '780px', margin: '0 auto', width: '100%' }}>
          <div className="glass-panel" style={{ padding: '32px' }}>
            <div style={{ marginBottom: '22px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingBag size={22} color="#3b82f6" /> Payment Terminal
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: '4px' }}>
                Target Account: <strong className="font-mono" style={{ color: '#fff' }}>{selectedCard?.card_number}</strong> ({selectedCard?.holder_name}).
              </p>
            </div>

            <form onSubmit={handlePay} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>Merchant / Vendor Destination</label>
                <select
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#fff', fontSize: '0.9rem' }}
                >
                  <option value="Apple Store Fifth Ave" style={{ background: '#111' }}>Apple Store Fifth Ave ($1,299.00)</option>
                  <option value="Amazon Web Services" style={{ background: '#111' }}>Amazon Web Services Cloud ($249.00)</option>
                  <option value="Starbucks Coffee #4920" style={{ background: '#111' }}>Starbucks Coffee ($14.75)</option>
                  <option value="Delta Air Lines Ticket" style={{ background: '#111' }}>Delta Air Lines Flight ($580.00)</option>
                  <option value="Binance Crypto Exchange" style={{ background: '#111' }}>Binance Crypto Exchange ($3,500.00)</option>
                  <option value="Nordstrom Department Store" style={{ background: '#111' }}>Nordstrom Apparel ($340.50)</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>Payment Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#fff', fontSize: '0.9rem' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>Point-of-Sale Location</label>
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#fff', fontSize: '0.9rem' }}
                  >
                    <option value="US" style={{ background: '#111' }}>United States (Home Region)</option>
                    <option value="UK" style={{ background: '#111' }}>United Kingdom (Foreign)</option>
                    <option value="RU" style={{ background: '#111' }}>Russia (Foreign / Sanctioned)</option>
                    <option value="CN" style={{ background: '#111' }}>China (Foreign)</option>
                  </select>
                </div>
              </div>

              <div style={{
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '12px',
                padding: '14px 16px',
                fontSize: '0.8rem',
                color: '#bfdbfe',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <Shield size={20} color="#60a5fa" />
                <span>Real-time evaluation via ML anomaly score and card security policies. Verified transactions are sealed into SHA-256 ledger blocks.</span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '0.95rem', borderRadius: '8px' }}
              >
                {loading ? "Authorizing & Mining..." : "Authorize Payment"} <ArrowRight size={16} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* STAGE 3: DIGITAL BLOCKCHAIN RECEIPT & AUDIT PROOF */}
      {roleStep === 3 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.3fr', gap: '24px' }}>
          
          {/* Digital Receipt Card or Account Defense Overview */}
          {lastPaymentResult ? (
            <div className="glass-panel" style={{ padding: '28px', borderLeft: `4px solid ${lastPaymentResult?.status === 'APPROVED' ? '#10b981' : '#ef4444'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {lastPaymentResult?.status === 'APPROVED' ? <CheckCircle2 size={24} color="#10b981" /> : <ShieldAlert size={24} color="#ef4444" />}
                  Transaction {lastPaymentResult?.status}
                </h3>
                <RiskBadge score={lastPaymentResult.risk_score} status={lastPaymentResult.status} />
              </div>

              <div style={{ fontSize: '0.9rem', color: '#d1d5db', marginBottom: '16px', lineHeight: '1.5' }}>
                Transaction authorization request of <strong style={{ color: '#fff' }}>${lastPaymentResult?.amount?.toFixed(2)}</strong> at <strong style={{ color: '#fff' }}>{lastPaymentResult?.merchant}</strong> concluded with status: <strong style={{ color: lastPaymentResult?.status === 'APPROVED' ? '#34d399' : '#f87171' }}>{lastPaymentResult?.status}</strong>.
              </div>

              {/* Cryptographic Receipt Box */}
              <div style={{ background: 'rgba(0,0,0,0.5)', borderRadius: '10px', padding: '16px', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#9ca3af', marginBottom: '8px' }}>
                  <span>CRYPTOGRAPHIC AUDIT PROOF • BLOCK #{lastPaymentResult?.block_index}</span>
                  <span className="font-mono" style={{ color: '#f59e0b' }}>Nonce: {lastPaymentResult?.nonce}</span>
                </div>
                <div className="font-mono" style={{ fontSize: '0.75rem', color: '#60a5fa', wordBreak: 'break-all', marginBottom: '10px' }}>
                  Block Hash: {lastPaymentResult?.block_hash}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.04)', padding: '10px 14px', borderRadius: '8px' }}>
                  <span className="font-mono" style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                    TX Hash: {lastPaymentResult?.tx_hash?.slice(0, 26)}...
                  </span>
                  <button
                    onClick={() => copyToClipboard(lastPaymentResult?.tx_hash)}
                    style={{ background: 'transparent', border: 'none', color: copiedHash ? '#10b981' : '#60a5fa', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}
                  >
                    {copiedHash ? <Check size={14} /> : <Copy size={14} />} {copiedHash ? "Copied!" : "Copy Hash"}
                  </button>
                </div>
              </div>

              {/* Action to Start New Transaction (Cycle restart) */}
              <button
                onClick={resetRoleWorkflow}
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '12px', borderRadius: '8px', fontSize: '0.9rem' }}
              >
                <RefreshCw size={15} /> New Transaction
              </button>
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid #3b82f6', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    <CreditCard size={20} color="#60a5fa" /> Cardholder Account Telemetry
                  </h3>
                  <span style={{ fontSize: '0.72rem', color: '#10b981', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>
                    MONITORED
                  </span>
                </div>

                <div style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.5', marginBottom: '16px' }}>
                  Active cardholder: <strong style={{ color: '#fff' }}>{user?.full_name || 'Alice Smith'}</strong> ({selectedCard?.card_type || 'Visa Signature'}).
                  Available balance: <strong style={{ color: '#34d399' }}>${selectedCard?.balance?.toFixed(2) || '0.00'}</strong>.
                </div>

                <div style={{ background: 'rgba(0,0,0,0.35)', borderRadius: '8px', padding: '12px 14px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '16px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '6px' }}>
                    ACTIVE CARD DEFENSE POSTURE:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem', color: '#e2e8f0' }}>
                    <div>• Perimeter Lock: {selectedCard?.card_locked ? <span style={{ color: '#ef4444', fontWeight: 700 }}>FROZEN</span> : <span style={{ color: '#10b981', fontWeight: 600 }}>UNLOCKED</span>}</div>
                    <div>• Spending Ceiling: ${selectedCard?.daily_limit || 3500.0} USD / day</div>
                    <div>• Geofence Origin: {selectedCard?.geofence_country || 'US'}</div>
                    <div>• Micro-Fraud Filter: {selectedCard?.block_micro_tx ? "ENABLED (Auto-reject <= $3.00)" : "DISABLED"}</div>
                  </div>
                </div>

                <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontStyle: 'italic', marginBottom: '16px' }}>
                  All incoming transactions across the network (including red-team attacker exploits) are evaluated and streamed live on the right.
                </div>
              </div>

              <button
                onClick={() => setRoleStep(2)}
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '10px', borderRadius: '6px', fontSize: '0.85rem' }}
              >
                Go to Payment Terminal <ArrowRight size={14} />
              </button>
            </div>
          )}

          {/* Customer Audit Trail History & Dispute Center */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={18} color="#3b82f6" /> Account Statement & Dispute Center
                </h3>
                <p style={{ fontSize: '0.74rem', color: '#94a3b8', margin: '3px 0 0 0' }}>
                  Review settled ledger transactions. Report unrecognized charges to Bank SOC for immediate traceback and asset recovery.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.72rem', color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(16, 185, 129, 0.1)', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} /> Live Stream
                </span>
                <button
                  onClick={fetchTransactions}
                  className="btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  title="Force telemetry refresh"
                >
                  <RefreshCw size={11} /> Refresh
                </button>
                <span style={{ fontSize: '0.72rem', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)', padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
                  🛡️ Zero-Liability
                </span>
              </div>
            </div>

            {/* Statement Filter Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Filter Scope:</span>
              <button
                onClick={() => setStatementFilter('ALL')}
                style={{
                  padding: '3px 10px',
                  borderRadius: '4px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: statementFilter === 'ALL' ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
                  background: statementFilter === 'ALL' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                  color: statementFilter === 'ALL' ? '#93c5fd' : '#94a3b8'
                }}
              >
                All Network Activity ({recentTxs.length})
              </button>
              <button
                onClick={() => setStatementFilter('MY_CARDS')}
                style={{
                  padding: '3px 10px',
                  borderRadius: '4px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: statementFilter === 'MY_CARDS' ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
                  background: statementFilter === 'MY_CARDS' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                  color: statementFilter === 'MY_CARDS' ? '#93c5fd' : '#94a3b8'
                }}
              >
                My Account Cards Only
              </button>
            </div>

            <div style={{ overflowX: 'auto', maxHeight: '420px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', color: '#6b7280' }}>
                    <th style={{ padding: '10px' }}>Time</th>
                    <th style={{ padding: '10px' }}>Card</th>
                    <th style={{ padding: '10px' }}>Merchant</th>
                    <th style={{ padding: '10px' }}>Amount</th>
                    <th style={{ padding: '10px' }}>Category / Exploit</th>
                    <th style={{ padding: '10px' }}>Bank Decision</th>
                    <th style={{ padding: '10px' }}>Block #</th>
                    <th style={{ padding: '10px' }}>Security & Dispute Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTxs.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                        No transactions recorded in this scope yet.
                      </td>
                    </tr>
                  ) : (
                    recentTxs.map((tx) => {
                      const disp = disputes.find(d => d.tx_hash === tx.tx_hash);
                      const isExploit = tx.attack_type && tx.attack_type !== 'Legitimate';
                      const maskedCard = tx.card_number ? (tx.card_number.slice(0, 4) + "••" + tx.card_number.slice(-4)) : "••••";
                      const timeDisplay = tx.timestamp ? (tx.timestamp.includes(' ') ? tx.timestamp.split(' ')[1] : tx.timestamp) : '--:--';

                      return (
                        <tr key={tx.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '10px', color: '#94a3b8', fontSize: '0.74rem' }}>{timeDisplay}</td>
                          <td style={{ padding: '10px', color: '#cbd5e1', fontSize: '0.78rem' }} className="font-mono">{maskedCard}</td>
                          <td style={{ padding: '10px', color: '#fff', fontWeight: 500 }}>{tx.merchant}</td>
                          <td style={{ padding: '10px', color: '#fff', fontWeight: 700 }}>${tx.amount?.toFixed(2)}</td>
                          <td style={{ padding: '10px' }}>
                            {isExploit ? (
                              <span style={{
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                color: '#fbbf24',
                                background: 'rgba(245, 158, 11, 0.12)',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}>
                                ⚠️ {tx.attack_type}
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600 }}>
                                Retail Purchase
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '10px' }}>
                            <RiskBadge score={tx.risk_score} status={tx.status} />
                          </td>
                          <td style={{ padding: '10px', color: '#818cf8' }} className="font-mono">#{tx.block_index}</td>
                          <td style={{ padding: '10px' }}>
                            {disp ? (
                              disp.status === 'FUNDS_RECOVERED' ? (
                                <span style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  color: '#34d399',
                                  background: 'rgba(16, 185, 129, 0.15)',
                                  border: '1px solid rgba(16, 185, 129, 0.3)',
                                  padding: '3px 8px',
                                  borderRadius: '4px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}>
                                  <CheckCircle2 size={12} /> Restored (+${disp.recovered_amount?.toFixed(2)})
                                </span>
                              ) : disp.status === 'SINKHOLED' ? (
                                <span style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  color: '#38bdf8',
                                  background: 'rgba(56, 189, 248, 0.15)',
                                  border: '1px solid rgba(56, 189, 248, 0.3)',
                                  padding: '3px 8px',
                                  borderRadius: '4px'
                                }}>
                                  🛡️ Adversary Blacklisted
                                </span>
                              ) : disp.status === 'INVESTIGATING' ? (
                                <span style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  color: '#fbbf24',
                                  background: 'rgba(245, 158, 11, 0.15)',
                                  border: '1px solid rgba(245, 158, 11, 0.3)',
                                  padding: '3px 8px',
                                  borderRadius: '4px'
                                }}>
                                  🔍 SOC Traceback Active
                                </span>
                              ) : (
                                <span style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  color: '#fca5a5',
                                  background: 'rgba(239, 68, 68, 0.15)',
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  padding: '3px 8px',
                                  borderRadius: '4px'
                                }}>
                                  🚨 Dispute #{disp.id} Filed
                                </span>
                              )
                            ) : tx.status === 'BLOCKED' ? (
                              <span style={{
                                fontSize: '0.72rem',
                                color: '#34d399',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: 'rgba(16, 185, 129, 0.1)',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                border: '1px solid rgba(16, 185, 129, 0.25)'
                              }}>
                                <ShieldCheck size={12} /> Defended (Blocked)
                              </span>
                            ) : tx.status === 'APPROVED' && tx.merchant !== 'NETWORK_INITIALIZATION' && !tx.merchant?.startsWith('REFUND') ? (
                              <button
                                onClick={() => handleOpenDisputeModal(tx)}
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  background: 'rgba(239, 68, 68, 0.12)',
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  color: '#f87171',
                                  fontSize: '0.72rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <AlertTriangle size={12} /> Report Suspicious
                              </button>
                            ) : (
                              <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>Settled</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* Apply for Card Modal */}
      {showAddCardModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '28px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
              Apply for Additional Credit Card
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '18px', lineHeight: 1.4 }}>
              Submit card application for bank manager review. Approved accounts are provisioned to your profile.
            </p>
            <form onSubmit={handleApplyForCard} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Cardholder Legal Name</label>
                <input
                  type="text"
                  value={newCardName}
                  onChange={(e) => setNewCardName(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                  required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Card Product Tier</label>
                  <select
                    value={newCardType}
                    onChange={(e) => setNewCardType(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                  >
                    <option value="Visa Signature">Visa Signature</option>
                    <option value="Mastercard World Elite">Mastercard World Elite</option>
                    <option value="Amex Corporate Platinum">Amex Corporate Platinum</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Requested Limit ($)</label>
                  <input
                    type="number"
                    min="1000"
                    max="50000"
                    step="500"
                    value={newCardLimit}
                    onChange={(e) => setNewCardLimit(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Lock size={12} /> Confirm with Cardholder Password
                </label>
                <input
                  type="password"
                  placeholder="Enter your customer password"
                  value={appPassword}
                  onChange={(e) => {
                    setAppPassword(e.target.value);
                    setAppPasswordError('');
                  }}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.05)',
                    border: appPasswordError ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                    marginTop: '4px'
                  }}
                  required
                />
                <span style={{ fontSize: '0.72rem', color: '#6b7280', display: 'block', marginTop: '4px' }}>
                  Password hint: {user?.username || 'alice'}123
                </span>
                {appPasswordError && (
                  <div style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '4px' }}>
                    {appPasswordError}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowAddCardModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={submittingApp}>
                  {submittingApp ? "Submitting Application..." : "Submit Card Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report Suspicious Activity Modal */}
      {showDisputeModal && selectedDisputeTx && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '28px', position: 'relative' }}>
            <button
              onClick={() => setShowDisputeModal(false)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', margin: 0 }}>Report Unauthorized / Suspicious Charge</h3>
                <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '2px 0 0 0' }}>Alert Bank SOC Incident Response to trace the perpetrator and recover funds.</p>
              </div>
            </div>

            {/* Disputed Transaction Overview Box */}
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>Merchant:</span>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>{selectedDisputeTx.merchant}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>Disputed Amount:</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ef4444' }}>${selectedDisputeTx.amount?.toFixed(2)} USD</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>Card Number:</span>
                <span className="font-mono" style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>{selectedDisputeTx.card_number}</span>
              </div>
            </div>

            <form onSubmit={handleSubmitDispute} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.76rem', color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                  Incident Classification / Reason:
                </label>
                <select
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', color: '#fff', fontSize: '0.85rem' }}
                >
                  <option value="Unauthorized transaction - I did not make or authorize this purchase">Unauthorized charge - card was not used at this merchant</option>
                  <option value="Suspected fraudulent siphon / adversary account takeover">Suspected adversary siphon / unauthorized account drain</option>
                  <option value="Card stolen or credentials compromised">Card stolen or credentials leaked</option>
                  <option value="Merchant billed incorrect or duplicate amount">Incorrect or duplicate billing amount</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.76rem', color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                  Confirm with Customer Password:
                </label>
                <input
                  type="password"
                  value={disputePassword}
                  onChange={(e) => {
                    setDisputePassword(e.target.value);
                    setDisputePasswordError('');
                  }}
                  placeholder="Enter your customer password"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.05)',
                    border: disputePasswordError ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.12)',
                    color: '#fff',
                    fontSize: '0.85rem'
                  }}
                  required
                />
                <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginTop: '4px' }}>
                  Hint: <code>{user?.username || 'alice'}123</code>
                </span>
                {disputePasswordError && (
                  <div style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '4px' }}>
                    {disputePasswordError}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowDisputeModal(false)}>Cancel</button>
                <button
                  type="submit"
                  disabled={submittingDispute}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '8px',
                    background: '#dc2626',
                    border: '1px solid #ef4444',
                    color: '#fff',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {submittingDispute ? "Dispatching to SOC..." : "Submit Fraud Report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
