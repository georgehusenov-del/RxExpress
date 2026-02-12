import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Package, MapPin, Truck, Clock, CheckCircle,
  AlertCircle, Phone, User, ExternalLink
} from 'lucide-react';

const API_BASE = process.env.REACT_APP_BACKEND_URL;

const statusConfig = {
  pending: { label: 'Order Received', color: 'bg-amber-500', icon: Clock, step: 1 },
  confirmed: { label: 'Confirmed', color: 'bg-blue-500', icon: CheckCircle, step: 2 },
  ready_for_pickup: { label: 'Ready for Pickup', color: 'bg-blue-500', icon: Package, step: 2 },
  assigned: { label: 'Driver Assigned', color: 'bg-blue-500', icon: Truck, step: 3 },
  picked_up: { label: 'Picked Up', color: 'bg-blue-600', icon: Truck, step: 3 },
  in_transit: { label: 'In Transit', color: 'bg-blue-600', icon: Truck, step: 4 },
  out_for_delivery: { label: 'Out for Delivery', color: 'bg-indigo-500', icon: Truck, step: 4 },
  delivered: { label: 'Delivered', color: 'bg-green-500', icon: CheckCircle, step: 5 },
  failed: { label: 'Delivery Failed', color: 'bg-red-500', icon: AlertCircle, step: 0 },
  cancelled: { label: 'Cancelled', color: 'bg-slate-500', icon: AlertCircle, step: 0 }
};

const steps = [
  { step: 1, label: 'Order Placed' },
  { step: 2, label: 'Confirmed' },
  { step: 3, label: 'Picked Up' },
  { step: 4, label: 'In Transit' },
  { step: 5, label: 'Delivered' }
];

export const PublicTrackingPage = () => {
  const { trackingNumber } = useParams();
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTracking = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/track/${trackingNumber}`);
        if (!response.ok) {
          throw new Error('Order not found');
        }
        const data = await response.json();
        setTracking(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTracking();
    const interval = setInterval(fetchTracking, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [trackingNumber]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="w-12 h-12 text-teal-600 animate-pulse mx-auto mb-4" />
          <p className="text-slate-600">Loading tracking info...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-heading font-bold text-slate-900 mb-2">Order Not Found</h1>
            <p className="text-slate-600">We couldn't find an order with tracking number:</p>
            <p className="font-mono text-lg mt-2">{trackingNumber}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = statusConfig[tracking.status] || statusConfig.pending;
  const StatusIcon = status.icon;
  const currentStep = status.step;

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-600 to-teal-800">
      {/* Header */}
      <header className="p-4 text-center text-white">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Truck className="w-6 h-6" />
          <h1 className="text-xl font-heading font-bold">RX Expresss</h1>
        </div>
        <p className="text-teal-100 text-sm">Track Your Delivery</p>
      </header>

      {/* Main Content */}
      <main className="px-4 pb-8">
        <Card className="max-w-lg mx-auto">
          <CardContent className="p-6">
            {/* Order Number */}
            <div className="text-center mb-6">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Order Number</p>
              <p className="font-mono text-lg font-bold text-slate-900">{tracking.order_number}</p>
              <p className="text-xs text-slate-400 font-mono">{tracking.tracking_number}</p>
            </div>

            {/* Status Badge */}
            <div className="flex justify-center mb-6">
              <Badge className={`${status.color} text-white px-4 py-2 text-sm flex items-center gap-2`}>
                <StatusIcon className="w-4 h-4" />
                {status.label}
              </Badge>
            </div>

            {/* Progress Steps */}
            {currentStep > 0 && (
              <div className="mb-6">
                <div className="flex justify-between items-center">
                  {steps.map((s, idx) => (
                    <div key={s.step} className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        currentStep >= s.step
                          ? 'bg-teal-600 text-white'
                          : 'bg-slate-200 text-slate-500'
                      }`}>
                        {currentStep > s.step ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          s.step
                        )}
                      </div>
                      <p className={`text-xs mt-1 ${
                        currentStep >= s.step ? 'text-teal-600' : 'text-slate-400'
                      }`}>
                        {s.label}
                      </p>
                      {idx < steps.length - 1 && (
                        <div className={`absolute h-0.5 w-12 ${
                          currentStep > s.step ? 'bg-teal-600' : 'bg-slate-200'
                        }`} style={{ marginLeft: '60px', marginTop: '16px' }} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Status Message */}
            <div className="text-center p-4 bg-slate-50 rounded-lg mb-6">
              <p className="text-slate-700">{tracking.status_message}</p>
            </div>

            {/* ETA */}
            {tracking.estimated_delivery_start && tracking.status !== 'delivered' && (
              <div className="mb-6">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Estimated Delivery
                </p>
                <div className="p-3 bg-teal-50 rounded-lg">
                  <p className="text-lg font-medium text-teal-700">
                    {new Date(tracking.estimated_delivery_start).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </p>
                  <p className="text-sm text-teal-600">
                    {new Date(tracking.estimated_delivery_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {' - '}
                    {new Date(tracking.estimated_delivery_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            )}

            {/* Delivered Time */}
            {tracking.status === 'delivered' && tracking.actual_delivery_time && (
              <div className="mb-6">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Delivered
                </p>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-lg font-medium text-green-700">
                    {new Date(tracking.actual_delivery_time).toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            {/* Delivery Address */}
            <div className="mb-6">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Delivery Address
              </p>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-slate-900">{tracking.delivery_address?.street}</p>
                <p className="text-sm text-slate-600">
                  {tracking.delivery_address?.city}, {tracking.delivery_address?.state}
                </p>
              </div>
            </div>

            {/* Driver Info */}
            {tracking.driver_name && (
              <div className="mb-6">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <Truck className="w-3 h-3" /> Your Driver
                </p>
                <div className="p-3 bg-blue-50 rounded-lg flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-700" />
                  </div>
                  <div>
                    <p className="font-medium text-blue-900">{tracking.driver_name}</p>
                    <p className="text-xs text-blue-600">En route to you</p>
                  </div>
                </div>
              </div>
            )}

            {/* Circuit Live Tracking */}
            {tracking.circuit_tracking_url && (
              <a
                href={tracking.circuit_tracking_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full p-4 bg-teal-600 text-white rounded-lg text-center hover:bg-teal-700 transition-colors"
              >
                <span className="flex items-center justify-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  View Live Map Tracking
                </span>
              </a>
            )}

            {/* Proof of Delivery */}
            {tracking.proof_of_delivery && (
              <div className="mt-6">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Proof of Delivery
                </p>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-700">
                    Signed by: {tracking.proof_of_delivery.recipient_name}
                  </p>
                  <p className="text-xs text-green-600">
                    {new Date(tracking.proof_of_delivery.delivered_at).toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            {/* Pharmacy Info */}
            <div className="mt-6 pt-4 border-t text-center">
              <p className="text-xs text-slate-400">From</p>
              <p className="text-sm font-medium text-slate-700">{tracking.pharmacy_name}</p>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-teal-200 text-xs">
        <p>Powered by RX Expresss</p>
        <p className="mt-1">Questions? Contact your pharmacy</p>
      </footer>
    </div>
  );
};

export default PublicTrackingPage;
