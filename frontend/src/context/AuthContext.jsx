import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('fraud_detect_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [activeTab, setActiveTab] = useState(() => {
    const saved = localStorage.getItem('fraud_detect_user');
    if (saved) {
      const u = JSON.parse(saved);
      if (u.role === 'customer') return 'customer_portal';
      if (u.role === 'attacker') return 'attacker_sandbox';
      return 'manager_dashboard';
    }
    return 'login';
  });

  // Forward-only workflow tracking for each role
  // step 1: Setup / Select -> step 2: Execute / Process -> step 3: Results & Proof
  const [roleStep, setRoleStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState([1]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('fraud_detect_user', JSON.stringify(user));
      if (user.role === 'customer') setActiveTab('customer_portal');
      else if (user.role === 'attacker') setActiveTab('attacker_sandbox');
      else setActiveTab('manager_dashboard');
      setRoleStep(1);
      setCompletedSteps([1]);
    } else {
      localStorage.removeItem('fraud_detect_user');
      setActiveTab('login');
      setRoleStep(1);
      setCompletedSteps([1]);
    }
  }, [user]);

  const loginWithCredentials = async (username, password) => {
    const res = await axios.post('http://127.0.0.1:8000/api/auth/login', {
      username: username.trim(),
      password: password.trim()
    });
    setUser(res.data);
    return res.data;
  };

  const quickLoginRole = async (role) => {
    const res = await axios.post('http://127.0.0.1:8000/api/auth/login', {
      username: '',
      password: '',
      quick_role: role
    });
    setUser(res.data);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('fraud_detect_user');
    setUser(null);
    setActiveTab('login');
    setRoleStep(1);
    setCompletedSteps([1]);
  };

  // Forward-only navigation step progression
  const advanceToNextStep = (nextStepNumber) => {
    const target = nextStepNumber || (roleStep + 1);
    setCompletedSteps(prev => Array.from(new Set([...prev, roleStep, target])));
    setRoleStep(target);
  };

  const resetRoleWorkflow = () => {
    setRoleStep(1);
    setCompletedSteps([1]);
  };

  return (
    <AuthContext.Provider value={{
      user,
      activeTab,
      setActiveTab,
      roleStep,
      setRoleStep,
      completedSteps,
      advanceToNextStep,
      resetRoleWorkflow,
      loginWithCredentials,
      quickLoginRole,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
