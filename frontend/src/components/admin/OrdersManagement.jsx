import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Clock, XCircle, ExternalLink, Calendar, User, Edit, RefreshCw,
  LayoutGrid, List, ChevronDown, ChevronRight, Sun, Sunset, Moon, DollarSign,
  GripVertical, UserPlus, ArrowRight
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
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

// Borough configuration for Smart Organizer
const boroughConfig = {
  Q: { name: 'Queens', color: 'blue', bgClass: 'from-blue-500/20 to-blue-600/10 border-blue-500/30' },
  B: { name: 'Brooklyn', color: 'green', bgClass: 'from-green-500/20 to-green-600/10 border-green-500/30' },
  M: { name: 'Manhattan', color: 'amber', bgClass: 'from-amber-500/20 to-amber-600/10 border-amber-500/30' },
  S: { name: 'Staten Island', color: 'purple', bgClass: 'from-purple-500/20 to-purple-600/10 border-purple-500/30' },
  X: { name: 'Bronx', color: 'red', bgClass: 'from-red-500/20 to-red-600/10 border-red-500/30' },
};

// Time window configuration
const timeWindowConfig = {
  morning: { label: '8am - 1pm', icon: Sun, color: 'amber', start: 8, end: 13 },
  afternoon: { label: '1pm - 4pm', icon: Sunset, color: 'orange', start: 13, end: 16 },
  evening: { label: '4pm - 10pm', icon: Moon, color: 'indigo', start: 16, end: 22 },
};

// Helper to extract borough from QR code
const getBoroughFromOrder = (order) => {
  if (order.qr_code && order.qr_code.length > 0) {
    const firstChar = order.qr_code.charAt(0).toUpperCase();
    if (boroughConfig[firstChar]) return firstChar;
  }
  // Fallback: try to detect from city name
  const city = order.delivery_address?.city?.toLowerCase() || '';
  if (city.includes('queens')) return 'Q';
  if (city.includes('brooklyn')) return 'B';
  if (city.includes('manhattan') || city.includes('new york')) return 'M';
  if (city.includes('staten')) return 'S';
  if (city.includes('bronx')) return 'X';
  return null;
};

// Helper to determine time window from order
const getTimeWindowFromOrder = (order) => {
  const timeWindow = order.time_window;
  if (timeWindow) {
    if (timeWindow.includes('8am') || timeWindow.includes('morning') || timeWindow === '8am-1pm') return 'morning';
    if (timeWindow.includes('1pm') || timeWindow.includes('afternoon') || timeWindow === '1pm-4pm') return 'afternoon';
    if (timeWindow.includes('4pm') || timeWindow.includes('evening') || timeWindow === '4pm-10pm') return 'evening';
  }
  // For priority/same-day, default to morning
  if (order.delivery_type === 'priority') return 'morning';
  if (order.delivery_type === 'same_day') return 'afternoon';
  return 'morning'; // Default
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
  const [pagination, setPagination] = useState({ skip: 0, limit: 100, total: 0 });
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'smart'
  const [expandedBoroughs, setExpandedBoroughs] = useState({});
  const [expandedTimeWindows, setExpandedTimeWindows] = useState({});

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

  // Smart Organizer: Group orders by borough and time window
  const organizedOrders = useMemo(() => {
    // Only include active orders (not delivered/cancelled)
    const activeOrders = filteredOrders.filter(order => 
      !['delivered', 'cancelled', 'failed'].includes(order.status)
    );

    const organized = {};
    
    // Initialize all boroughs
    Object.keys(boroughConfig).forEach(borough => {
      organized[borough] = {
        morning: [],
        afternoon: [],
        evening: [],
      };
    });
    organized['other'] = { morning: [], afternoon: [], evening: [] };

    // Group orders
    activeOrders.forEach(order => {
      const borough = getBoroughFromOrder(order) || 'other';
      const timeWindow = getTimeWindowFromOrder(order);
      
      if (organized[borough]) {
        organized[borough][timeWindow].push(order);
      } else {
        organized['other'][timeWindow].push(order);
      }
    });

    // Calculate totals and remove empty boroughs
    const result = {};
    Object.keys(organized).forEach(borough => {
      const total = organized[borough].morning.length + 
                    organized[borough].afternoon.length + 
                    organized[borough].evening.length;
      if (total > 0) {
        result[borough] = {
          ...organized[borough],
          total,
          totalCopay: activeOrders
            .filter(o => getBoroughFromOrder(o) === borough || (borough === 'other' && !getBoroughFromOrder(o)))
            .reduce((sum, o) => sum + (o.copay_collected ? 0 : (o.copay_amount || 0)), 0)
        };
      }
    });

    return result;
  }, [filteredOrders]);

  // Toggle borough expansion
  const toggleBorough = (borough) => {
    setExpandedBoroughs(prev => ({
      ...prev,
      [borough]: !prev[borough]
    }));
  };

  // Toggle time window expansion
  const toggleTimeWindow = (borough, timeWindow) => {
    const key = `${borough}-${timeWindow}`;
    setExpandedTimeWindows(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-heading font-semibold text-white">Order Management</h3>
          <p className="text-sm text-slate-400">View and manage all delivery orders</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-1">
            <Button
              variant="ghost"
              size="sm"
              className={`px-3 py-1.5 ${viewMode === 'list' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'}`}
              onClick={() => setViewMode('list')}
              data-testid="view-mode-list"
            >
              <List className="w-4 h-4 mr-1" />
              List
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`px-3 py-1.5 ${viewMode === 'smart' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'}`}
              onClick={() => setViewMode('smart')}
              data-testid="view-mode-smart"
            >
              <LayoutGrid className="w-4 h-4 mr-1" />
              Smart Organizer
            </Button>
          </div>
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

      {/* Smart Organizer View */}
      {viewMode === 'smart' && (
        <div className="space-y-4" data-testid="smart-organizer">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Object.entries(boroughConfig).map(([code, config]) => {
              const data = organizedOrders[code];
              return (
                <Card 
                  key={code}
                  className={`bg-gradient-to-br ${config.bgClass} border cursor-pointer transition-all hover:scale-[1.02]`}
                  onClick={() => data && toggleBorough(code)}
                  data-testid={`borough-summary-${code}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-slate-400">{config.name}</p>
                        <p className="text-2xl font-bold text-white">{data?.total || 0}</p>
                        <p className="text-xs text-slate-500">orders</p>
                      </div>
                      <div className={`w-10 h-10 rounded-lg bg-${config.color}-500/30 flex items-center justify-center`}>
                        <span className="text-lg font-bold text-white">{code}</span>
                      </div>
                    </div>
                    {data?.totalCopay > 0 && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-amber-400">
                        <DollarSign className="w-3 h-3" />
                        ${data.totalCopay.toFixed(2)} copay to collect
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Borough Sections */}
          <div className="space-y-4">
            {Object.entries(organizedOrders).map(([borough, data]) => {
              const config = boroughConfig[borough] || { name: 'Other Areas', color: 'slate', bgClass: 'from-slate-500/20 to-slate-600/10 border-slate-500/30' };
              const isExpanded = expandedBoroughs[borough] !== false; // Default expanded
              
              return (
                <Card key={borough} className="bg-slate-800 border-slate-700 overflow-hidden">
                  <Collapsible open={isExpanded} onOpenChange={() => toggleBorough(borough)}>
                    <CollapsibleTrigger asChild>
                      <CardHeader className={`cursor-pointer bg-gradient-to-r ${config.bgClass} border-b border-slate-700 py-3`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                            <div className={`w-8 h-8 rounded-lg bg-${config.color}-500/30 flex items-center justify-center`}>
                              <span className="text-sm font-bold text-white">{borough}</span>
                            </div>
                            <div>
                              <CardTitle className="text-base font-medium text-white">{config.name}</CardTitle>
                              <p className="text-xs text-slate-400">{data.total} active deliveries</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-xs">
                            <span className="text-amber-400"><Sun className="w-3 h-3 inline mr-1" />{data.morning.length}</span>
                            <span className="text-orange-400"><Sunset className="w-3 h-3 inline mr-1" />{data.afternoon.length}</span>
                            <span className="text-indigo-400"><Moon className="w-3 h-3 inline mr-1" />{data.evening.length}</span>
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <CardContent className="p-0">
                        {/* Time Window Sections */}
                        {Object.entries(timeWindowConfig).map(([tw, twConfig]) => {
                          const twOrders = data[tw];
                          if (twOrders.length === 0) return null;
                          
                          const twKey = `${borough}-${tw}`;
                          const isTwExpanded = expandedTimeWindows[twKey] !== false;
                          const TimeIcon = twConfig.icon;
                          
                          return (
                            <Collapsible key={tw} open={isTwExpanded} onOpenChange={() => toggleTimeWindow(borough, tw)}>
                              <CollapsibleTrigger asChild>
                                <div className={`flex items-center justify-between px-4 py-2 bg-slate-700/30 border-b border-slate-700 cursor-pointer hover:bg-slate-700/50`}>
                                  <div className="flex items-center gap-2">
                                    {isTwExpanded ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                                    <TimeIcon className={`w-4 h-4 text-${twConfig.color}-400`} />
                                    <span className="text-sm text-slate-300">{twConfig.label}</span>
                                    <Badge className={`bg-${twConfig.color}-500/20 text-${twConfig.color}-400 border-${twConfig.color}-500/30`}>
                                      {twOrders.length}
                                    </Badge>
                                  </div>
                                </div>
                              </CollapsibleTrigger>
                              
                              <CollapsibleContent>
                                <div className="divide-y divide-slate-700/50">
                                  {twOrders.map(order => (
                                    <div 
                                      key={order.id}
                                      className="flex items-center justify-between px-4 py-3 hover:bg-slate-700/30 transition-colors"
                                      data-testid={`smart-order-${order.id}`}
                                    >
                                      <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 rounded bg-slate-700 flex items-center justify-center">
                                          <Package className="w-4 h-4 text-slate-400" />
                                        </div>
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <span className="font-mono text-sm text-white">{order.order_number}</span>
                                            <Badge variant="outline" className={statusColors[order.status]}>
                                              {statusLabels[order.status]}
                                            </Badge>
                                            {order.qr_code && (
                                              <span className="text-xs font-mono text-slate-500">{order.qr_code}</span>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                                            <span><User className="w-3 h-3 inline mr-1" />{order.recipient?.name}</span>
                                            <span><MapPin className="w-3 h-3 inline mr-1" />{order.delivery_address?.street}</span>
                                            {order.copay_amount > 0 && !order.copay_collected && (
                                              <span className="text-amber-400"><DollarSign className="w-3 h-3 inline" />${order.copay_amount.toFixed(2)}</span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="text-slate-400 hover:text-white"
                                          onClick={() => {
                                            setSelectedOrder(order);
                                            setShowDetailsModal(true);
                                          }}
                                        >
                                          <Eye className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="text-teal-400 hover:text-teal-300"
                                          onClick={() => openStatusModal(order)}
                                        >
                                          <RefreshCw className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          );
                        })}
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              );
            })}
            
            {Object.keys(organizedOrders).length === 0 && (
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-8 text-center">
                  <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">No active orders to organize</p>
                  <p className="text-sm text-slate-500">All orders are either delivered, cancelled, or no orders exist</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* List View (Original Table) */}
      {viewMode === 'list' && (
      <>
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
      </>
      )}

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
            {selectedOrder && (
              <Button
                onClick={() => {
                  setShowDetailsModal(false);
                  openStatusModal(selectedOrder);
                }}
                className="bg-teal-600 hover:bg-teal-700"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Change Status
              </Button>
            )}
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

      {/* Change Status Modal */}
      <Dialog open={showStatusModal} onOpenChange={setShowStatusModal}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-teal-400" />
              Change Order Status
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-700/50 rounded-lg">
                <p className="font-mono text-sm text-teal-400">{selectedOrder.order_number}</p>
                <p className="text-xs text-slate-400 mt-1">
                  Current Status: <Badge variant="outline" className={statusColors[selectedOrder.status]}>
                    {statusLabels[selectedOrder.status] || selectedOrder.status}
                  </Badge>
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">New Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white" data-testid="new-status-select">
                    <SelectValue placeholder="Select new status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="ready_for_pickup">Ready for Pickup</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="picked_up">Picked Up</SelectItem>
                    <SelectItem value="in_transit">In Transit</SelectItem>
                    <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Notes (Optional)</Label>
                <Textarea
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  placeholder="Add notes about this status change..."
                  className="bg-slate-700 border-slate-600 text-white resize-none"
                  rows={3}
                  data-testid="status-notes-input"
                />
              </div>

              {newStatus !== selectedOrder.status && (
                <div className="flex items-center gap-2 p-3 bg-amber-500/20 border border-amber-500/30 rounded-lg">
                  <Edit className="w-4 h-4 text-amber-400" />
                  <p className="text-sm text-amber-400">
                    Status will change from <strong>{statusLabels[selectedOrder.status]}</strong> to <strong>{statusLabels[newStatus]}</strong>
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusModal(false)} className="border-slate-600">
              Cancel
            </Button>
            <Button
              onClick={handleUpdateStatus}
              disabled={updatingStatus || !newStatus || newStatus === selectedOrder?.status}
              className="bg-teal-600 hover:bg-teal-700"
              data-testid="update-status-btn"
            >
              {updatingStatus ? 'Updating...' : 'Update Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrdersManagement;
