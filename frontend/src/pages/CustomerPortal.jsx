import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import {
  Building2,
  ShoppingCart,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  Eye,
  DollarSign
} from 'lucide-react';

export default function CustomerPortal({ setCurrentView, onSelectTracking }) {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomerDashboard();
  }, []);

  const fetchCustomerDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.getDashboard();
      if (res.success) {
        setDashboardData(res);
      }
    } catch (err) {
      console.error('Failed to load customer dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  const m = dashboardData?.metrics || {};

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Enterprise Customer Portal</span>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">
            Welcome, {user?.name}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Account: <span className="font-semibold text-slate-800">{user?.customer_company || 'Corporate Partner'}</span> &bull; {user?.email}
          </p>
        </div>

        <button
          onClick={() => setCurrentView('tracking')}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Truck className="w-4 h-4" />
          <span>Track Any Package</span>
        </button>
      </div>

      {/* Customer Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">My Sales Orders</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{m.total_orders ?? 0}</p>
          <p className="text-[11px] text-slate-400 mt-1">Total orders placed</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Total Account Spend</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            ${parseFloat(m.total_spent || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Confirmed purchase value</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Active Deliveries</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{m.pending_shipments ?? 0}</p>
          <p className="text-[11px] text-slate-400 mt-1">In processing / transit</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Completed Deliveries</span>
            <div className="p-2 rounded-lg bg-teal-50 text-teal-600 border border-teal-100">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{m.delivered_shipments ?? 0}</p>
          <p className="text-[11px] text-slate-400 mt-1">Successfully received</p>
        </div>
      </div>

      {/* Recent Orders for this Customer */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">My Recent Sales Orders</h2>
            <p className="text-xs text-slate-500">Orders associated strictly with your enterprise profile</p>
          </div>
          <button
            onClick={() => setCurrentView('orders')}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
          >
            View All My Orders
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4 font-semibold">Order ID</th>
                <th className="py-2.5 px-4 font-semibold">Date Placed</th>
                <th className="py-2.5 px-4 font-semibold">Order Total</th>
                <th className="py-2.5 px-4 font-semibold">Status</th>
                <th className="py-2.5 px-4 font-semibold text-right">Shipment & Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dashboardData?.recent_orders?.length > 0 ? (
                dashboardData.recent_orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {ord.order_number}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {new Date(ord.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      ${parseFloat(ord.total_amount).toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                        ord.status === 'Delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        ord.status === 'Shipped' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        ord.status === 'Processing' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-slate-100 text-slate-700 border-slate-300'
                      }`}>
                        {ord.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {ord.tracking_number ? (
                        <button
                          onClick={() => onSelectTracking && onSelectTracking(ord.tracking_number)}
                          className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded border border-blue-200 transition-colors"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>Track: {ord.tracking_number}</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Processing dispatch</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-400">
                    No orders registered yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
