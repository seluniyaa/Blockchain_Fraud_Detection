import React from 'react';
import { ShieldCheck, LogOut, Lock, Server } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 28px',
      background: '#0d1322',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      {/* Brand Header - Research Level Master Project Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '8px',
          background: '#1e293b',
          border: '1px solid #334155',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#60a5fa'
        }}>
          <ShieldCheck size={22} />
        </div>
        <div>
          <h1 style={{
            fontSize: '1.15rem',
            fontWeight: 700,
            letterSpacing: '0.1px',
            color: '#f8fafc',
            margin: 0
          }}>
            Blockchain-Based Credit Card Fraud Detection System
          </h1>
        </div>
      </div>

      {/* User / Role Session Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(255, 255, 255, 0.04)',
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}>
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f1f5f9' }}>
                  {user.full_name}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Role: <span style={{
                    color: user.role === 'customer' ? '#60a5fa' : user.role === 'attacker' ? '#f87171' : '#34d399',
                    fontWeight: 700
                  }}>{user.role}</span>
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              className="btn-secondary"
              title="Sign Out to Login Gateway"
              style={{ padding: '7px 12px', fontSize: '0.78rem' }}
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '6px',
            padding: '5px 12px',
            color: '#94a3b8',
            fontSize: '0.75rem',
            fontWeight: 500
          }}>
            <Lock size={13} /> Authentication Gateway
          </div>
        )}
      </div>
    </header>
  );
};
