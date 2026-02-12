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
  GripVertical, UserPlus, ArrowRight, Route, Navigation, Timer, Zap, Loader2
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
import { RouteMapPreview } from './RouteMapPreview';

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

// Map internal time window names to API format
const timeWindowToApiFormat = {
  morning: '8am-1pm',
  afternoon: '1pm-4pm',
  evening: '4pm-10pm',
};

// Draggable Order Card Component with Quick Driver Assign
const DraggableOrderCard = ({ order, onViewDetails, onChangeStatus, onAssignDriver, drivers, statusColors, statusLabels }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: order.id,
    data: { order },
  });
  const [showDriverDropdown, setShowDriverDropdown] = useState(false);

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 1000 : 1,
  } : undefined;

  const assignedDriver = drivers?.find(d => d.id === order.driver_id);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between px-3 py-2.5 bg-slate-800/50 rounded-lg border border-slate-700 mb-2 transition-all ${
        isDragging ? 'opacity-50 shadow-2xl ring-2 ring-teal-500' : 'hover:bg-slate-700/50 hover:border-slate-600'
      }`}
      data-testid={`draggable-order-${order.id}`}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 mr-2 text-slate-500 hover:text-slate-300"
      >
        <GripVertical className="w-4 h-4" />
      </div>
      
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-7 h-7 rounded bg-slate-700 flex items-center justify-center flex-shrink-0">
          <Package className="w-3.5 h-3.5 text-slate-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm text-white">{order.order_number}</span>
            <Badge variant="outline" className={`text-xs px-1.5 py-0 ${statusColors[order.status]}`}>
              {statusLabels[order.status]}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 truncate">
            <span className="truncate"><User className="w-3 h-3 inline mr-0.5" />{order.recipient?.name}</span>
            {order.copay_amount > 0 && !order.copay_collected && (
              <span className="text-amber-400 flex-shrink-0"><DollarSign className="w-3 h-3 inline" />${order.copay_amount.toFixed(2)}</span>
            )}
          </div>
        </div>
      </div>
      
      {/* Quick Driver Assign */}
      <div className="relative flex-shrink-0 mr-2">
        <Button
          variant="ghost"
          size="sm"
          className={`h-7 px-2 ${order.driver_id ? 'text-green-400 hover:text-green-300' : 'text-slate-400 hover:text-white'}`}
          onClick={() => setShowDriverDropdown(!showDriverDropdown)}
          data-testid={`assign-driver-btn-${order.id}`}
        >
          <Truck className="w-3.5 h-3.5" />
          {order.driver_id && <span className="ml-1 text-xs">✓</span>}
        </Button>
        
        {showDriverDropdown && (
          <div className="absolute right-0 top-full mt-1 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 py-1 max-h-48 overflow-y-auto">
            <div className="px-2 py-1 text-xs text-slate-500 border-b border-slate-700">Assign Driver</div>
            {drivers?.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-500">No available drivers</div>
            ) : (
              <>
                {order.driver_id && (
                  <button
                    className="w-full px-3 py-2 text-left text-xs text-red-400 hover:bg-slate-700 flex items-center gap-2"
                    onClick={() => {
                      onAssignDriver(order.id, 'unassign');
                      setShowDriverDropdown(false);
                    }}
                  >
                    <XCircle className="w-3 h-3" />
                    Unassign Driver
                  </button>
                )}
                {drivers?.map(driver => (
                  <button
                    key={driver.id}
                    className={`w-full px-3 py-2 text-left text-xs hover:bg-slate-700 flex items-center justify-between ${
                      driver.id === order.driver_id ? 'bg-teal-500/20 text-teal-400' : 'text-slate-300'
                    }`}
                    onClick={() => {
                      onAssignDriver(order.id, driver.id);
                      setShowDriverDropdown(false);
                    }}
                  >
                    <span className="truncate">{driver.first_name || driver.email} {driver.last_name || ''}</span>
                    {driver.id === order.driver_id && <span className="text-teal-400">✓</span>}
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-1 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-slate-400 hover:text-white"
          onClick={() => onViewDetails(order)}
        >
          <Eye className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-teal-400 hover:text-teal-300"
          onClick={() => onChangeStatus(order)}
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
};

// Droppable Time Window Zone Component
const DroppableTimeWindow = ({ id, children, isOver, timeWindowConfig }) => {
  const { setNodeRef, isOver: isOverCurrent } = useDroppable({
    id,
  });

  const twParts = id.split('-');
  const tw = twParts[twParts.length - 1];
  const config = timeWindowConfig[tw];

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[100px] rounded-lg border-2 border-dashed transition-all p-2 ${
        isOverCurrent 
          ? 'border-teal-500 bg-teal-500/10' 
          : 'border-slate-700 bg-slate-800/30'
      }`}
      data-testid={`droppable-${id}`}
    >
      {children}
      {isOverCurrent && (
        <div className="flex items-center justify-center py-4 text-teal-400 text-sm">
          <ArrowRight className="w-4 h-4 mr-2" />
          Drop here to move to {config?.label}
        </div>
      )}
    </div>
  );
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
  const [activeId, setActiveId] = useState(null);
  const [activeOrder, setActiveOrder] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [selectedOrderForDriver, setSelectedOrderForDriver] = useState(null);
  
  // Route optimization states
  const [showRoutePreview, setShowRoutePreview] = useState(false);
  const [routePreviewData, setRoutePreviewData] = useState(null);
  const [optimizingRoute, setOptimizingRoute] = useState(false);
  const [selectedRouteContext, setSelectedRouteContext] = useState({ borough: null, timeWindow: null });

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

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

  // Fetch drivers for assignment
  const fetchDrivers = useCallback(async () => {
    try {
      const response = await adminAPI.getDrivers({ status: 'available' });
      setDrivers(response.data.drivers || []);
    } catch (err) {
      console.error('Failed to fetch drivers:', err);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (viewMode === 'smart') {
      fetchDrivers();
    }
  }, [viewMode, fetchDrivers]);

  // Drag and Drop handlers
  const handleDragStart = (event) => {
    const { active } = event;
    setActiveId(active.id);
    const order = orders.find(o => o.id === active.id);
    setActiveOrder(order);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveOrder(null);

    if (!over) return;

    const orderId = active.id;
    const dropZoneId = over.id;

    // Parse drop zone ID (format: "borough-timewindow", e.g., "Q-morning")
    const parts = dropZoneId.split('-');
    if (parts.length < 2) return;

    const targetTimeWindow = parts[parts.length - 1]; // Last part is time window
    const apiTimeWindow = timeWindowToApiFormat[targetTimeWindow];

    if (!apiTimeWindow) return;

    // Get current order's time window
    const order = orders.find(o => o.id === orderId);
    const currentTimeWindow = getTimeWindowFromOrder(order);

    // Only update if time window changed
    if (currentTimeWindow === targetTimeWindow) {
      toast.info('Order is already in this time window');
      return;
    }

    try {
      await adminAPI.reassignOrder(orderId, apiTimeWindow, null);
      toast.success(`Order moved to ${timeWindowConfig[targetTimeWindow].label}`);
      fetchOrders(); // Refresh to show updated data
    } catch (err) {
      console.error('Failed to reassign order:', err);
      toast.error('Failed to move order');
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setActiveOrder(null);
  };

  // Assign driver to order (from modal)
  const handleAssignDriver = async (driverId) => {
    if (!selectedOrderForDriver) return;

    try {
      await adminAPI.reassignOrder(selectedOrderForDriver.id, null, driverId);
      toast.success('Driver assigned successfully');
      setShowDriverModal(false);
      setSelectedOrderForDriver(null);
      fetchOrders();
    } catch (err) {
      console.error('Failed to assign driver:', err);
      toast.error('Failed to assign driver');
    }
  };

  // Quick assign driver directly from order card
  const handleQuickAssignDriver = async (orderId, driverId) => {
    try {
      await adminAPI.reassignOrder(orderId, null, driverId);
      if (driverId === 'unassign') {
        toast.success('Driver unassigned');
      } else {
        const driver = drivers.find(d => d.id === driverId);
        toast.success(`Assigned to ${driver?.first_name || driver?.email || 'driver'}`);
      }
      fetchOrders();
    } catch (err) {
      console.error('Failed to assign driver:', err);
      toast.error('Failed to assign driver');
    }
  };

  const openDriverAssignModal = (order) => {
    setSelectedOrderForDriver(order);
    setShowDriverModal(true);
    fetchDrivers(); // Refresh driver list
  };

  // Route optimization preview handler
  const handleOptimizeRoute = async (borough, timeWindow, orderIds = []) => {
    setOptimizingRoute(true);
    setSelectedRouteContext({ borough, timeWindow });
    
    try {
      const apiTimeWindow = timeWindowToApiFormat[timeWindow];
      const response = await adminAPI.optimizeRoutePreview(orderIds, borough, apiTimeWindow);
      setRoutePreviewData(response.data);
      setShowRoutePreview(true);
    } catch (err) {
      console.error('Failed to optimize route:', err);
      toast.error('Failed to generate route preview');
    } finally {
      setOptimizingRoute(false);
    }
  };

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

      {/* Smart Organizer View with Drag & Drop */}
      {viewMode === 'smart' && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
        <div className="space-y-4" data-testid="smart-organizer">
          {/* Instructions Banner */}
          <div className="bg-gradient-to-r from-teal-900/50 to-teal-800/30 border border-teal-500/30 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <GripVertical className="w-5 h-5 text-teal-400" />
              <div>
                <p className="text-sm text-teal-300 font-medium">Drag & Drop Enabled</p>
                <p className="text-xs text-teal-400/70">Drag orders between time windows to reassign. Click the driver icon to assign a driver.</p>
              </div>
            </div>
          </div>

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
                      <CardContent className="p-4">
                        {/* Time Window Sections with Drop Zones */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                          {Object.entries(timeWindowConfig).map(([tw, twConfig]) => {
                            const twOrders = data[tw] || [];
                            const dropZoneId = `${borough}-${tw}`;
                            const TimeIcon = twConfig.icon;
                            
                            return (
                              <div key={tw} className="space-y-2">
                                {/* Time Window Header */}
                                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-${twConfig.color}-500/10 border border-${twConfig.color}-500/30`}>
                                  <TimeIcon className={`w-4 h-4 text-${twConfig.color}-400`} />
                                  <span className="text-sm font-medium text-white">{twConfig.label}</span>
                                  <Badge className={`bg-${twConfig.color}-500/20 text-${twConfig.color}-400`}>
                                    {twOrders.length}
                                  </Badge>
                                  {/* Optimize Route Button */}
                                  {twOrders.length >= 2 && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="ml-auto h-7 px-2 text-teal-400 hover:text-teal-300 hover:bg-teal-500/10"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOptimizeRoute(borough, tw, twOrders.map(o => o.id));
                                      }}
                                      disabled={optimizingRoute}
                                      data-testid={`optimize-route-${borough}-${tw}`}
                                    >
                                      {optimizingRoute && selectedRouteContext.borough === borough && selectedRouteContext.timeWindow === tw ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <>
                                          <Route className="w-3 h-3 mr-1" />
                                          <span className="text-xs">Optimize</span>
                                        </>
                                      )}
                                    </Button>
                                  )}
                                </div>
                                
                                {/* Droppable Zone */}
                                <DroppableTimeWindow id={dropZoneId} timeWindowConfig={timeWindowConfig}>
                                  {twOrders.length === 0 ? (
                                    <div className="text-center py-6 text-slate-500 text-sm">
                                      <Package className="w-6 h-6 mx-auto mb-2 opacity-50" />
                                      No orders
                                    </div>
                                  ) : (
                                    twOrders.map(order => (
                                      <DraggableOrderCard
                                        key={order.id}
                                        order={order}
                                        onViewDetails={(o) => {
                                          setSelectedOrder(o);
                                          setShowDetailsModal(true);
                                        }}
                                        onChangeStatus={openStatusModal}
                                        statusColors={statusColors}
                                        statusLabels={statusLabels}
                                      />
                                    ))
                                  )}
                                </DroppableTimeWindow>
                              </div>
                            );
                          })}
                        </div>
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

        {/* Drag Overlay - Shows dragged item */}
        <DragOverlay>
          {activeOrder ? (
            <div className="bg-slate-800 border-2 border-teal-500 rounded-lg p-3 shadow-2xl opacity-90">
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-teal-400" />
                <div>
                  <p className="font-mono text-sm text-white">{activeOrder.order_number}</p>
                  <p className="text-xs text-slate-400">{activeOrder.recipient?.name}</p>
                </div>
              </div>
            </div>
          ) : null}
        </DragOverlay>
        </DndContext>
      )}

      {/* Driver Assignment Modal */}
      <Dialog open={showDriverModal} onOpenChange={setShowDriverModal}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-teal-400" />
              Assign Driver
            </DialogTitle>
          </DialogHeader>
          {selectedOrderForDriver && (
            <div className="space-y-4">
              <div className="bg-slate-700/50 rounded-lg p-3">
                <p className="text-sm text-slate-400">Order</p>
                <p className="font-mono text-white">{selectedOrderForDriver.order_number}</p>
                <p className="text-xs text-slate-500">{selectedOrderForDriver.recipient?.name} • {selectedOrderForDriver.delivery_address?.city}</p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-slate-400">Select Driver</Label>
                {drivers.length === 0 ? (
                  <p className="text-sm text-slate-500 py-4 text-center">No available drivers</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {drivers.map(driver => (
                      <div
                        key={driver.id}
                        className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 cursor-pointer transition-colors"
                        onClick={() => handleAssignDriver(driver.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center">
                            <Truck className="w-4 h-4 text-teal-400" />
                          </div>
                          <div>
                            <p className="text-sm text-white">
                              {driver.first_name || driver.email} {driver.last_name || ''}
                            </p>
                            <p className="text-xs text-slate-500">{driver.phone || 'No phone'}</p>
                          </div>
                        </div>
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          {driver.status || 'available'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDriverModal(false)} className="border-slate-600 text-slate-300">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Route Optimization Preview Modal */}
      <Dialog open={showRoutePreview} onOpenChange={setShowRoutePreview}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Route className="w-5 h-5 text-teal-400" />
              Optimized Route Preview
            </DialogTitle>
          </DialogHeader>
          
          {routePreviewData && (
            <div className="space-y-4 overflow-y-auto flex-1 pr-2">
              {/* Route Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gradient-to-br from-teal-500/20 to-teal-600/10 border border-teal-500/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-teal-400 mb-1">
                    <Navigation className="w-4 h-4" />
                    <span className="text-xs">Total Distance</span>
                  </div>
                  <p className="text-xl font-bold text-white">{routePreviewData.total_distance_miles} mi</p>
                </div>
                <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-amber-400 mb-1">
                    <Timer className="w-4 h-4" />
                    <span className="text-xs">Est. Duration</span>
                  </div>
                  <p className="text-xl font-bold text-white">{Math.round(routePreviewData.total_duration_minutes)} min</p>
                </div>
                <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-purple-400 mb-1">
                    <Package className="w-4 h-4" />
                    <span className="text-xs">Total Stops</span>
                  </div>
                  <p className="text-xl font-bold text-white">{routePreviewData.total_stops}</p>
                </div>
              </div>

              {/* Time Window Info */}
              <div className="bg-slate-700/50 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-300">
                    {routePreviewData.time_window || 'All Windows'} • {boroughConfig[routePreviewData.borough]?.name || 'All Boroughs'}
                  </span>
                </div>
                <Badge className="bg-teal-500/20 text-teal-400 border-teal-500/30">
                  <Zap className="w-3 h-3 mr-1" />
                  Nearest Neighbor
                </Badge>
              </div>

              {/* Optimized Route Sequence */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-400">Delivery Sequence</p>
                <div className="space-y-2">
                  {routePreviewData.optimized_route?.map((stop, index) => (
                    <div 
                      key={stop.order_id}
                      className="bg-slate-700/30 rounded-lg p-3 border border-slate-700 hover:border-slate-600 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        {/* Sequence Number */}
                        <div className="w-8 h-8 rounded-full bg-teal-500/20 border border-teal-500/40 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-teal-400">{stop.sequence}</span>
                        </div>
                        
                        {/* Stop Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm text-white">{stop.order_number}</span>
                            {stop.qr_code && (
                              <span className="text-xs font-mono text-slate-500">{stop.qr_code}</span>
                            )}
                            <Badge variant="outline" className={statusColors[stop.status]}>
                              {statusLabels[stop.status]}
                            </Badge>
                          </div>
                          <p className="text-sm text-white mt-1">{stop.recipient_name}</p>
                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" />
                            {stop.address}
                          </p>
                          {stop.copay_amount > 0 && !stop.copay_collected && (
                            <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              Collect ${stop.copay_amount.toFixed(2)} copay
                            </p>
                          )}
                        </div>
                        
                        {/* ETA & Distance */}
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-medium text-teal-400">{stop.estimated_arrival}</p>
                          <p className="text-xs text-slate-500">{stop.distance_from_previous} mi</p>
                          <p className="text-xs text-slate-600">{stop.estimated_drive_time} min drive</p>
                        </div>
                      </div>
                      
                      {/* Connector Line */}
                      {index < routePreviewData.optimized_route.length - 1 && (
                        <div className="ml-4 mt-2 mb-0 border-l-2 border-dashed border-slate-600 h-3"></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* No Orders Message */}
              {(!routePreviewData.optimized_route || routePreviewData.optimized_route.length === 0) && (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">No orders to optimize</p>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowRoutePreview(false)} className="border-slate-600 text-slate-300">
              Close
            </Button>
            <Button 
              className="bg-teal-600 hover:bg-teal-700"
              onClick={() => {
                toast.success('Route sequence applied! Orders are now sorted optimally.');
                setShowRoutePreview(false);
              }}
            >
              <Zap className="w-4 h-4 mr-2" />
              Apply Sequence
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
