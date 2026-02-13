import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Package, MapPin, Clock, Truck, User, Phone,
  CheckCircle, AlertCircle, ChevronRight, ExternalLink,
  Image, FileSignature
} from 'lucide-react';
import { OrderDetailsModal } from './OrderDetailsModal';

const statusConfig = {
  pending: { label: 'New', color: 'bg-amber-500', icon: Clock },
  confirmed: { label: 'Processing', color: 'bg-blue-500', icon: CheckCircle },
  ready_for_pickup: { label: 'Ready', color: 'bg-cyan-500', icon: Package },
  assigned: { label: 'Assigned', color: 'bg-indigo-500', icon: Truck },
  picked_up: { label: 'In Transit', color: 'bg-purple-500', icon: Truck },
  in_transit: { label: 'In Transit', color: 'bg-purple-500', icon: Truck },
  out_for_delivery: { label: 'In Transit', color: 'bg-purple-500', icon: Truck },
  delivered: { label: 'Delivered', color: 'bg-green-500', icon: CheckCircle },
  failed: { label: 'Failed', color: 'bg-red-500', icon: AlertCircle },
  cancelled: { label: 'Cancelled', color: 'bg-slate-500', icon: AlertCircle }
};

const deliveryTypeLabels = {
  same_day: { label: 'Same Day', color: 'bg-orange-100 text-orange-700' },
  next_day: { label: 'Next Day', color: 'bg-blue-100 text-blue-700' },
  priority: { label: 'Priority', color: 'bg-red-100 text-red-700' },
  time_window: { label: 'Scheduled', color: 'bg-purple-100 text-purple-700' }
};

const timeWindowLabels = {
  '8am-1pm': 'Morning (8AM-1PM)',
  '1pm-6pm': 'Afternoon (1PM-6PM)',
  '4pm-9pm': 'Evening (4PM-9PM)'
};

export const OrdersList = ({ orders, onRefresh, showProof = false }) => {
  const [selectedOrder, setSelectedOrder] = useState(null);

  if (orders.length === 0) {
    return (
      <div className="text-center py-16">
        <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500 font-medium">No orders found</p>
        <p className="text-sm text-slate-400">Orders will appear here once created</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4">
        {orders.map((order) => {
          const status = statusConfig[order.status] || statusConfig.pending;
          const deliveryType = deliveryTypeLabels[order.delivery_type] || deliveryTypeLabels.next_day;
          const StatusIcon = status.icon;

          return (
            <Card
              key={order.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedOrder(order)}
              data-testid={`order-card-${order.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  {/* Left: Order Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono text-sm font-semibold text-slate-900">
                        {order.order_number}
                      </span>
                      <Badge className={`${status.color} text-white text-xs`}>
                        {status.label}
                      </Badge>
                      <Badge variant="outline" className={`text-xs ${deliveryType.color}`}>
                        {deliveryType.label}
                      </Badge>
                      {order.time_window && (
                        <Badge variant="outline" className="text-xs">
                          {timeWindowLabels[order.time_window] || order.time_window}
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                      {/* Recipient */}
                      <div className="flex items-start gap-2">
                        <User className="w-4 h-4 text-slate-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {order.recipient?.name || 'N/A'}
                          </p>
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {order.recipient?.phone || 'N/A'}
                          </p>
                        </div>
                      </div>

                      {/* Delivery Address */}
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                        <div>
                          <p className="text-sm text-slate-900">
                            {order.delivery_address?.street}
                          </p>
                          <p className="text-xs text-slate-500">
                            {order.delivery_address?.city}, {order.delivery_address?.state} {order.delivery_address?.postal_code}
                          </p>
                        </div>
                      </div>

                      {/* ETA / Delivery Time */}
                      <div className="flex items-start gap-2">
                        <Clock className="w-4 h-4 text-slate-400 mt-0.5" />
                        <div>
                          {order.status === 'delivered' && order.actual_delivery_time ? (
                            <>
                              <p className="text-sm text-green-600 font-medium">Delivered</p>
                              <p className="text-xs text-slate-500">
                                {new Date(order.actual_delivery_time).toLocaleString()}
                              </p>
                            </>
                          ) : order.estimated_delivery_start ? (
                            <>
                              <p className="text-sm text-slate-900">ETA</p>
                              <p className="text-xs text-slate-500">
                                {new Date(order.estimated_delivery_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                {' - '}
                                {new Date(order.estimated_delivery_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </>
                          ) : (
                            <p className="text-sm text-slate-500">Calculating ETA...</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Packages */}
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100">
                      <span className="text-xs text-slate-500">
                        <Package className="w-3 h-3 inline mr-1" />
                        {order.total_packages || order.packages?.length || 1} package(s)
                      </span>
                      {order.tracking_number && (
                        <span className="text-xs text-slate-500 font-mono">
                          Tracking: {order.tracking_number}
                        </span>
                      )}
                      {order.circuit_tracking_url && (
                        <a
                          href={order.circuit_tracking_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-teal-600 hover:text-teal-700 flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-3 h-3" />
                          Live Tracking
                        </a>
                      )}
                    </div>

                    {/* Proof of Delivery */}
                    {showProof && order.status === 'delivered' && (order.signature_url || order.photo_urls?.length > 0) && (
                      <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-100">
                        {order.signature_url && (
                          <span className="text-xs text-green-600 flex items-center gap-1">
                            <FileSignature className="w-3 h-3" />
                            Signature captured
                          </span>
                        )}
                        {order.photo_urls?.length > 0 && (
                          <span className="text-xs text-green-600 flex items-center gap-1">
                            <Image className="w-3 h-3" />
                            {order.photo_urls.length} photo(s)
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right: Action */}
                  <Button variant="ghost" size="icon" className="ml-4">
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onRefresh={onRefresh}
        />
      )}
    </>
  );
};

export default OrdersList;
