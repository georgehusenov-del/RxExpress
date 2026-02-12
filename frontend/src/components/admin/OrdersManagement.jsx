import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Package, Search, Eye, MoreVertical, MapPin, Truck,
  Clock, XCircle, ExternalLink, Calendar, User, Edit, RefreshCw
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { adminAPI } from '@/lib/api';
import { toast } from 'sonner';

const statusColors = {
  pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  confirmed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  ready_for_pickup: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  assigned: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  picked_up: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  in_transit: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  out_for_delivery: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  delivered: 'bg-green-500/20 text-green-400 border-green-500/30',
  failed: 'bg-red-500/20 text-red-400 border-red-500/30',
  cancelled: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

const statusLabels = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  ready_for_pickup: 'Ready for Pickup',
  assigned: 'Assigned',
  picked_up: 'Picked Up',
  in_transit: 'In Transit',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

const deliveryTypeLabels = {
  same_day: 'Same Day',
  next_day: 'Next Day',
  priority: 'Priority',
  time_window: 'Time Window',
};

export const OrdersManagement = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [pagination, setPagination] = useState({ skip: 0, limit: 20, total: 0 });

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        skip: pagination.skip,
        limit: pagination.limit,
      };
      if (statusFilter !== 'all') params.status = statusFilter;
      
      const response = await adminAPI.getOrders(params);
      setOrders(response.data.orders || []);
      setPagination(prev => ({ ...prev, total: response.data.total || 0 }));
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [pagination.skip, pagination.limit, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleCancelOrder = async (orderId) => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    try {
      await adminAPI.cancelOrder(orderId, 'Cancelled by admin');
      toast.success('Order cancelled successfully');
      fetchOrders();
    } catch (err) {
      toast.error('Failed to cancel order');
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedOrder || !newStatus) return;
    
    setUpdatingStatus(true);
    try {
      await adminAPI.updateOrderStatus(selectedOrder.id, newStatus, statusNotes || null);
      toast.success(`Order status updated to ${statusLabels[newStatus]}`);
      setShowStatusModal(false);
      setSelectedOrder(null);
      setNewStatus('');
      setStatusNotes('');
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const openStatusModal = (order) => {
    setSelectedOrder(order);
    setNewStatus(order.status);
    setStatusNotes('');
    setShowStatusModal(true);
  };

  const filteredOrders = orders.filter(order =>
    order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.tracking_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.recipient?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.pharmacy_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-heading font-semibold text-white">Order Management</h3>
          <p className="text-sm text-slate-400">View and manage all delivery orders</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-slate-800 border-slate-700 text-white w-64"
              data-testid="search-orders-input"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 bg-slate-800 border-slate-700 text-white" data-testid="status-filter">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="in_transit">In Transit</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Orders Table */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700 hover:bg-slate-700/50">
                <TableHead className="text-slate-400">Order</TableHead>
                <TableHead className="text-slate-400">Pharmacy</TableHead>
                <TableHead className="text-slate-400">Recipient</TableHead>
                <TableHead className="text-slate-400">Type</TableHead>
                <TableHead className="text-slate-400">Status</TableHead>
                <TableHead className="text-slate-400">Created</TableHead>
                <TableHead className="text-slate-400 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    Loading orders...
                  </TableCell>
                </TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    No orders found
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <TableRow
                    key={order.id}
                    className="border-slate-700 hover:bg-slate-700/50"
                    data-testid={`order-row-${order.id}`}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium text-white font-mono text-sm">{order.order_number}</p>
                        <p className="text-xs text-slate-500 font-mono">{order.tracking_number}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {order.pharmacy_name || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-slate-300">{order.recipient?.name || 'Unknown'}</p>
                        <p className="text-xs text-slate-500">{order.delivery_address?.city}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-slate-700/50 text-slate-300 border-slate-600">
                        {deliveryTypeLabels[order.delivery_type] || order.delivery_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[order.status] || statusColors.pending}>
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-400 text-sm">
                      {order.created_at ? new Date(order.created_at).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                          <DropdownMenuItem
                            className="text-slate-300 hover:bg-slate-700"
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowDetailsModal(true);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-teal-400 hover:bg-slate-700"
                            onClick={() => openStatusModal(order)}
                            data-testid={`change-status-${order.id}`}
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Change Status
                          </DropdownMenuItem>
                          {order.tracking_url && (
                            <DropdownMenuItem
                              className="text-slate-300 hover:bg-slate-700"
                              onClick={() => window.open(order.tracking_url, '_blank')}
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Track Order
                            </DropdownMenuItem>
                          )}
                          {!['delivered', 'cancelled', 'failed'].includes(order.status) && (
                            <DropdownMenuItem
                              className="text-red-400 hover:bg-slate-700"
                              onClick={() => handleCancelOrder(order.id)}
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Cancel Order
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          Showing {filteredOrders.length} of {pagination.total} orders
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.skip === 0}
            onClick={() => setPagination(prev => ({ ...prev, skip: prev.skip - prev.limit }))}
            className="border-slate-700 text-slate-300"
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.skip + pagination.limit >= pagination.total}
            onClick={() => setPagination(prev => ({ ...prev, skip: prev.skip + prev.limit }))}
            className="border-slate-700 text-slate-300"
          >
            Next
          </Button>
        </div>
      </div>

      {/* Order Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              {/* Order Header */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-lg font-mono font-semibold">{selectedOrder.order_number}</p>
                  <p className="text-sm text-slate-400 font-mono">{selectedOrder.tracking_number}</p>
                </div>
                <Badge variant="outline" className={statusColors[selectedOrder.status]}>
                  {selectedOrder.status}
                </Badge>
              </div>

              {/* Order Info Grid */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700">
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-slate-400">Delivery Info</h4>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Package className="w-4 h-4 text-slate-500" />
                    <span>{deliveryTypeLabels[selectedOrder.delivery_type] || selectedOrder.delivery_type}</span>
                  </div>
                  {selectedOrder.time_window && (
                    <div className="flex items-center gap-2 text-slate-300">
                      <Clock className="w-4 h-4 text-slate-500" />
                      <span>{selectedOrder.time_window}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-slate-300">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <span>{selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleString() : 'N/A'}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-slate-400">Recipient</h4>
                  <div className="flex items-center gap-2 text-slate-300">
                    <User className="w-4 h-4 text-slate-500" />
                    <span>{selectedOrder.recipient?.name || 'Unknown'}</span>
                  </div>
                  <div className="flex items-start gap-2 text-slate-300">
                    <MapPin className="w-4 h-4 text-slate-500 mt-0.5" />
                    <span>
                      {selectedOrder.delivery_address?.street}, {selectedOrder.delivery_address?.city}, {selectedOrder.delivery_address?.state} {selectedOrder.delivery_address?.postal_code}
                    </span>
                  </div>
                </div>
              </div>

              {/* Driver Info */}
              {selectedOrder.driver_id && (
                <div className="pt-4 border-t border-slate-700">
                  <h4 className="text-sm font-medium text-slate-400 mb-2">Assigned Driver</h4>
                  <div className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center">
                      <Truck className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-white">{selectedOrder.driver_name || 'Driver Assigned'}</p>
                      <p className="text-sm text-slate-400">ID: {selectedOrder.driver_id}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Packages */}
              {selectedOrder.packages?.length > 0 && (
                <div className="pt-4 border-t border-slate-700">
                  <h4 className="text-sm font-medium text-slate-400 mb-2">
                    Packages ({selectedOrder.packages.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedOrder.packages.map((pkg, idx) => (
                      <div key={idx} className="p-3 bg-slate-700/50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-mono text-slate-300">{pkg.qr_code}</p>
                          <div className="flex items-center gap-2">
                            {pkg.requires_signature && (
                              <Badge variant="outline" className="text-xs bg-blue-500/20 text-blue-400 border-blue-500/30">
                                Signature
                              </Badge>
                            )}
                            {pkg.requires_refrigeration && (
                              <Badge variant="outline" className="text-xs bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                                Cold Chain
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pricing */}
              <div className="pt-4 border-t border-slate-700">
                <div className="flex items-center justify-between text-slate-300">
                  <span>Delivery Fee</span>
                  <span>${selectedOrder.delivery_fee?.toFixed(2) || '0.00'}</span>
                </div>
                {selectedOrder.priority_surcharge > 0 && (
                  <div className="flex items-center justify-between text-slate-300 mt-1">
                    <span>Priority Surcharge</span>
                    <span>${selectedOrder.priority_surcharge?.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-white font-semibold mt-2 pt-2 border-t border-slate-700">
                  <span>Total</span>
                  <span>${selectedOrder.total_amount?.toFixed(2) || '0.00'}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            {selectedOrder && !['delivered', 'cancelled', 'failed'].includes(selectedOrder.status) && (
              <Button
                variant="destructive"
                onClick={() => {
                  handleCancelOrder(selectedOrder.id);
                  setShowDetailsModal(false);
                }}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Cancel Order
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowDetailsModal(false)} className="border-slate-600">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrdersManagement;
