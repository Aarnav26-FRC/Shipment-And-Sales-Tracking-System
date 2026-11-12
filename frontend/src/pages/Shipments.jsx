import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import {
  Truck,
  PlusCircle,
  Search,
  Eye,
  RefreshCw,
  X,
  AlertCircle,
  CheckCircle2,
  Calendar,
  MapPin,
  Building,
  ArrowRight
} from 'lucide-react';

export default function Shipments({ onSelectTracking }) {
  const { isAdmin, isCustomer } = useAuth();
  const [shipments, setShipments] = useState([]);
  const [eligibleOrders, setEligibleOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Create Shipment Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [courierName, setCourierName] = useState('FedEx Express Priority');
  const [shipmentDate, setShipmentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 4);
    return d.toISOString().split('T')[0];
  });
  const [shippingAddress, setShippingAddress] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Status Update Modal
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [targetShipment, setTargetShipment] = useState(null);
  const [newStatus, setNewStatus] = useState('Processing');
  const [statusLocation, setStatusLocation] = useState('');
  const [statusNotes, setStatusNotes] = useState('');

  const [toast, setToast] = useState(null);

  const couriers = [
    'FedEx Express Priority',
    'DHL Global Forwarding',
    'UPS Air Saver',
    'Blue Dart Express',
    'SpeedPost Priority'
  ];

  const statuses = [
    'Processing',
    'Packed',
    'Dispatched',
    'In Transit',
    'Out for Delivery',
    'Delivered'
  ];

  useEffect(() => {
    fetchShipments();
    if (isAdmin) {
      fetchEligibleOrders();
    }
  }, [isAdmin]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchShipments = async () => {
    try {
      setLoading(true);
      const res = await api.getShipments();
      if (res.success) {
        setShipments(res.shipments || []);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load shipments', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchEligibleOrders = async () => {
    try {
      const res = await api.getOrders();
      if (res.success) {
        // Only orders that do NOT have a tracking_number yet
        const unassigned = res.orders.filter(o => !o.tracking_number && o.status !== 'Cancelled');
        setEligibleOrders(unassigned);
      }
    } catch (err) {
      console.error('Failed to load eligible orders', err);
    }
  };

  const handleOrderSelect = (orderId) => {
    setSelectedOrderId(orderId);
    const ord = eligibleOrders.find(o => o.id === parseInt(orderId, 10));
    if (ord) {
      setShippingAddress(`${ord.customer_company}, ${ord.customer_name}`);
    }
  };

  const handleCreateShipment = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!selectedOrderId) {
      setFormError('Please select a valid sales order.');
      return;
    }

    try {
      setSubmitting(true);
      await api.createShipment({
        order_id: parseInt(selectedOrderId, 10),
        courier_name: courierName,
        shipment_date: shipmentDate,
        estimated_delivery_date: estimatedDeliveryDate,
        shipping_address: shippingAddress
      });

      showToast('Shipment created and tracking ID generated!');
      setCreateModalOpen(false);
      setSelectedOrderId('');
      setShippingAddress('');
      fetchShipments();
      fetchEligibleOrders();
    } catch (err) {
      setFormError(err.message || 'Failed to create shipment.');
    } finally {
      setSubmitting(false);
    }
  };

  const openStatusModal = (shp) => {
    setTargetShipment(shp);
    setNewStatus(shp.current_status);
    setStatusLocation('');
    setStatusNotes('');
    setFormError('');
    setStatusModalOpen(true);
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!targetShipment) return;

    try {
      setSubmitting(true);
      await api.updateShipmentStatus(targetShipment.id, {
        status: newStatus,
        location: statusLocation,
        notes: statusNotes
      });

      showToast(`Shipment status updated to "${newStatus}"!`);
      setStatusModalOpen(false);
      fetchShipments();
    } catch (err) {
      setFormError(err.message || 'Failed to update status.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Delivered':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Out for Delivery':
      case 'In Transit':
      case 'Dispatched':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Packed':
      case 'Processing':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const filteredShipments = shipments.filter(s => {
    const q = search.toLowerCase();
    const matchesSearch =
      s.tracking_number?.toLowerCase().includes(q) ||
      s.order_number?.toLowerCase().includes(q) ||
      s.courier_name?.toLowerCase().includes(q) ||
      s.customer_company?.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'ALL' || s.current_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Toast */}
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
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Shipments & Logistics</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAdmin ? 'Manage courier dispatches, assign tracking IDs, and push transit location updates.' : 'Track your deliveries, carrier info, and estimated arrivals.'}
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Shipment</span>
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by tracking #, order, courier..."
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
            <option value="ALL">All Shipment Statuses</option>
            {statuses.map(st => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing <span className="text-slate-900 font-bold">{filteredShipments.length}</span> of {shipments.length} shipments
        </div>
      </div>

      {/* Shipments Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-semibold">Tracking Number</th>
                <th className="py-3 px-4 font-semibold">Sales Order</th>
                <th className="py-3 px-4 font-semibold">Recipient Organization</th>
                <th className="py-3 px-4 font-semibold">Courier Partner</th>
                <th className="py-3 px-4 font-semibold">Ship Date &rarr; ETA</th>
                <th className="py-3 px-4 font-semibold">Current Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    Loading shipments...
                  </td>
                </tr>
              ) : filteredShipments.length > 0 ? (
                filteredShipments.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {s.tracking_number}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {s.order_number}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{s.customer_company}</div>
                      <div className="text-slate-400 text-[11px]">{s.customer_name}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      {s.courier_name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <div>{new Date(s.shipment_date).toLocaleDateString()}</div>
                      <div className="text-[11px] text-blue-600 font-medium">
                        ETA: {new Date(s.estimated_delivery_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getStatusBadge(s.current_status)}`}>
                        {s.current_status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onSelectTracking && onSelectTracking(s.tracking_number)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors"
                          title="Live Tracking View"
                        >
                          Track
                        </button>

                        {isAdmin && (
                          <button
                            onClick={() => openStatusModal(s)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-md transition-colors flex items-center gap-1"
                            title="Update Status & Location"
                          >
                            <RefreshCw className="w-3 h-3 text-slate-500" />
                            <span>Update</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">
                    No shipments found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Shipment Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">Create Shipment & Tracking ID</h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateShipment} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Order selector */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Sales Order to Dispatch *</label>
                {eligibleOrders.length > 0 ? (
                  <select
                    required
                    value={selectedOrderId}
                    onChange={(e) => handleOrderSelect(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">-- Choose Order --</option>
                    {eligibleOrders.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.order_number} &bull; {o.customer_company} (${parseFloat(o.total_amount).toFixed(2)})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
                    All currently pending orders already have active shipments assigned. Create a new order first!
                  </div>
                )}
              </div>

              {/* Courier Selector */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Courier Carrier Partner *</label>
                <select
                  required
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  {couriers.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Shipment Date *</label>
                  <input
                    type="date"
                    required
                    value={shipmentDate}
                    onChange={(e) => setShipmentDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Estimated Delivery Date *</label>
                  <input
                    type="date"
                    required
                    value={estimatedDeliveryDate}
                    onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Shipping address */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Delivery Destination Address (Optional override)</label>
                <input
                  type="text"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="Defaults to customer address if blank"
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
                  disabled={submitting || eligibleOrders.length === 0}
                  className="px-4 py-2 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Generating Shipment...' : 'Generate Shipment & Tracking ID'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Status Modal */}
      {statusModalOpen && targetShipment && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Update Shipment Status</h3>
                <p className="text-[11px] font-mono text-blue-600 font-semibold">{targetShipment.tracking_number}</p>
              </div>
              <button
                onClick={() => setStatusModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">New Shipment Status *</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
                >
                  {statuses.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Current Facility / Hub Location *</label>
                <input
                  type="text"
                  required
                  value={statusLocation}
                  onChange={(e) => setStatusLocation(e.target.value)}
                  placeholder="e.g. Chicago Regional Sort Hub, IL"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Event Remarks / Operator Notes</label>
                <input
                  type="text"
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  placeholder="e.g. Scanned on freight flight or out with delivery courier"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setStatusModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Updating...' : 'Save & Publish Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
