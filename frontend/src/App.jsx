import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';

import { LoginPage } from './pages/LoginPage';
import { CustomerPage } from './pages/CustomerPage';
import { AttackerPage } from './pages/AttackerPage';
import { ManagerDashboard } from './pages/ManagerDashboard';
import { BlockchainExplorer } from './pages/BlockchainExplorer';

const MainLayout = () => {
  const { user, activeTab } = useAuth();

  // If user is not authenticated, display dedicated Login Page with global project title header
  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#0b0f19' }}>
        <Navbar />
        <main style={{ flex: 1, padding: '20px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
          <LoginPage />
        </main>
      </div>
    );
  }

  const renderActivePage = () => {
    if (activeTab === 'blockchain_explorer' && user.role === 'manager') {
      return <BlockchainExplorer />;
    }

    switch (user.role) {
      case 'customer':
        return <CustomerPage />;
      case 'attacker':
        return <AttackerPage />;
      case 'manager':
      default:
        return <ManagerDashboard />;
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#0b0f19' }}>
      <Navbar />
      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar />
        <main style={{ flex: 1, padding: '28px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
          {renderActivePage()}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
