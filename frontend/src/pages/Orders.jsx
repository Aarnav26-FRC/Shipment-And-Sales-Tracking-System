import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import {
  ShoppingCart,
  PlusCircle,
  Search,
  Eye,
  Truck,
  X,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Calendar,
  DollarSign,
  FileText
} from 'lucide-react';

export default function Orders({ onSelectTracking }) {
  const { isAdmin, isCustomer } = useAuth();
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Order Details Modal
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // New Order Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [orderItems, setOrderItems] = useState([
    { product_id: '', quantity: 1, unit_price: 0, total_price: 0 }
  ]);
  const [orderNotes, setOrderNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Status Update state inside Order Details
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchOrders();
    if (isAdmin) {
      fetchFormData();
    }
  }, [isAdmin]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await api.getOrders();
      if (res.success) {
        setOrders(res.orders || []);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchFormData = async () => {
    try {
      const [cRes, pRes] = await Promise.all([api.getCustomers(), api.getProducts()]);
      if (cRes.success) setCustomers(cRes.customers || []);
      if (pRes.success) setProducts(pRes.products || []);
    } catch (err) {
      console.error('Failed to load auxiliary form data', err);
    }
  };

  const viewOrderDetails = async (orderId) => {
    try {
      setLoadingDetail(true);
      const res = await api.getOrder(orderId);
      if (res.success) {
        setSelectedOrder(res.order);
      }
    } catch (err) {
      showToast(err.message || 'Failed to fetch order details', 'error');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!selectedOrder) return;
    try {
      setUpdatingStatus(true);
      await api.updateOrderStatus(selectedOrder.id, newStatus);
      showToast(`Order status updated to ${newStatus}`);
      setSelectedOrder(prev => ({ ...prev, status: newStatus }));
      fetchOrders();
    } catch (err) {
      showToast(err.message || 'Failed to update order status', 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Line item handlers
  const handleItemChange = (index, field, value) => {
    const updated = [...orderItems];
    if (field === 'product_id') {
      const prod = products.find(p => p.id === parseInt(value, 10));
      updated[index].product_id = value;
      updated[index].unit_price = prod ? parseFloat(prod.price) : 0;
      updated[index].total_price = (updated[index].unit_price * updated[index].quantity);
    } else if (field === 'quantity') {
      const qty = parseInt(value, 10) || 1;
      updated[index].quantity = qty;
      updated[index].total_price = (updated[index].unit_price * qty);
    }
    setOrderItems(updated);
  };

  const addItemRow = () => {
    setOrderItems([...orderItems, { product_id: '', quantity: 1, unit_price: 0, total_price: 0 }]);
  };

  const removeItemRow = (index) => {
    if (orderItems.length === 1) return;
    setOrderItems(orderItems.filter((_, idx) => idx !== index));
  };

  // Dynamic calculations
  const calculateSubtotal = () => {
    return orderItems.reduce((acc, item) => acc + (parseFloat(item.total_price) || 0), 0);
  };

  const subtotal = calculateSubtotal();
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setFormError('');

    if (isAdmin && !selectedCustomerId) {
      setFormError('Please select a customer.');
      return;
    }

    const validItems = orderItems.filter(i => i.product_id && i.quantity > 0);
    if (validItems.length === 0) {
      setFormError('Please select at least one valid product.');
      return;
    }

    try {
      setSubmitting(true);
      await api.createOrder({
        customer_id: selectedCustomerId,
        items: validItems.map(i => ({
          product_id: parseInt(i.product_id, 10),
          quantity: parseInt(i.quantity, 10)
        })),
        notes: orderNotes
      });

      showToast('Sales order created successfully!');
      setCreateModalOpen(false);
      // Reset form
      setOrderItems([{ product_id: '', quantity: 1, unit_price: 0, total_price: 0 }]);
      setSelectedCustomerId('');
      setOrderNotes('');
      fetchOrders();
    } catch (err) {
      setFormError(err.message || 'Failed to create sales order.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Delivered':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Shipped':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Processing':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Pending':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'Cancelled':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const filteredOrders = orders.filter(o => {
    const q = search.toLowerCase();
    const matchesSearch =
      o.order_number?.toLowerCase().includes(q) ||
      o.customer_name?.toLowerCase().includes(q) ||
      o.customer_company?.toLowerCase().includes(q) ||
      o.tracking_number?.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-20 right-6 z-50 p-4 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 ${
          toast.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4 text-rose-600" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header & Action Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Sales Orders</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAdmin ? 'Process incoming customer purchases, review item breakdowns, and monitor shipment linkage.' : 'Review your company order history and live delivery statuses.'}
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Sales Order</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by order ID, customer, tracking..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-44 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700"
          >
            <option value="ALL">All Order Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Processing">Processing</option>
            <option value="Shipped">Shipped</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing <span className="text-slate-900 font-bold">{filteredOrders.length}</span> of {orders.length} orders
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-semibold">Order ID</th>
                <th className="py-3 px-4 font-semibold">Date</th>
                <th className="py-3 px-4 font-semibold">Customer / Company</th>
                <th className="py-3 px-4 font-semibold text-center">Items</th>
                <th className="py-3 px-4 font-semibold text-right">Total Amount</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Shipment Tracking</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    Loading orders...
                  </td>
                </tr>
              ) : filteredOrders.length > 0 ? (
                filteredOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">
                      {o.order_number}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(o.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{o.customer_company}</div>
                      <div className="text-slate-400 text-[11px]">{o.customer_name}</div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px]">
                        {o.item_count || 1}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      ${parseFloat(o.total_amount).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getStatusBadge(o.status)}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {o.tracking_number ? (
                        <button
                          onClick={() => onSelectTracking && onSelectTracking(o.tracking_number)}
                          className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded border border-blue-200 transition-colors"
                        >
                          <Truck className="w-3.5 h-3.5 text-blue-500" />
                          <span>{o.tracking_number}</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">No shipment yet</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => viewOrderDetails(o.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-md transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">
                    No sales orders found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full overflow-hidden border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Order Details:</span>
                  <span className="font-mono text-blue-600">{selectedOrder.order_number}</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Placed on {new Date(selectedOrder.created_at).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
              {/* Customer & Shipping Summary Grid */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Customer Information</p>
                  <p className="font-bold text-slate-900 mt-1">{selectedOrder.customer_company}</p>
                  <p className="text-slate-600">{selectedOrder.customer_name}</p>
                  <p className="text-slate-500 text-[11px] mt-0.5">{selectedOrder.customer_email} &bull; {selectedOrder.customer_phone}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Delivery Destination</p>
                  <p className="text-slate-700 mt-1">{selectedOrder.customer_address}</p>
                  <p className="text-slate-500 text-[11px]">{selectedOrder.customer_city}, {selectedOrder.customer_state} {selectedOrder.customer_postal_code}</p>
                </div>
              </div>

              {/* Order Status & Carrier Link */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-lg border border-slate-200">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-slate-700">Order Status:</span>
                  {isAdmin ? (
                    <select
                      value={selectedOrder.status}
                      disabled={updatingStatus}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Processing">Processing</option>
                      <option value="Shipped">Shipped</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  ) : (
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(selectedOrder.status)}`}>
                      {selectedOrder.status}
                    </span>
                  )}
                </div>

                {selectedOrder.tracking_number && (
                  <button
                    onClick={() => {
                      const trk = selectedOrder.tracking_number;
                      setSelectedOrder(null);
                      if (onSelectTracking) onSelectTracking(trk);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg font-semibold transition-colors"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Track Live: {selectedOrder.tracking_number}</span>
                  </button>
                )}
              </div>

              {/* Line Items Table */}
              <div>
                <p className="font-bold text-slate-900 mb-2">Itemized Products</p>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold">SKU</th>
                        <th className="py-2.5 px-3 font-semibold">Product Name</th>
                        <th className="py-2.5 px-3 font-semibold text-center">Qty</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Unit Price</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedOrder.items?.map((item) => (
                        <tr key={item.id}>
                          <td className="py-2.5 px-3 font-mono text-slate-600">{item.product_sku}</td>
                          <td className="py-2.5 px-3 font-medium text-slate-900">{item.product_name}</td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-800">{item.quantity}</td>
                          <td className="py-2.5 px-3 text-right text-slate-600">${parseFloat(item.unit_price).toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right font-semibold text-slate-900">${parseFloat(item.total_price).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals Summary */}
              <div className="flex justify-end">
                <div className="w-64 space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span>${parseFloat(selectedOrder.subtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Estimated Tax (8%):</span>
                    <span>${parseFloat(selectedOrder.tax).toFixed(2)}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900 text-sm">
                    <span>Grand Total:</span>
                    <span>${parseFloat(selectedOrder.total_amount).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-1.5 font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Sales Order Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full overflow-hidden border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">Create New Sales Order</h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Customer Selector */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Customer Organization *</label>
                <select
                  required
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company} &bull; {c.name} ({c.city}, {c.state})
                    </option>
                  ))}
                </select>
              </div>

              {/* Dynamic Line Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-semibold text-slate-700">Add Order Line Items *</label>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Another Item</span>
                  </button>
                </div>

                <div className="space-y-2 border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                  {orderItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        required
                        value={item.product_id}
                        onChange={(e) => handleItemChange(idx, 'product_id', e.target.value)}
                        className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="">-- Select Product --</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id} disabled={p.stock_quantity === 0}>
                            {p.sku}: {p.name} (${parseFloat(p.price).toFixed(2)}) {p.stock_quantity === 0 ? '- [OUT OF STOCK]' : `[Stock: ${p.stock_quantity}]`}
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        min="1"
                        required
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        className="w-20 px-2 py-2 bg-white border border-slate-300 rounded-lg text-xs text-center focus:ring-2 focus:ring-blue-500/20"
                        title="Quantity"
                      />

                      <div className="w-24 text-right font-mono font-semibold text-slate-800">
                        ${item.total_price ? item.total_price.toFixed(2) : '0.00'}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        disabled={orderItems.length === 1}
                        className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Automatic Calculation Summary */}
              <div className="flex justify-end pt-2">
                <div className="w-64 space-y-1.5 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Tax (8%):</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900 text-sm">
                    <span>Total Amount:</span>
                    <span className="text-blue-600">${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Order Notes / Logistics Instructions</label>
                <input
                  type="text"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="e.g. Standard dispatch via express logistics"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Generating Order...' : 'Submit & Generate Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
