import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  Truck,
  MapPin,
  BarChart3,
  LogOut,
  ShieldCheck,
  Building2,
  Boxes
} from 'lucide-react';

export default function Sidebar({ currentView, setCurrentView, isMobileOpen, setIsMobileOpen }) {
  const { user, isAdmin, isCustomer, logout } = useAuth();

  const adminNav = [
    { id: 'dashboard', label: 'Admin Dashboard', icon: LayoutDashboard },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'products', label: 'Product Inventory', icon: Package },
    { id: 'orders', label: 'Sales Orders', icon: ShoppingCart },
    { id: 'shipments', label: 'Shipments', icon: Truck },
    { id: 'tracking', label: 'Live Tracking', icon: MapPin },
    { id: 'reports', label: 'Analytics & Reports', icon: BarChart3 },
  ];

  const customerNav = [
    { id: 'customer-portal', label: 'Customer Portal', icon: LayoutDashboard },
    { id: 'orders', label: 'My Orders', icon: ShoppingCart },
    { id: 'shipments', label: 'My Shipments', icon: Truck },
    { id: 'tracking', label: 'Track Shipment', icon: MapPin },
  ];

  const navItems = isAdmin ? adminNav : customerNav;

  const handleNavClick = (id) => {
    setCurrentView(id);
    if (setIsMobileOpen) setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 text-slate-200 flex flex-col border-r border-slate-800 transition-transform duration-200 ease-in-out
        lg:translate-x-0 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Brand header */}
        <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800 bg-slate-950/40">
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white uppercase">TrackMaster</h1>
            <p className="text-[10px] tracking-wider text-slate-400 uppercase font-medium">Shipment & Sales SE</p>
          </div>
        </div>

        {/* Navigation list */}
        <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            {isAdmin ? 'System Administration' : 'Customer Account'}
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 text-left
                  ${isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }
                `}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* User Profile & Logout */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/30">
          <div className="p-2.5 rounded-lg bg-slate-800/60 mb-2">
            <div className="flex items-center gap-2">
              {isAdmin ? (
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <Building2 className="w-4 h-4 text-blue-400 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
                <p className="text-[11px] text-slate-400 truncate">
                  {user?.customer_company || (isAdmin ? 'Administrator' : user?.email)}
                </p>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px]">
              <span className={`
                inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium uppercase
                ${isAdmin ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}
              `}>
                {user?.role}
              </span>
              <span className="text-slate-400">MySQL Active</span>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-300 hover:bg-rose-950/30 border border-slate-800 hover:border-rose-900/50 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
