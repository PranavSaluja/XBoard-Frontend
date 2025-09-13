'use client';

import { useState, useEffect } from 'react';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import Dashboard from './components/Dashboard';

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('authToken');
    if (token) {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const handleLoginSuccess = (token: string) => {
    localStorage.setItem('authToken', token);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setIsAuthenticated(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading XBoard...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        {showRegister ? (
          <RegisterForm 
            onSuccess={handleLoginSuccess}
            onSwitchToLogin={() => setShowRegister(false)}
          />
        ) : (
          <LoginForm 
            onSuccess={handleLoginSuccess}
            onSwitchToRegister={() => setShowRegister(true)}
          />
        )}
      </div>
    );
  }

  return <Dashboard onLogout={handleLogout} />;
}