import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Menu, Search, Database, User, Shield, CheckCircle2 } from 'lucide-react';

export default function Header({ currentView, setCurrentView, setIsMobileOpen, onQuickTrack }) {
  const { user, isAdmin } = useAuth();
  const [quickTrackQuery, setQuickTrackQuery] = useState('');

  const titles = {
    dashboard: 'Admin Dashboard Overview',
    customers: 'Customer Management',
    products: 'Product Inventory & Stock',
    orders: 'Sales Order Processing',
    shipments: 'Shipment & Courier Management',
    tracking: 'Real-Time Shipment Tracking',
    reports: 'Executive Reports & Analytics',
    'customer-portal': 'Customer Order & Delivery Portal'
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (quickTrackQuery.trim()) {
      if (onQuickTrack) {
        onQuickTrack(quickTrackQuery.trim());
      } else {
        setCurrentView('tracking');
      }
      setQuickTrackQuery('');
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsMobileOpen(true)}
          className="p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-lg lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
            {titles[currentView] || 'Shipment & Sales Tracking System'}
          </h2>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>SE Capstone Project</span>
            <span>•</span>
            <span className="flex items-center gap-1 text-emerald-600 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              MySQL Connected
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Quick Track Input */}
        <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Quick track (e.g. TRK-...)"
            value={quickTrackQuery}
            onChange={(e) => setQuickTrackQuery(e.target.value)}
            className="w-56 lg:w-64 pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
          />
        </form>

        {/* User badge */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-semibold">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold text-slate-800 leading-none">{user?.name}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mt-0.5">
              {isAdmin ? 'Admin' : (user?.customer_company || 'Customer')}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
