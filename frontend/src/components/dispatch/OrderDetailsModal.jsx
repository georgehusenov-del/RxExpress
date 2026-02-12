import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  MapPin,
  Package,
  User,
  Phone,
  Clock,
  Truck,
  CheckCircle,
  ArrowRight,
  FileText,
  Pill
} from 'lucide-react';

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-amber-500', nextStatus: 'confirmed', nextLabel: 'Confirm Order' },
  confirmed: { label: 'Confirmed', color: 'bg-blue-500', nextStatus: 'assigned', nextLabel: 'Ready for Pickup' },
  assigned: { label: 'Assigned', color: 'bg-blue-500', nextStatus: 'picked_up', nextLabel: 'Mark Picked Up' },
  picked_up: { label: 'Picked Up', color: 'bg-blue-500', nextStatus: 'in_transit', nextLabel: 'Start Delivery' },
  in_transit: { label: 'In Transit', color: 'bg-blue-500', nextStatus: 'delivered', nextLabel: 'Mark Delivered' },
  delivered: { label: 'Delivered', color: 'bg-green-500', nextStatus: null, nextLabel: null },
  cancelled: { label: 'Cancelled', color: 'bg-red-500', nextStatus: null, nextLabel: null },
};

export const OrderDetailsModal = ({ order, onClose, onAssign, onStatusUpdate }) => {
  const status = statusConfig[order.status] || statusConfig.pending;

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 font-heading">
            <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
              <Package className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <p className="font-mono text-lg">{order.order_number}</p>
              <Badge className={`${status.color} text-white text-xs mt-1`}>
                {status.label}
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Addresses */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-teal-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Pickup</p>
                <p className="text-sm text-slate-900">
                  {order.pickup_address?.street || 'Pharmacy Address'}
                </p>
                <p className="text-xs text-slate-500">
                  {order.pickup_address?.city}, {order.pickup_address?.state} {order.pickup_address?.postal_code}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Delivery</p>
                <p className="text-sm text-slate-900">
                  {order.delivery_address?.street || 'Delivery Address'}
                </p>
                <p className="text-xs text-slate-500">
                  {order.delivery_address?.city}, {order.delivery_address?.state} {order.delivery_address?.postal_code}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Prescriptions */}
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2">
              <Pill className="w-3 h-3" /> Prescriptions ({order.prescriptions?.length || 0})
            </p>
            <div className="space-y-2">
              {order.prescriptions?.map((rx, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{rx.medication_name}</p>
                    <p className="text-xs text-slate-500">{rx.dosage} • Qty: {rx.quantity}</p>
                  </div>
                  {rx.requires_refrigeration && (
                    <Badge variant="outline" className="text-xs">Refrigerated</Badge>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Order Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-500">Created</p>
              <p className="font-mono text-slate-900">{formatDate(order.created_at)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Delivery Fee</p>
              <p className="font-heading font-semibold text-teal-600">${order.delivery_fee?.toFixed(2) || '5.99'}</p>
            </div>
            {order.delivery_notes && (
              <div className="col-span-2">
                <p className="text-xs text-slate-500 flex items-center gap-1"><FileText className="w-3 h-3" /> Notes</p>
                <p className="text-slate-900">{order.delivery_notes}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Driver Info */}
          {order.driver_id ? (
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <Truck className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-900">Driver Assigned</p>
                <p className="text-xs text-green-600">Driver ID: {order.driver_id.slice(0, 8)}...</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <User className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-900">No Driver Assigned</p>
                <p className="text-xs text-amber-600">Assign a driver to proceed</p>
              </div>
              <Button size="sm" onClick={onAssign} data-testid="assign-driver-modal-btn">
                Assign Driver
              </Button>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            {status.nextStatus && order.driver_id && (
              <Button
                className="flex-1 bg-teal-600 hover:bg-teal-700"
                onClick={() => onStatusUpdate(order.id, status.nextStatus)}
                data-testid="update-status-btn"
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
