import React, { useState, useEffect } from 'react';
import { api } from '../api';
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  Package,
  Truck,
  CheckCircle2,
  Users,
  Award,
  Layers,
  Percent
} from 'lucide-react';

export default function Reports() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await api.getReports();
      if (res.success) {
        setReport(res);
      }
    } catch (err) {
      setError(err.message || 'Failed to generate reports');
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

  const s = report?.sales_summary || {};
  const o = report?.order_summary || {};
  const shp = report?.shipment_summary || {};

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Executive Performance & Analytics</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Aggregated metrics for sales revenue, order fulfillment status, and logistics carrier performance.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold">
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          <span>Live MySQL Aggregate View</span>
        </div>
      </div>

      {/* 1. Sales Summary KPIs */}
      <div>
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">1. Sales Revenue Summary</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase">Gross Revenue</span>
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">
              ${parseFloat(s.total_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Across all confirmed customer orders</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase">Average Order Value</span>
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">
              ${parseFloat(s.average_order_value || 0).toFixed(2)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Per transaction average</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase">Total Sales Orders</span>
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">{s.total_orders || 0}</p>
            <p className="text-[11px] text-slate-400 mt-1">Total transactions logged</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase">Sales Tax Collected</span>
              <div className="p-2 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                <Percent className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">
              ${parseFloat(s.total_tax_collected || 0).toFixed(2)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">8% standard logistics tax rate</p>
          </div>
        </div>
      </div>

      {/* 2. Order Summary & Shipment Status Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Summary by Status */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">2. Sales Order Summary</h2>
            <p className="text-xs text-slate-500">Distribution of orders across processing lifecycle</p>
          </div>

          <div className="space-y-3">
            {o.by_status?.map((item, idx) => {
              const totalOrders = s.total_orders || 1;
              const percent = Math.round((item.count / totalOrders) * 100);
              return (
                <div key={idx} className="space-y-1 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-800">{item.status}</span>
                    <span className="text-slate-500">
                      <span className="font-bold text-slate-900">{item.count} orders</span> (${parseFloat(item.total_amount).toFixed(2)}) &bull; {percent}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        item.status === 'Delivered' ? 'bg-emerald-500' :
                        item.status === 'Shipped' ? 'bg-blue-600' :
                        item.status === 'Processing' ? 'bg-amber-500' :
                        item.status === 'Cancelled' ? 'bg-rose-500' : 'bg-slate-400'
                      }`}
                      style={{ width: `${percent}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Shipment Status Summary */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">3. Shipment Status Summary</h2>
              <p className="text-xs text-slate-500">Carrier dispatch and delivery milestone tracking</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                {shp.delivery_rate}% Delivered
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {shp.by_status?.map((item, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <p className="text-slate-500 text-[10px] uppercase font-semibold">{item.status}</p>
                <p className="text-xl font-bold text-slate-900 mt-1">{item.count}</p>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-800 mb-2">Carrier Partner Distribution:</p>
            <div className="space-y-1.5 text-xs">
              {shp.by_courier?.map((c, idx) => (
                <div key={idx} className="flex justify-between items-center text-slate-600">
                  <span>{c.courier_name}</span>
                  <span className="font-semibold text-slate-800">
                    {c.count} shipments ({c.delivered_count} delivered)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Top Products Leaderboard & Top Customers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Products */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <span>Top-Selling Products by Revenue</span>
            </h2>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Product</th>
                  <th className="py-2.5 px-4 font-semibold text-center">Units Sold</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Revenue Generated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {s.top_products?.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{p.name}</div>
                      <div className="font-mono text-[10px] text-slate-400">{p.sku} &bull; {p.category}</div>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-800">
                      {p.total_units_sold}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-600">
                      ${parseFloat(p.total_revenue_generated).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Customers Leaderboard */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <span>Top Enterprise Clients by Spend</span>
            </h2>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Client Company</th>
                  <th className="py-2.5 px-4 font-semibold text-center">Total Orders</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Total Spend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {s.sales_by_customer?.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{c.company}</div>
                      <div className="text-[10px] text-slate-400">{c.city}, {c.state}</div>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-800">
                      {c.orders_count}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-blue-600">
                      ${parseFloat(c.total_spent).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
