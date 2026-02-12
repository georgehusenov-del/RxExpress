import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Package, Truck, Clock, CheckCircle, AlertCircle,
  Plus, RefreshCw, MapPin, Calendar, TrendingUp,
  Users, Building2, BarChart3, QrCode
} from 'lucide-react';
import { ordersAPI, driversAPI } from '@/lib/api';
import { OrdersList } from './OrdersList';
import { CreateDeliveryModal } from './CreateDeliveryModal';
import { QRScanner } from '@/components/scanner/QRScanner';
import { toast } from 'sonner';

const deliveryTypeLabels = {
  same_day: 'Same Day',
  next_day: 'Next Day',
  priority: 'Priority',
  time_window: 'Time Window'
};

export const PharmacyDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    pending: 0,
    in_transit: 0,
    delivered: 0,
    total_today: 0
  });
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [activeTab, setActiveTab] = useState('active');

  const fetchData = useCallback(async () => {
    try {
      const [ordersRes] = await Promise.all([
        ordersAPI.list({ limit: 100 })
      ]);

      const ordersList = ordersRes.data.orders || [];
      setOrders(ordersList);

      // Calculate stats
      const today = new Date().toISOString().split('T')[0];
      setStats({
        pending: ordersList.filter(o => ['pending', 'confirmed', 'ready_for_pickup'].includes(o.status)).length,
        in_transit: ordersList.filter(o => ['assigned', 'picked_up', 'in_transit', 'out_for_delivery'].includes(o.status)).length,
        delivered: ordersList.filter(o => o.status === 'delivered').length,
        total_today: ordersList.filter(o => o.created_at?.startsWith(today)).length
      });
    } catch (err) {
      console.error('Failed to fetch data:', err);
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const activeOrders = orders.filter(o => !['delivered', 'cancelled', 'failed'].includes(o.status));
  const completedOrders = orders.filter(o => ['delivered', 'cancelled', 'failed'].includes(o.status));

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="w-12 h-12 text-teal-600 animate-pulse mx-auto mb-4" />
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center">
                <Truck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-heading font-bold text-slate-900">RX Expresss</h1>
                <p className="text-xs text-slate-500">Pharmacy Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchData}
                data-testid="refresh-dashboard-btn"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button
                className="bg-teal-600 hover:bg-teal-700"
                onClick={() => setShowCreateModal(true)}
                data-testid="create-delivery-btn"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Delivery
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-700">Pending</p>
                  <p className="text-3xl font-heading font-bold text-amber-900">{stats.pending}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-amber-200 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-amber-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700">In Transit</p>
                  <p className="text-3xl font-heading font-bold text-blue-900">{stats.in_transit}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-200 flex items-center justify-center">
                  <Truck className="w-6 h-6 text-blue-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700">Delivered</p>
                  <p className="text-3xl font-heading font-bold text-green-900">{stats.delivered}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-200 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-700">Today's Total</p>
                  <p className="text-3xl font-heading font-bold text-slate-900">{stats.total_today}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-slate-700" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Orders Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="active" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Active ({activeOrders.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Completed ({completedOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            <OrdersList orders={activeOrders} onRefresh={fetchData} />
          </TabsContent>

          <TabsContent value="completed">
            <OrdersList orders={completedOrders} onRefresh={fetchData} showProof />
          </TabsContent>
        </Tabs>
      </main>

      {/* Create Delivery Modal */}
      {showCreateModal && (
        <CreateDeliveryModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
};

export default PharmacyDashboard;
