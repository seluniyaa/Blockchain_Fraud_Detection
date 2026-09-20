import React, { useState } from 'react';
import { Lock, User, KeyRound, AlertCircle, ArrowRight, ShieldCheck, UserCheck, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage = () => {
  const { loginWithCredentials, quickLoginRole } = useAuth();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleManualLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!username || !password) {
      setErrorMsg('Please enter both username and password.');
      return;
    }

    setLoading(true);
    try {
      await loginWithCredentials(username, password);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Invalid username or password credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (roleKey, defaultUser, defaultPass) => {
    setUsername(defaultUser);
    setPassword(defaultPass);
    setErrorMsg('');
    setLoading(true);
    try {
      await quickLoginRole(roleKey);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Quick authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '75vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '380px',
        padding: '28px 24px',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        background: '#111827',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)'
      }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '8px',
            background: '#1e293b',
            border: '1px solid #334155',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '10px',
            color: '#60a5fa'
          }}>
            <Lock size={20} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
            System Authentication
          </h2>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#fca5a5',
            padding: '9px 12px',
            borderRadius: '6px',
            fontSize: '0.78rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px'
          }}>
            <AlertCircle size={15} color="#ef4444" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Normal Form */}
        <form onSubmit={handleManualLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '5px' }}>
              Username
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 36px',
                  borderRadius: '6px',
                  background: '#0b0f19',
                  border: '1px solid #334155',
                  color: '#f8fafc',
                  fontSize: '0.85rem'
                }}
                required
              />
              <User size={15} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '5px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 36px',
                  borderRadius: '6px',
                  background: '#0b0f19',
                  border: '1px solid #334155',
                  color: '#f8fafc',
                  fontSize: '0.85rem'
                }}
                required
              />
              <KeyRound size={15} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '10px',
              fontSize: '0.88rem',
              borderRadius: '6px',
              marginTop: '4px'
            }}
          >
            {loading ? "Authenticating..." : "Sign In"} <ArrowRight size={15} />
          </button>
        </form>

        {/* Small Quick Role Box Below Login */}
        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '6px' }}>
            <button
              type="button"
              onClick={() => handleQuickLogin('alice', 'alice', 'alice123')}
              style={{
                padding: '6px 4px',
                borderRadius: '6px',
                border: '1px solid #334155',
                background: 'rgba(255, 255, 255, 0.03)',
                color: '#cbd5e1',
                fontSize: '0.74rem',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                transition: 'all 0.15s ease'
              }}
              title="Authenticate as Customer: Alice Smith ($14,250 limit)"
            >
              <UserCheck size={12} color="#60a5fa" /> Alice
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('marcus', 'marcus', 'marcus123')}
              style={{
                padding: '6px 4px',
                borderRadius: '6px',
                border: '1px solid #334155',
                background: 'rgba(255, 255, 255, 0.03)',
                color: '#cbd5e1',
                fontSize: '0.74rem',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                transition: 'all 0.15s ease'
              }}
              title="Authenticate as Customer: Marcus Vance ($18,200 limit)"
            >
              <UserCheck size={12} color="#60a5fa" /> Marcus
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('elena', 'elena', 'elena123')}
              style={{
                padding: '6px 4px',
                borderRadius: '6px',
                border: '1px solid #334155',
                background: 'rgba(255, 255, 255, 0.03)',
                color: '#cbd5e1',
                fontSize: '0.74rem',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                transition: 'all 0.15s ease'
              }}
              title="Authenticate as Customer: Elena Rostova ($6,800 limit)"
            >
              <UserCheck size={12} color="#60a5fa" /> Elena
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <button
              type="button"
              onClick={() => handleQuickLogin('attacker', 'attacker', 'attacker123')}
              style={{
                padding: '6px 4px',
                borderRadius: '6px',
                border: '1px solid #334155',
                background: 'rgba(255, 255, 255, 0.03)',
                color: '#cbd5e1',
                fontSize: '0.74rem',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                transition: 'all 0.15s ease'
              }}
              title="Authenticate as Attacker (adversary sandbox)"
            >
              <Zap size={12} color="#f87171" /> Attacker
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('manager', 'manager', 'manager123')}
              style={{
                padding: '6px 4px',
                borderRadius: '6px',
                border: '1px solid #334155',
                background: 'rgba(255, 255, 255, 0.03)',
                color: '#cbd5e1',
                fontSize: '0.74rem',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                transition: 'all 0.15s ease'
              }}
              title="Authenticate as Manager (SOC operations)"
            >
              <ShieldCheck size={12} color="#34d399" /> Manager
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
