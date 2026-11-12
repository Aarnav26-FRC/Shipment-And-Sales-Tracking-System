import React, { useState, useEffect } from 'react';
import { api } from '../api';
import {
  Users,
  Package,
  ShoppingCart,
  Truck,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  TrendingUp,
  DollarSign,
  PlusCircle,
  Eye,
  FileText
} from 'lucide-react';

export default function Dashboard({ setCurrentView, onSelectOrder, onSelectTracking }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.getDashboard();
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {error}
        </div>
      </div>
    );
  }

  const m = data?.metrics || {};

  const kpiCards = [
    {
      title: 'Total Customers',
      value: m.total_customers ?? 0,
      subtext: 'Active enterprise clients',
      icon: Users,
      color: 'bg-blue-50 text-blue-600 border-blue-100'
    },
    {
      title: 'Total Products',
      value: m.total_products ?? 0,
      subtext: 'Inventory SKUs active',
      icon: Package,
      color: 'bg-indigo-50 text-indigo-600 border-indigo-100'
    },
    {
      title: 'Total Sales Orders',
      value: m.total_sales_orders ?? 0,
      subtext: `$${parseFloat(m.total_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} Total Revenue`,
      icon: ShoppingCart,
      color: 'bg-emerald-50 text-emerald-600 border-emerald-100'
    },
    {
      title: 'Total Shipments',
      value: m.total_shipments ?? 0,
      subtext: 'Dispatched through carriers',
      icon: Truck,
      color: 'bg-sky-50 text-sky-600 border-sky-100'
    },
    {
      title: 'Delivered Shipments',
      value: m.delivered_shipments ?? 0,
      subtext: 'Successfully received',
      icon: CheckCircle2,
      color: 'bg-teal-50 text-teal-600 border-teal-100'
    },
    {
      title: 'Pending Shipments',
      value: m.pending_shipments ?? 0,
      subtext: 'In processing / transit',
      icon: Clock,
      color: 'bg-amber-50 text-amber-600 border-amber-100'
    }
  ];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Delivered':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Shipped':
      case 'In Transit':
      case 'Out for Delivery':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Processing':
      case 'Packed':
      case 'Dispatched':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Cancelled':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Quick Actions */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">System Control Panel</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time synchronization across database inventory, sales fulfillment, and courier tracking.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setCurrentView('orders')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Sales Order</span>
          </button>
          <button
            onClick={() => setCurrentView('shipments')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm"
          >
            <Truck className="w-4 h-4" />
            <span>Manage Shipments</span>
          </button>
          <button
            onClick={() => setCurrentView('reports')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 transition-colors"
          >
            <TrendingUp className="w-4 h-4" />
            <span>View Reports</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid (6 cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {card.title}
                </span>
                <div className={`p-2 rounded-lg border ${card.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold text-slate-900">{card.value}</p>
                <p className="text-[11px] text-slate-500 mt-1 truncate">{card.subtext}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2-Column Split: Recent Orders & Recent Shipments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Recent Sales Orders</h2>
              <p className="text-xs text-slate-500">Latest transactions logged in MySQL database</p>
            </div>
            <button
              onClick={() => setCurrentView('orders')}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Order ID</th>
                  <th className="py-2.5 px-4 font-semibold">Customer</th>
                  <th className="py-2.5 px-4 font-semibold">Amount</th>
                  <th className="py-2.5 px-4 font-semibold">Status</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Shipment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.recent_orders?.length > 0 ? (
                  data.recent_orders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {ord.order_number}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <div className="font-medium text-slate-800">{ord.customer_company}</div>
                        <div className="text-[10px] text-slate-400">{ord.customer_name}</div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        ${parseFloat(ord.total_amount).toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium border ${getStatusBadge(ord.status)}`}>
                          {ord.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {ord.tracking_number ? (
                          <button
                            onClick={() => onSelectTracking && onSelectTracking(ord.tracking_number)}
                            className="inline-flex items-center gap-1 font-mono text-[11px] text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200"
                          >
                            <Truck className="w-3 h-3" />
                            <span>{ord.tracking_number}</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Not Shipped</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="py-6 text-center text-slate-400">
                      No orders found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Shipments Pipeline */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Active Shipments Pipeline</h2>
              <p className="text-xs text-slate-500">Live carrier tracking & delivery progress</p>
            </div>
            <button
              onClick={() => setCurrentView('shipments')}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Tracking ID</th>
                  <th className="py-2.5 px-4 font-semibold">Carrier</th>
                  <th className="py-2.5 px-4 font-semibold">Order</th>
                  <th className="py-2.5 px-4 font-semibold">Status</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.recent_shipments?.length > 0 ? (
                  data.recent_shipments.map((shp) => (
                    <tr key={shp.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                        {shp.tracking_number}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {shp.courier_name}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {shp.order_number}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium border ${getStatusBadge(shp.current_status)}`}>
                          {shp.current_status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => onSelectTracking && onSelectTracking(shp.tracking_number)}
                          className="px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-md transition-colors"
                        >
                          Track Live
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="py-6 text-center text-slate-400">
                      No shipments registered.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
