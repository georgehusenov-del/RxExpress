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
  LogOut, Menu, X, QrCode, DollarSign
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
  // API returns { stats: {...}, recent_orders: [...] }
  const statsData = stats?.stats || stats || {};
  const recentOrders = stats?.recent_orders || [];
  
  const statCards = [
    {
      label: 'Total Users',
      value: statsData?.total_users || 0,
      icon: Users,
      color: 'teal',
      change: '+12%'
    },
    {
      label: 'Active Pharmacies',
      value: statsData?.total_pharmacies || 0,
      icon: Building2,
      color: 'blue',
      change: '+5%'
    },
    {
      label: 'Active Drivers',
      value: statsData?.active_drivers || 0,
      icon: Truck,
      color: 'green',
      change: '+8%'
    },
    {
      label: 'Pending Orders',
      value: statsData?.orders_by_status?.pending || 0,
      icon: Package,
      color: 'amber',
      change: null
    },
    {
      label: 'In Transit',
      value: statsData?.orders_by_status?.in_transit || 0,
      icon: Clock,
      color: 'purple',
      change: null
    },
    {
      label: 'Delivered Today',
      value: statsData?.orders_by_status?.delivered || 0,
      icon: CheckCircle,
      color: 'emerald',
      change: '+15%'
    },
  ];

  const colorClasses = {
    teal: 'from-teal-500/20 to-teal-600/10 border-teal-500/30 text-teal-400',
    blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400',
    green: 'from-green-500/20 to-green-600/10 border-green-500/30 text-green-400',
    amber: 'from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-400',
    purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400',
    emerald: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-400',
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card, index) => (
          <Card
            key={index}
            className={`bg-gradient-to-br ${colorClasses[card.color]} border backdrop-blur`}
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
                </div>
                <div className={`w-12 h-12 rounded-xl bg-slate-800/50 flex items-center justify-center ${colorClasses[card.color].split(' ').pop()}`}>
                  <card.icon className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="border-b border-slate-700">
            <CardTitle className="text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-teal-400" />
              Recent Orders
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {recentOrders?.length > 0 ? (
              <div className="space-y-3">
                {recentOrders.slice(0, 5).map((order, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{order.order_number}</p>
                      <p className="text-xs text-slate-400">{order.pharmacy_name || 'Unknown Pharmacy'}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`${
                        order.status === 'delivered' ? 'border-green-500 text-green-400' :
                        order.status === 'in_transit' ? 'border-blue-500 text-blue-400' :
                        order.status === 'pending' ? 'border-amber-500 text-amber-400' :
                        'border-slate-500 text-slate-400'
                      }`}
                    >
                      {order.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No recent orders</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="border-b border-slate-700">
            <CardTitle className="text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-teal-400" />
              Today's Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Total Orders</span>
                <span className="text-xl font-semibold text-white">{statsData?.total_orders || 0}</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className="bg-teal-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(((statsData?.orders_by_status?.delivered || 0) / (statsData?.total_orders || 1)) * 100, 100)}%` }}
                />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="text-center p-3 bg-slate-700/50 rounded-lg">
                  <p className="text-2xl font-bold text-green-400">{statsData?.orders_by_status?.delivered || 0}</p>
                  <p className="text-xs text-slate-400">Delivered</p>
                </div>
                <div className="text-center p-3 bg-slate-700/50 rounded-lg">
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
      </div>
    </div>
  );
};

export default AdminDashboard;
