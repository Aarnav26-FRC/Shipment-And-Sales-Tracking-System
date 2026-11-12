import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Shipments from './pages/Shipments';
import Tracking from './pages/Tracking';
import Reports from './pages/Reports';
import CustomerPortal from './pages/CustomerPortal';

function AppContent() {
  const { isAuthenticated, loading, isAdmin, isCustomer } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [targetTrackingId, setTargetTrackingId] = useState('');

  // Default view according to role
  useEffect(() => {
    if (isAuthenticated) {
      if (isCustomer) {
        setCurrentView('customer-portal');
      } else {
        setCurrentView('dashboard');
      }
    }
  }, [isAuthenticated, isCustomer]);

  const handleSelectTracking = (trackingNumber) => {
    setTargetTrackingId(trackingNumber);
    setCurrentView('tracking');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          <p className="text-xs text-slate-400 font-medium">Initializing TrackMaster System...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Main Body Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0 min-h-screen">
        <Header
          currentView={currentView}
          setCurrentView={setCurrentView}
          setIsMobileOpen={setIsMobileOpen}
          onQuickTrack={handleSelectTracking}
        />

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {currentView === 'dashboard' && (
            <Dashboard
              setCurrentView={setCurrentView}
              onSelectTracking={handleSelectTracking}
            />
          )}
          {currentView === 'customers' && <Customers />}
          {currentView === 'products' && <Products />}
          {currentView === 'orders' && (
            <Orders
              onSelectTracking={handleSelectTracking}
            />
          )}
          {currentView === 'shipments' && (
            <Shipments
              onSelectTracking={handleSelectTracking}
            />
          )}
          {currentView === 'tracking' && (
            <Tracking
              initialTrackingNumber={targetTrackingId}
            />
          )}
          {currentView === 'reports' && <Reports />}
          {currentView === 'customer-portal' && (
            <CustomerPortal
              setCurrentView={setCurrentView}
              onSelectTracking={handleSelectTracking}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
