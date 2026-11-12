import React, { useState, useEffect } from 'react';
import { api } from '../api';
import {
  Search,
  Truck,
  CheckCircle2,
  Clock,
  Package,
  MapPin,
  Building,
  Calendar,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

export default function Tracking({ initialTrackingNumber }) {
  const [trackingNumber, setTrackingNumber] = useState(initialTrackingNumber || 'TRK-FEDEX-90124');
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initialTrackingNumber) {
      setTrackingNumber(initialTrackingNumber);
      handleTrack(initialTrackingNumber);
    } else {
      handleTrack('TRK-FEDEX-90124');
    }
  }, [initialTrackingNumber]);

  const handleTrack = async (trackId) => {
    const query = (trackId || trackingNumber).trim();
    if (!query) return;

    try {
      setLoading(true);
      setError(null);
      const res = await api.getTracking(query);
      if (res.success) {
        setTrackingData(res.data);
      }
    } catch (err) {
      setError(err.message || 'Tracking number not found. Please verify the code.');
      setTrackingData(null);
    } finally {
      setLoading(false);
    }
  };

  const sampleTrackings = [
    { id: 'TRK-FEDEX-90124', label: 'In Transit (FedEx)' },
    { id: 'TRK-BLUD-77319', label: 'Out for Delivery (Blue Dart)' },
    { id: 'TRK-UPS-11209', label: 'Delivered (UPS)' },
    { id: 'TRK-SPD-33882', label: 'Packed (SpeedPost)' },
    { id: 'TRK-DHL-44821', label: 'Processing (DHL)' }
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Search Header Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3 border border-blue-100">
            <Truck className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Real-Time Shipment Tracking</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track packages end-to-end across fulfillment facilities and carrier transfer points.
          </p>

          {/* Search Bar */}
          <form
            onSubmit={(e) => { e.preventDefault(); handleTrack(trackingNumber); }}
            className="mt-5 flex items-center gap-2 max-w-lg mx-auto"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Enter tracking number (e.g. TRK-FEDEX-90124)..."
                className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 shrink-0"
            >
              {loading ? 'Locating...' : 'Track Package'}
            </button>
          </form>

          {/* Quick Click Samples */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-slate-500">
            <span className="font-medium mr-1">Demo Trackings:</span>
            {sampleTrackings.map((sample) => (
              <button
                key={sample.id}
                type="button"
                onClick={() => {
                  setTrackingNumber(sample.id);
                  handleTrack(sample.id);
                }}
                className={`px-2 py-0.5 rounded border transition-colors ${
                  trackingNumber === sample.id
                    ? 'bg-blue-50 border-blue-300 text-blue-700 font-semibold'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600'
                }`}
              >
                {sample.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tracking Content */}
      {trackingData && (
        <div className="space-y-6">
          {/* Main Visual Progress Card */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tracking Identifier</span>
                <p className="text-xl font-mono font-bold text-slate-900 mt-0.5">{trackingData.tracking_number}</p>
                <p className="text-xs text-slate-500 mt-0.5">Carrier Partner: <span className="font-semibold text-slate-800">{trackingData.courier_name}</span></p>
              </div>

              <div className="sm:text-right">
                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${
                  trackingData.current_status === 'Delivered'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  {trackingData.current_status}
                </span>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  {trackingData.current_status === 'Delivered'
                    ? `Delivered on ${new Date(trackingData.actual_delivery_date || trackingData.estimated_delivery_date).toLocaleDateString()}`
                    : `Estimated Arrival: ${new Date(trackingData.estimated_delivery_date).toLocaleDateString()}`
                  }
                </p>
              </div>
            </div>

            {/* Stepper Timeline (6 Stages) */}
            <div className="pt-8 pb-4">
              <div className="relative">
                {/* Horizontal Background Line */}
                <div className="hidden md:block absolute top-1/2 left-0 right-0 h-1 bg-slate-200 -translate-y-1/2 z-0"></div>
                {/* Active Progress Line */}
                <div
                  className="hidden md:block absolute top-1/2 left-0 h-1 bg-blue-600 -translate-y-1/2 z-0 transition-all duration-500"
                  style={{ width: `${trackingData.progress_percent}%` }}
                ></div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 relative z-10">
                  {trackingData.stages?.map((stage, idx) => {
                    const isCompleted = stage.state === 'completed';
                    const isCurrent = stage.state === 'current';
                    return (
                      <div key={idx} className="flex flex-col items-center text-center">
                        <div className={`
                          w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-sm
                          ${isCompleted ? 'bg-blue-600 text-white' : isCurrent ? 'bg-white border-2 border-blue-600 text-blue-600 ring-4 ring-blue-100' : 'bg-slate-100 text-slate-400 border border-slate-200'}
                        `}>
                          {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                        </div>
                        <p className={`text-xs font-bold mt-2 ${isCurrent ? 'text-blue-600' : isCompleted ? 'text-slate-900' : 'text-slate-400'}`}>
                          {stage.label}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5 leading-tight max-w-[120px]">
                          {stage.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Details 2-Column Split */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Courier & Delivery Details */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-600" />
                <span>Delivery & Courier Logistics</span>
              </h2>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Carrier Service</span>
                  <span className="font-semibold text-slate-900">{trackingData.courier_name}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Shipment Date</span>
                  <span className="font-semibold text-slate-900">{new Date(trackingData.shipment_date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Estimated Delivery</span>
                  <span className="font-semibold text-slate-900">{new Date(trackingData.estimated_delivery_date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Destination Address</span>
                  <span className="font-semibold text-slate-900 text-right max-w-xs">{trackingData.shipping_address}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-500">Recipient Organization</span>
                  <span className="font-semibold text-slate-900">{trackingData.order?.customer_company}</span>
                </div>
              </div>
            </div>

            {/* Order Content Summary */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-600" />
                  <span>Enclosed Order Contents</span>
                </h2>
                <span className="font-mono text-xs font-semibold text-blue-600">
                  {trackingData.order?.order_number}
                </span>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto">
                {trackingData.order?.items?.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                    <div>
                      <p className="font-semibold text-slate-900">{item.product_name}</p>
                      <p className="font-mono text-[10px] text-slate-500">SKU: {item.product_sku}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-800">Qty: {item.quantity}</span>
                      <p className="text-[10px] text-slate-500">${parseFloat(item.total_price).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-between text-xs font-bold text-slate-900">
                <span>Order Total:</span>
                <span>${parseFloat(trackingData.order?.total_amount || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Chronological Transit History Log */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">Logistics Event History</h2>
              <p className="text-xs text-slate-500">Chronological carrier checkpoints and facility scans</p>
            </div>

            <div className="p-4">
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {trackingData.timeline?.map((event, idx) => (
                  <div key={idx} className="relative flex items-start gap-4 text-xs">
                    <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-blue-600 ring-4 ring-white"></div>
                    <div className="flex-1 bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span className="font-bold text-slate-900 text-sm">{event.status}</span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {new Date(event.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600 mt-1 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{event.location}</span>
                      </div>
                      {event.notes && (
                        <p className="text-slate-500 text-[11px] mt-1 italic">
                          "{event.notes}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
