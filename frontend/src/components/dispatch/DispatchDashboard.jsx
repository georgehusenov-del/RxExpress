import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  MapPin,
  Navigation,
  Clock,
  Package,
  Truck,
  User,
  Phone,
  CheckCircle,
  AlertCircle,
  Activity,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Crosshair
} from 'lucide-react';
import { ordersAPI, driversAPI, trackingAPI } from '@/lib/api';
import { OrderDetailsModal } from './OrderDetailsModal';
import { AssignDriverModal } from './AssignDriverModal';
import { toast } from 'sonner';

const MAP_BG = 'https://images.unsplash.com/photo-1542382257-80dedb725088?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjh8MHwxfHNlYXJjaHwxfHxjaXR5JTIwbWFwJTIwdG9wJTIwdmlldyUyMHBsYW58ZW58MHx8fHwxNzcwODc1MTE3fDA&ixlib=rb-4.1.0&q=85';

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-amber-500', textColor: 'text-amber-600' },
  confirmed: { label: 'Confirmed', color: 'bg-blue-500', textColor: 'text-blue-600' },
  assigned: { label: 'Assigned', color: 'bg-blue-500', textColor: 'text-blue-600' },
  picked_up: { label: 'Picked Up', color: 'bg-blue-500', textColor: 'text-blue-600' },
  in_transit: { label: 'In Transit', color: 'bg-blue-500', textColor: 'text-blue-600' },
  delivered: { label: 'Delivered', color: 'bg-green-500', textColor: 'text-green-600' },
  cancelled: { label: 'Cancelled', color: 'bg-red-500', textColor: 'text-red-600' },
};

const driverStatusConfig = {
  available: { label: 'Available', color: 'bg-green-500' },
  on_route: { label: 'On Route', color: 'bg-blue-500' },
  on_break: { label: 'On Break', color: 'bg-amber-500' },
  offline: { label: 'Offline', color: 'bg-slate-400' },
};

export const DispatchDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [orderToAssign, setOrderToAssign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapZoom, setMapZoom] = useState(1);
  const [stats, setStats] = useState({ active: 0, pending: 0, completed: 0 });

  const fetchData = useCallback(async () => {
    try {
      const [ordersRes, driversRes] = await Promise.all([
        ordersAPI.list(),
        driversAPI.list(),
      ]);

      setOrders(ordersRes.data.orders || []);
      setDrivers(driversRes.data.drivers || []);

      // Calculate stats
      const ordersList = ordersRes.data.orders || [];
      setStats({
        active: ordersList.filter(o => ['assigned', 'picked_up', 'in_transit'].includes(o.status)).length,
        pending: ordersList.filter(o => ['pending', 'confirmed'].includes(o.status)).length,
        completed: ordersList.filter(o => o.status === 'delivered').length,
      });
    } catch (err) {
      console.error('Failed to fetch data:', err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleAssignDriver = async (orderId, driverId) => {
    try {
      await ordersAPI.assignDriver(orderId, driverId);
      toast.success('Driver assigned successfully');
      setShowAssignModal(false);
      setOrderToAssign(null);
      fetchData();
    } catch (err) {
      toast.error('Failed to assign driver');
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await ordersAPI.updateStatus(orderId, newStatus);
      toast.success(`Order status updated to ${newStatus}`);
      fetchData();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const activeDrivers = drivers.filter(d => d.status !== 'offline');
  const activeOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.status));

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Activity className="w-12 h-12 text-teal-600 animate-pulse mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Loading dispatch dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-heading font-bold text-slate-900">RX Expresss</h1>
              <p className="text-xs text-slate-500">Dispatch Center</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-2xl font-heading font-bold text-blue-600">{stats.active}</p>
            <p className="text-xs text-slate-500">Active</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-heading font-bold text-amber-600">{stats.pending}</p>
            <p className="text-xs text-slate-500">Pending</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-heading font-bold text-green-600">{stats.completed}</p>
            <p className="text-xs text-slate-500">Completed</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            className="ml-4"
            data-testid="refresh-btn"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Orders Sidebar */}
        <div className="w-96 bg-white border-r border-slate-200 flex flex-col">
          <div className="p-4 border-b border-slate-200">
            <h2 className="font-heading font-semibold text-slate-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-teal-600" />
              Active Deliveries
              <Badge variant="secondary" className="ml-auto">{activeOrders.length}</Badge>
            </h2>
          </div>

          <ScrollArea className="flex-1 custom-scrollbar">
            <div className="p-3 space-y-3">
              {activeOrders.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No active deliveries</p>
                </div>
              ) : (
                activeOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onClick={() => setSelectedOrder(order)}
                    onAssign={() => {
                      setOrderToAssign(order);
                      setShowAssignModal(true);
                    }}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Map Area */}
        <div className="flex-1 relative">
          {/* Map Background */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${MAP_BG})`,
              transform: `scale(${mapZoom})`,
              transition: 'transform 0.3s ease',
            }}
          />
          <div className="absolute inset-0 bg-slate-900/10" />

          {/* Map Overlay - Driver Markers */}
          <div className="absolute inset-0 pointer-events-none">
            {activeDrivers.map((driver, idx) => {
              const location = driver.current_location;
              if (!location) return null;
              
              // Calculate position based on location (mock positioning)
              const left = 20 + (idx * 15) + Math.random() * 30;
              const top = 20 + (idx * 12) + Math.random() * 25;
              
              return (
                <DriverMarker
                  key={driver.id}
                  driver={driver}
                  style={{
                    left: `${Math.min(left, 80)}%`,
                    top: `${Math.min(top, 70)}%`,
                  }}
                />
              );
            })}

            {/* Pharmacy Hub Marker */}
            <div
              className="absolute pointer-events-auto"
              style={{ left: '50%', top: '45%', transform: 'translate(-50%, -50%)' }}
            >
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-teal-600 flex items-center justify-center shadow-lg ring-4 ring-teal-200">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <span className="text-xs font-medium bg-white px-2 py-1 rounded shadow text-teal-700">
                    Pharmacy Hub
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Map Controls */}
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            <Button
              size="icon"
              variant="secondary"
              className="bg-white shadow-md hover:bg-slate-50"
              onClick={() => setMapZoom(z => Math.min(z + 0.2, 2))}
              data-testid="zoom-in-btn"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="bg-white shadow-md hover:bg-slate-50"
              onClick={() => setMapZoom(z => Math.max(z - 0.2, 0.5))}
              data-testid="zoom-out-btn"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="bg-white shadow-md hover:bg-slate-50"
              onClick={() => setMapZoom(1)}
              data-testid="reset-zoom-btn"
            >
              <Crosshair className="w-4 h-4" />
            </Button>
          </div>

          {/* Drivers Panel */}
          <div className="absolute bottom-4 left-4 right-4">
            <Card className="bg-white/95 backdrop-blur shadow-lg">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-heading flex items-center gap-2">
                  <User className="w-4 h-4 text-teal-600" />
                  Active Drivers
                  <Badge variant="outline" className="ml-2">{activeDrivers.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2 px-4">
                <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
                  {activeDrivers.length === 0 ? (
                    <p className="text-sm text-slate-500 py-2">No active drivers</p>
                  ) : (
                    activeDrivers.map((driver) => (
                      <DriverBadge key={driver.id} driver={driver} />
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modals */}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onAssign={() => {
            setOrderToAssign(selectedOrder);
            setShowAssignModal(true);
            setSelectedOrder(null);
          }}
          onStatusUpdate={handleStatusUpdate}
        />
      )}

      {showAssignModal && orderToAssign && (
        <AssignDriverModal
          order={orderToAssign}
          drivers={drivers.filter(d => d.status === 'available')}
          onAssign={(driverId) => handleAssignDriver(orderToAssign.id, driverId)}
          onClose={() => {
            setShowAssignModal(false);
            setOrderToAssign(null);
          }}
        />
      )}
    </div>
  );
};

// Order Card Component
const OrderCard = ({ order, onClick, onAssign }) => {
  const status = statusConfig[order.status] || statusConfig.pending;
  const hasDriver = !!order.driver_id;

  return (
    <div
      className="bg-white rounded-lg border border-slate-200 p-4 cursor-pointer hover:shadow-md hover:border-teal-300 transition-all animate-slide-in"
      onClick={onClick}
      data-testid={`order-card-${order.id}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-mono text-sm font-medium text-slate-900">{order.order_number}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <Badge className={`${status.color} text-white text-xs`}>
          {status.label}
        </Badge>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-slate-600">
          <MapPin className="w-4 h-4 text-teal-600 flex-shrink-0" />
          <span className="truncate">
            {order.delivery_address?.street || 'Address pending'}
          </span>
        </div>
        {order.prescriptions && (
          <div className="flex items-center gap-2 text-slate-600">
            <Package className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span>{order.prescriptions.length} item(s)</span>
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
        {hasDriver ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center">
              <Truck className="w-3 h-3 text-teal-600" />
            </div>
            <span className="text-xs text-slate-600">Driver assigned</span>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7"
            onClick={(e) => {
              e.stopPropagation();
              onAssign();
            }}
            data-testid={`assign-driver-btn-${order.id}`}
          >
            Assign Driver
          </Button>
        )}
        <Clock className="w-4 h-4 text-slate-400" />
      </div>
    </div>
  );
};

// Driver Marker Component
const DriverMarker = ({ driver, style }) => {
  const status = driverStatusConfig[driver.status] || driverStatusConfig.offline;

  return (
    <div
      className="absolute pointer-events-auto cursor-pointer group"
      style={style}
    >
      <div className="relative">
        <div className={`w-8 h-8 rounded-full ${status.color} flex items-center justify-center shadow-lg ring-2 ring-white pulse-ring`}>
          <Navigation className="w-4 h-4 text-white" />
        </div>
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
          <div className="bg-slate-900 text-white text-xs px-2 py-1 rounded shadow">
            {driver.vehicle_type} • {status.label}
          </div>
        </div>
      </div>
    </div>
  );
};

// Driver Badge Component
const DriverBadge = ({ driver }) => {
  const status = driverStatusConfig[driver.status] || driverStatusConfig.offline;

  return (
    <div
      className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors min-w-[140px]"
      data-testid={`driver-badge-${driver.id}`}
    >
      <div className="relative">
        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
          <User className="w-5 h-5 text-slate-500" />
        </div>
        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ${status.color} ring-2 ring-white`} />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-900">{driver.vehicle_number}</p>
        <p className="text-xs text-slate-500">{driver.vehicle_type}</p>
      </div>
    </div>
  );
};

export default DispatchDashboard;
