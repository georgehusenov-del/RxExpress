import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Package, MapPin, User, Phone, Clock, Truck,
  CheckCircle, ExternalLink, FileSignature, Image,
  Mail, AlertCircle, Copy
} from 'lucide-react';
import { ordersAPI } from '@/lib/api';
import { toast } from 'sonner';

const statusConfig = {
  pending: { label: 'Ready', color: 'bg-cyan-500', nextStatus: 'ready_for_pickup', nextLabel: 'Confirm Ready' },
  confirmed: { label: 'Ready', color: 'bg-cyan-500', nextStatus: 'ready_for_pickup', nextLabel: 'Confirm Ready' },
  ready_for_pickup: { label: 'Ready', color: 'bg-cyan-500', nextStatus: null, nextLabel: null },
  assigned: { label: 'Assigned', color: 'bg-indigo-500', nextStatus: null, nextLabel: null },
  picked_up: { label: 'In Transit', color: 'bg-purple-500', nextStatus: null, nextLabel: null },
  in_transit: { label: 'In Transit', color: 'bg-purple-500', nextStatus: null, nextLabel: null },
  out_for_delivery: { label: 'In Transit', color: 'bg-purple-500', nextStatus: null, nextLabel: null },
  delivered: { label: 'Delivered', color: 'bg-green-500', nextStatus: null, nextLabel: null },
  failed: { label: 'Failed', color: 'bg-red-500', nextStatus: null, nextLabel: null },
  cancelled: { label: 'Cancelled', color: 'bg-slate-500', nextStatus: null, nextLabel: null }
};

const deliveryTypeLabels = {
  same_day: 'Same Day',
  next_day: 'Next Day',
  priority: 'Priority',
  time_window: 'Time Window'
};

export const OrderDetailsModal = ({ order, onClose, onRefresh }) => {
  const status = statusConfig[order.status] || statusConfig.pending;

  const handleStatusUpdate = async () => {
    if (!status.nextStatus) return;
    
    try {
      await ordersAPI.updateStatus(order.id, status.nextStatus);
      toast.success(`Order status updated to ${status.nextStatus}`);
      onRefresh();
      onClose();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 font-heading">
            <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
              <Package className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg">{order.order_number}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => copyToClipboard(order.order_number)}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={`${status.color} text-white text-xs`}>
                  {status.label}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {deliveryTypeLabels[order.delivery_type] || 'Standard'}
                </Badge>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Tracking Info */}
          {order.tracking_number && (
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Tracking Number</p>
                  <p className="font-mono text-sm">{order.tracking_number}</p>
                </div>
                {order.circuit_tracking_url ? (
                  <a
                    href={order.circuit_tracking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-teal-600 text-sm hover:underline"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Live Tracking
                  </a>
                ) : order.tracking_url ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(`${window.location.origin}${order.tracking_url}`)}
                  >
                    Copy Tracking Link
                  </Button>
                ) : null}
              </div>
            </div>
          )}

          {/* Recipient */}
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">
              <User className="w-3 h-3" /> Recipient
            </p>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="font-medium text-slate-900">{order.recipient?.name || 'N/A'}</p>
              <div className="flex items-center gap-4 mt-1">
                <span className="text-sm text-slate-600 flex items-center gap-1">
                  <Phone className="w-3 h-3" /> {order.recipient?.phone || 'N/A'}
                </span>
                {order.recipient?.email && (
                  <span className="text-sm text-slate-600 flex items-center gap-1">
                    <Mail className="w-3 h-3" /> {order.recipient.email}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Addresses */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Pickup
              </p>
              <div className="p-3 bg-teal-50 rounded-lg">
                <p className="text-sm text-slate-900">{order.pickup_address?.street || 'Pharmacy'}</p>
                <p className="text-xs text-slate-600">
                  {order.pickup_address?.city}, {order.pickup_address?.state}
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Delivery
              </p>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-slate-900">{order.delivery_address?.street}</p>
                <p className="text-xs text-slate-600">
                  {order.delivery_address?.city}, {order.delivery_address?.state} {order.delivery_address?.postal_code}
                </p>
                {order.delivery_address?.delivery_instructions && (
                  <p className="text-xs text-slate-500 mt-1 italic">
                    Note: {order.delivery_address.delivery_instructions}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Timing */}
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Timing
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500">Created</p>
                <p className="text-sm">{formatDate(order.created_at)}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500">Estimated Delivery</p>
                {order.estimated_delivery_start ? (
                  <p className="text-sm">
                    {new Date(order.estimated_delivery_start).toLocaleDateString()}{' '}
                    {new Date(order.estimated_delivery_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {' - '}
                    {new Date(order.estimated_delivery_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                ) : (
                  <p className="text-sm text-slate-500">Calculating...</p>
                )}
              </div>
            </div>
          </div>

          {/* Packages */}
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">
              <Package className="w-3 h-3" /> Packages ({order.packages?.length || 0})
            </p>
            <div className="space-y-2">
              {order.packages?.map((pkg, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-slate-500">QR: {pkg.qr_code}</span>
                    {pkg.requires_refrigeration && (
                      <Badge variant="outline" className="text-xs">Refrigerated</Badge>
                    )}
                  </div>
                  {pkg.prescriptions?.map((rx, rxIdx) => (
                    <div key={rxIdx} className="mt-2">
                      <p className="text-sm font-medium">{rx.medication_name}</p>
                      <p className="text-xs text-slate-500">
                        {rx.dosage} • Qty: {rx.quantity}
                        {rx.rx_number && ` • RX#: ${rx.rx_number}`}
                      </p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Driver Info */}
          {order.driver_id && (
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                <Truck className="w-3 h-3" /> Driver
              </p>
              <div className="p-3 bg-green-50 rounded-lg flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center">
                  <Truck className="w-5 h-5 text-green-700" />
                </div>
                <div>
                  <p className="font-medium text-green-900">{order.driver_name || 'Assigned'}</p>
                  <p className="text-xs text-green-700">Driver ID: {order.driver_id.slice(0, 8)}...</p>
                </div>
              </div>
            </div>
          )}

          {/* Proof of Delivery */}
          {order.status === 'delivered' && (order.signature_url || order.photo_urls?.length > 0) && (
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Proof of Delivery
              </p>
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-4">
                  {order.signature_url && (
                    <div className="flex items-center gap-2">
                      <FileSignature className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-700">Signature captured</span>
                    </div>
                  )}
                  {order.photo_urls?.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Image className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-700">{order.photo_urls.length} photo(s)</span>
                    </div>
                  )}
                </div>
                {order.recipient_name_signed && (
                  <p className="text-xs text-green-600 mt-2">Signed by: {order.recipient_name_signed}</p>
                )}
                <p className="text-xs text-green-600 mt-1">
                  Delivered: {formatDate(order.actual_delivery_time)}
                </p>
              </div>
            </div>
          )}

          {/* Pricing */}
          <div className="p-3 bg-slate-50 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Delivery Fee</span>
              <span>${order.delivery_fee?.toFixed(2) || '5.99'}</span>
            </div>
            {order.priority_surcharge > 0 && (
              <div className="flex justify-between text-sm mt-1">
                <span className="text-slate-600">Priority Surcharge</span>
                <span>${order.priority_surcharge?.toFixed(2)}</span>
              </div>
            )}
            <Separator className="my-2" />
            <div className="flex justify-between font-medium">
              <span>Total</span>
              <span className="text-teal-600">${order.total_amount?.toFixed(2) || '5.99'}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            {status.nextStatus && (
              <Button
                className="flex-1 bg-teal-600 hover:bg-teal-700"
                onClick={handleStatusUpdate}
                data-testid="update-order-status-btn"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {status.nextLabel}
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderDetailsModal;
