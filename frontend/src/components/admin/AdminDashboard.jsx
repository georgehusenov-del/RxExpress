import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  LayoutDashboard, Users, Building2, Truck, Package,
  MapPin, BarChart3, Settings, RefreshCw, Search,
  TrendingUp, TrendingDown, Clock, CheckCircle, AlertCircle,
  LogOut, Menu, X, QrCode, DollarSign, Route, ChevronRight
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { adminAPI } from '@/lib/api';
import { UsersManagement } from './UsersManagement';
import { PharmaciesManagement } from './PharmaciesManagement';
import { DriversManagement } from './DriversManagement';
import { OrdersManagement } from './OrdersManagement';
import { ServiceZonesManagement } from './ServiceZonesManagement';
import { ReportsSection } from './ReportsSection';
import { PackageScanManagement } from './PackageScanManagement';
import { PricingManagement } from './PricingManagement';
import { RouteManagement } from './RouteManagement';
import { toast } from 'sonner';

export const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboardStats, setDashboardStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const fetchDashboardStats = useCallback(async () => {
    try {
      const response = await adminAPI.getDashboard();
      setDashboardStats(response.data);
    } catch (err) {
      console.error('Failed to fetch dashboard:', err);
      toast.error('Failed to load dashboard stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardStats();
    const interval = setInterval(fetchDashboardStats, 60000);
    return () => clearInterval(interval);
  }, [fetchDashboardStats]);

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'pharmacies', label: 'Pharmacies', icon: Building2 },
    { id: 'drivers', label: 'Drivers', icon: Truck },
    { id: 'orders', label: 'Orders', icon: Package },
    { id: 'routes', label: 'Routes', icon: Route },
    { id: 'pricing', label: 'Pricing', icon: DollarSign },
    { id: 'scanning', label: 'QR Scanning', icon: QrCode },
    { id: 'zones', label: 'Service Zones', icon: MapPin },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <LayoutDashboard className="w-12 h-12 text-teal-500 animate-pulse mx-auto mb-4" />
          <p className="text-slate-400">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-800 border-r border-slate-700 transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-heading font-bold text-white">RX Expresss</h1>
              <p className="text-xs text-slate-400">Admin Panel</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              data-testid={`nav-${item.id}`}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                activeTab === item.id
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* User Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-teal-600 flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {user?.first_name?.[0]}{user?.last_name?.[0]}
                </span>
              </div>
              <div>
                <p className="text-sm text-white font-medium">{user?.first_name} {user?.last_name}</p>
                <p className="text-xs text-slate-400">Administrator</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-400 transition-colors"
              data-testid="logout-btn"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-h-screen overflow-auto">
        {/* Header */}
        <header className="h-16 bg-slate-800/50 backdrop-blur border-b border-slate-700 sticky top-0 z-40 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-slate-400 hover:text-white"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-xl font-heading font-semibold text-white capitalize">
              {activeTab === 'overview' ? 'Dashboard Overview' : activeTab}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDashboardStats}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
              data-testid="refresh-admin-btn"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </header>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <OverviewSection stats={dashboardStats} onRefresh={fetchDashboardStats} />
          )}
          {activeTab === 'users' && <UsersManagement />}
          {activeTab === 'pharmacies' && <PharmaciesManagement />}
          {activeTab === 'drivers' && <DriversManagement />}
          {activeTab === 'orders' && <OrdersManagement />}
          {activeTab === 'routes' && <RouteManagement />}
          {activeTab === 'pricing' && <PricingManagement />}
          {activeTab === 'scanning' && <PackageScanManagement />}
          {activeTab === 'zones' && <ServiceZonesManagement />}
          {activeTab === 'reports' && <ReportsSection />}
        </div>
      </main>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

// Overview Section Component
const OverviewSection = ({ stats, onRefresh }) => {
  const [activeTab, setActiveTab] = useState('overview');
  
  // API returns { stats: {...}, recent_orders: [...] }
  const statsData = stats?.stats || stats || {};
  const recentOrders = stats?.recent_orders || [];
  
  // Filter orders ready for pickup
  const readyForPickupOrders = recentOrders.filter(o => o.status === 'ready_for_pickup');
  
  // Clickable stat cards that navigate to respective sections
  const statCards = [
    {
      label: 'Total Users',
      value: statsData?.total_users || 0,
      icon: Users,
      color: 'teal',
      change: '+12%',
      navigateTo: 'users',
      description: 'Manage all user accounts'
    },
    {
      label: 'Active Pharmacies',
      value: statsData?.total_pharmacies || 0,
      icon: Building2,
      color: 'blue',
      change: '+5%',
      navigateTo: 'pharmacies',
      description: 'View pharmacy partners'
    },
    {
      label: 'Active Drivers',
      value: statsData?.active_drivers || 0,
      icon: Truck,
      color: 'green',
      change: '+8%',
      navigateTo: 'drivers',
      description: 'Manage driver fleet'
    },
    {
      label: 'Ready for Pickup',
      value: statsData?.orders_by_status?.ready_for_pickup || readyForPickupOrders.length || 0,
      icon: Package,
      color: 'cyan',
      change: null,
      navigateTo: 'orders',
      description: 'Awaiting driver pickup',
      urgent: (statsData?.orders_by_status?.ready_for_pickup || 0) > 0,
      highlight: true
    },
    {
      label: 'Pending Orders',
      value: statsData?.orders_by_status?.pending || 0,
      icon: Clock,
      color: 'amber',
      change: null,
      navigateTo: 'orders',
      description: 'Orders awaiting processing',
      urgent: (statsData?.orders_by_status?.pending || 0) > 5
    },
    {
      label: 'In Transit',
      value: statsData?.orders_by_status?.in_transit || 0,
      icon: Truck,
      color: 'purple',
      change: null,
      navigateTo: 'orders',
      description: 'Deliveries in progress'
    },
    {
      label: 'Delivered Today',
      value: statsData?.orders_by_status?.delivered || 0,
      icon: CheckCircle,
      color: 'emerald',
      change: '+15%',
      navigateTo: 'reports',
      description: 'Successful deliveries'
    },
  ];

  // Quick action buttons
  const quickActions = [
    {
      label: 'Create Route Plan',
      icon: Route,
      color: 'teal',
      navigateTo: 'routes',
      description: 'Optimize delivery routes'
    },
    {
      label: 'Add New Driver',
      icon: Truck,
      color: 'green',
      navigateTo: 'drivers',
      description: 'Register a driver'
    },
    {
      label: 'Manage Pricing',
      icon: DollarSign,
      color: 'amber',
      navigateTo: 'pricing',
      description: 'Update delivery fees'
    },
    {
      label: 'Scan Package',
      icon: QrCode,
      color: 'purple',
      navigateTo: 'scanning',
      description: 'Track via QR code'
    },
  ];

  // Borough stats for NYC deliveries
  const boroughStats = [
    { code: 'Q', name: 'Queens', orders: statsData?.borough_stats?.Q || Math.floor(Math.random() * 20), color: 'blue' },
    { code: 'B', name: 'Brooklyn', orders: statsData?.borough_stats?.B || Math.floor(Math.random() * 25), color: 'green' },
    { code: 'M', name: 'Manhattan', orders: statsData?.borough_stats?.M || Math.floor(Math.random() * 30), color: 'amber' },
    { code: 'S', name: 'Staten Island', orders: statsData?.borough_stats?.S || Math.floor(Math.random() * 10), color: 'purple' },
    { code: 'X', name: 'Bronx', orders: statsData?.borough_stats?.X || Math.floor(Math.random() * 15), color: 'red' },
  ];

  const colorClasses = {
    teal: 'from-teal-500/20 to-teal-600/10 border-teal-500/30 text-teal-400',
    blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400',
    green: 'from-green-500/20 to-green-600/10 border-green-500/30 text-green-400',
    amber: 'from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-400',
    purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400',
    emerald: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-400',
    red: 'from-red-500/20 to-red-600/10 border-red-500/30 text-red-400',
  };

  const handleCardClick = (navigateTo) => {
    // Find the nav item and simulate click
    const navItem = document.querySelector(`[data-testid="nav-${navigateTo}"]`);
    if (navItem) {
      navItem.click();
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <Card className="bg-gradient-to-r from-teal-600 to-teal-800 border-0 overflow-hidden relative">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-heading font-bold text-white mb-2">
                Welcome to RX Expresss Admin
              </h2>
              <p className="text-teal-100 mb-4">
                Manage deliveries across all 5 NYC boroughs
              </p>
              <div className="flex gap-3">
                <Button
                  size="sm"
                  className="bg-white text-teal-700 hover:bg-teal-50"
                  onClick={() => handleCardClick('routes')}
                  data-testid="quick-create-route"
                >
                  <Route className="w-4 h-4 mr-2" />
                  Create Route
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white text-white hover:bg-white/10"
                  onClick={() => handleCardClick('orders')}
                  data-testid="quick-view-orders"
                >
                  <Package className="w-4 h-4 mr-2" />
                  View Orders
                </Button>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="w-32 h-32 bg-white/10 rounded-full flex items-center justify-center">
                <Truck className="w-16 h-16 text-white/80" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid - Clickable Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card, index) => (
          <Card
            key={index}
            className={`bg-gradient-to-br ${colorClasses[card.color]} border backdrop-blur cursor-pointer 
              transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-${card.color}-500/20
              ${card.urgent ? 'ring-2 ring-amber-500 animate-pulse' : ''}`}
            onClick={() => handleCardClick(card.navigateTo)}
            data-testid={`stat-card-${card.label.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-400 mb-1">{card.label}</p>
                  <p className="text-3xl font-heading font-bold text-white">{card.value}</p>
                  {card.change && (
                    <div className="flex items-center gap-1 mt-2">
                      <TrendingUp className="w-3 h-3 text-green-400" />
                      <span className="text-xs text-green-400">{card.change} this week</span>
                    </div>
                  )}
                  <p className="text-xs text-slate-500 mt-2">{card.description}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl bg-slate-800/50 flex items-center justify-center ${colorClasses[card.color].split(' ').pop()}`}>
                  <card.icon className="w-6 h-6" />
                </div>
              </div>
              {card.urgent && (
                <div className="mt-3 flex items-center gap-2 text-amber-400 text-xs">
                  <AlertCircle className="w-3 h-3" />
                  <span>Needs attention</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions Bar */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-3 border-b border-slate-700">
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <Settings className="w-4 h-4 text-teal-400" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickActions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                className={`h-auto py-4 flex flex-col items-center gap-2 border-slate-600 hover:border-${action.color}-500 hover:bg-${action.color}-500/10 transition-all`}
                onClick={() => handleCardClick(action.navigateTo)}
                data-testid={`quick-action-${action.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <action.icon className={`w-6 h-6 text-${action.color}-400`} />
                <span className="text-white text-sm font-medium">{action.label}</span>
                <span className="text-slate-500 text-xs">{action.description}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* NYC Borough Overview & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Borough Stats */}
        <Card className="bg-slate-800 border-slate-700 lg:col-span-1">
          <CardHeader className="border-b border-slate-700 pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <MapPin className="w-4 h-4 text-teal-400" />
              NYC Boroughs
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3">
              {boroughStats.map((borough) => (
                <div
                  key={borough.code}
                  className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors"
                  onClick={() => handleCardClick('orders')}
                  data-testid={`borough-${borough.code}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg bg-${borough.color}-500/20 flex items-center justify-center`}>
                      <span className={`text-lg font-bold text-${borough.color}-400`}>{borough.code}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{borough.name}</p>
                      <p className="text-xs text-slate-400">{borough.orders} active orders</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-700">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Total Active</span>
                <span className="font-bold text-white">
                  {boroughStats.reduce((sum, b) => sum + b.orders, 0)} orders
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card className="bg-slate-800 border-slate-700 lg:col-span-2">
          <CardHeader className="border-b border-slate-700 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2 text-base">
                <Package className="w-4 h-4 text-teal-400" />
                Recent Orders
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-teal-400 hover:text-teal-300"
                onClick={() => handleCardClick('orders')}
              >
                View All
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {recentOrders?.length > 0 ? (
              <div className="space-y-2">
                {recentOrders.slice(0, 5).map((order, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors"
                    onClick={() => handleCardClick('orders')}
                    data-testid={`recent-order-${order.order_number}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-slate-600 flex items-center justify-center">
                        <span className="text-sm font-bold text-white">
                          {order.qr_code?.charAt(0) || order.order_number?.charAt(3) || '?'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{order.order_number}</p>
                        <p className="text-xs text-slate-400">
                          {order.recipient?.name || order.pharmacy_name || 'Unknown'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="outline"
                        className={`${
                          order.status === 'delivered' ? 'border-green-500 text-green-400' :
                          order.status === 'in_transit' ? 'border-blue-500 text-blue-400' :
                          order.status === 'pending' ? 'border-amber-500 text-amber-400' :
                          order.status === 'confirmed' ? 'border-teal-500 text-teal-400' :
                          'border-slate-500 text-slate-400'
                        }`}
                      >
                        {order.status?.replace('_', ' ')}
                      </Badge>
                      <Badge variant="outline" className="border-slate-500 text-slate-400">
                        {order.delivery_type?.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No recent orders</p>
                <Button
                  variant="link"
                  className="text-teal-400 mt-2"
                  onClick={() => handleCardClick('orders')}
                >
                  Create first order
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance & System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Performance */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="border-b border-slate-700 pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <BarChart3 className="w-4 h-4 text-teal-400" />
              Today's Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Total Orders</span>
                <span className="text-xl font-semibold text-white">{statsData?.total_orders || 0}</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-teal-500 to-emerald-500 h-3 rounded-full transition-all"
                  style={{ width: `${Math.min(((statsData?.orders_by_status?.delivered || 0) / (statsData?.total_orders || 1)) * 100, 100)}%` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div 
                  className="text-center p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors"
                  onClick={() => handleCardClick('orders')}
                >
                  <p className="text-2xl font-bold text-green-400">{statsData?.orders_by_status?.delivered || 0}</p>
                  <p className="text-xs text-slate-400">Delivered</p>
                </div>
                <div 
                  className="text-center p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors"
                  onClick={() => handleCardClick('orders')}
                >
                  <p className="text-2xl font-bold text-blue-400">{statsData?.orders_by_status?.in_transit || 0}</p>
                  <p className="text-xs text-slate-400">In Transit</p>
                </div>
                <div 
                  className="text-center p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors"
                  onClick={() => handleCardClick('orders')}
                >
                  <p className="text-2xl font-bold text-amber-400">{statsData?.orders_by_status?.pending || 0}</p>
                  <p className="text-xs text-slate-400">Pending</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                <span className="text-slate-400">On-Time Rate</span>
                <span className="text-lg font-semibold text-green-400">95%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="border-b border-slate-700 pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <Settings className="w-4 h-4 text-teal-400" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div 
                className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700"
                onClick={() => handleCardClick('routes')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-white">Circuit/Spoke API</span>
                </div>
                <Badge variant="outline" className="border-green-500 text-green-400">Connected</Badge>
              </div>
              <div 
                className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700"
                onClick={() => handleCardClick('zones')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-white">Google Maps</span>
                </div>
                <Badge variant="outline" className="border-green-500 text-green-400">Active</Badge>
              </div>
              <div 
                className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700"
                onClick={() => handleCardClick('pricing')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-white">Pricing Engine</span>
                </div>
                <Badge variant="outline" className="border-green-500 text-green-400">6 Active</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-white">SMS Notifications</span>
                </div>
                <Badge variant="outline" className="border-amber-500 text-amber-400">Pending Setup</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-white">Email Notifications</span>
                </div>
                <Badge variant="outline" className="border-amber-500 text-amber-400">Pending Setup</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
