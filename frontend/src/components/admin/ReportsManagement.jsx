import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart3, TrendingUp, Package, Truck, Users, Building2,
  DollarSign, CheckCircle, Clock, AlertCircle, Calendar as CalendarIcon,
  RefreshCw, MapPin, FileCheck, Download
} from 'lucide-react';
import { reportsAPI } from '@/lib/api';
import { toast } from 'sonner';
import { format, subDays } from 'date-fns';

const boroughColors = {
  Q: 'bg-amber-500',
  B: 'bg-green-500',
  M: 'bg-blue-500',
  X: 'bg-purple-500',
  S: 'bg-red-500',
  Unknown: 'bg-slate-500'
};

const boroughNames = {
  Q: 'Queens',
  B: 'Brooklyn',
  M: 'Manhattan',
  X: 'Bronx',
  S: 'Staten Island'
};

export const ReportsManagement = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [driverPerformance, setDriverPerformance] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date()
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {
        start_date: dateRange.from?.toISOString(),
        end_date: dateRange.to?.toISOString()
      };
      
      const [dashboardRes, driversRes] = await Promise.all([
        reportsAPI.getDashboard(params),
        reportsAPI.getDriverPerformance(params)
      ]);
      
      setDashboardData(dashboardRes.data);
      setDriverPerformance(driversRes.data);
    } catch (err) {
      console.error('Failed to fetch reports:', err);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const exportReport = () => {
    if (!dashboardData) return;
    
    const csvContent = [
      ['Metric', 'Value'],
      ['Total Orders', dashboardData.summary?.total_orders],
      ['Delivered', dashboardData.summary?.delivered],
      ['Pending', dashboardData.summary?.pending],
      ['In Transit', dashboardData.summary?.in_transit],
      ['Failed', dashboardData.summary?.failed],
      ['Success Rate', `${dashboardData.summary?.success_rate}%`],
      ['Total Revenue', `$${dashboardData.summary?.total_revenue?.toFixed(2)}`],
      ['Total PODs', dashboardData.summary?.total_pods],
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rx-expresss-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    toast.success('Report exported');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 text-teal-500 animate-spin" />
      </div>
    );
  }

  const summary = dashboardData?.summary || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-teal-400" />
            Reports & Analytics
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            Comprehensive delivery performance insights
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Date Range Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="border-slate-600 text-slate-300">
                <CalendarIcon className="w-4 h-4 mr-2" />
                {dateRange.from ? format(dateRange.from, 'MMM d') : 'Start'} - {dateRange.to ? format(dateRange.to, 'MMM d') : 'End'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-slate-800 border-slate-700" align="end">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={(range) => setDateRange(range || { from: subDays(new Date(), 30), to: new Date() })}
                numberOfMonths={2}
                className="bg-slate-800"
              />
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="sm" onClick={fetchData} className="border-slate-600 text-slate-300">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={exportReport} className="bg-teal-600 hover:bg-teal-700">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{summary.total_orders || 0}</p>
                <p className="text-xs text-slate-400">Total Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{summary.delivered || 0}</p>
                <p className="text-xs text-slate-400">Delivered</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-teal-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{summary.success_rate || 0}%</p>
                <p className="text-xs text-slate-400">Success Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">${(summary.total_revenue || 0).toFixed(0)}</p>
                <p className="text-xs text-slate-400">Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-800 border border-slate-700">
          <TabsTrigger value="overview" className="data-[state=active]:bg-teal-600">
            Overview
          </TabsTrigger>
          <TabsTrigger value="drivers" className="data-[state=active]:bg-teal-600">
            Drivers
          </TabsTrigger>
          <TabsTrigger value="boroughs" className="data-[state=active]:bg-teal-600">
            Boroughs
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Order Status Breakdown */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-300">Order Status Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(dashboardData?.orders_by_status || {}).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          status === 'delivered' ? 'bg-green-500' :
                          status === 'out_for_delivery' ? 'bg-teal-500' :
                          status === 'failed' ? 'bg-red-500' :
                          status === 'new' ? 'bg-amber-500' : 'bg-slate-500'
                        }`} />
                        <span className="text-sm text-slate-300 capitalize">{status.replace(/_/g, ' ')}</span>
                      </div>
                      <span className="text-sm font-medium text-white">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Pharmacies */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Top Pharmacies
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(dashboardData?.top_pharmacies || []).slice(0, 5).map((pharmacy, idx) => (
                    <div key={pharmacy.pharmacy_id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-xs flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="text-sm text-slate-300 truncate max-w-[150px]">{pharmacy.name}</span>
                      </div>
                      <Badge variant="outline" className="bg-slate-700/50 text-slate-300">
                        {pharmacy.orders} orders
                      </Badge>
                    </div>
                  ))}
                  {(!dashboardData?.top_pharmacies || dashboardData.top_pharmacies.length === 0) && (
                    <p className="text-sm text-slate-500 text-center py-4">No pharmacy data available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Daily Trends Chart (Simple Bar Representation) */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Daily Order Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48 flex items-end gap-1 overflow-x-auto pb-2">
                {(dashboardData?.daily_trends || []).slice(-14).map((day, idx) => {
                  const maxOrders = Math.max(...(dashboardData?.daily_trends || []).map(d => d.orders)) || 1;
                  const height = (day.orders / maxOrders) * 100;
                  return (
                    <div key={idx} className="flex flex-col items-center min-w-[40px]">
                      <div 
                        className="w-8 bg-gradient-to-t from-teal-600 to-teal-400 rounded-t"
                        style={{ height: `${Math.max(height, 5)}%` }}
                        title={`${day.date}: ${day.orders} orders`}
                      />
                      <span className="text-[10px] text-slate-500 mt-1 rotate-45 origin-left">
                        {format(new Date(day.date), 'M/d')}
                      </span>
                    </div>
                  );
                })}
                {(!dashboardData?.daily_trends || dashboardData.daily_trends.length === 0) && (
                  <p className="text-sm text-slate-500 w-full text-center py-12">No trend data available</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* POD Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <FileCheck className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{summary.total_pods || 0}</p>
                    <p className="text-xs text-slate-400">Proof of Deliveries</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{summary.pending || 0}</p>
                    <p className="text-xs text-slate-400">Pending Orders</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{summary.failed || 0}</p>
                    <p className="text-xs text-slate-400">Failed Deliveries</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Drivers Tab */}
        <TabsContent value="drivers" className="mt-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Truck className="w-4 h-4" />
                Driver Performance ({driverPerformance?.summary?.total_drivers || 0} drivers)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-2 px-3 text-xs font-medium text-slate-400">Driver</th>
                      <th className="text-center py-2 px-3 text-xs font-medium text-slate-400">Status</th>
                      <th className="text-center py-2 px-3 text-xs font-medium text-slate-400">Delivered</th>
                      <th className="text-center py-2 px-3 text-xs font-medium text-slate-400">Failed</th>
                      <th className="text-center py-2 px-3 text-xs font-medium text-slate-400">Success Rate</th>
                      <th className="text-center py-2 px-3 text-xs font-medium text-slate-400">Avg Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(driverPerformance?.drivers || []).map((driver) => (
                      <tr key={driver.driver_id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center">
                              <Users className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white">{driver.name || 'Unknown'}</p>
                              <p className="text-xs text-slate-500">{driver.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <Badge variant="outline" className={
                            driver.status === 'available' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                            driver.status === 'busy' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                            'bg-slate-500/20 text-slate-400 border-slate-500/30'
                          }>
                            {driver.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-center text-white font-medium">{driver.delivered}</td>
                        <td className="py-3 px-3 text-center text-red-400">{driver.failed}</td>
                        <td className="py-3 px-3 text-center">
                          <span className={
                            driver.success_rate >= 90 ? 'text-green-400' :
                            driver.success_rate >= 70 ? 'text-amber-400' : 'text-red-400'
                          }>
                            {driver.success_rate}%
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center text-slate-400">
                          {driver.avg_delivery_time_hours > 0 ? `${driver.avg_delivery_time_hours}h` : '-'}
                        </td>
                      </tr>
                    ))}
                    {(!driverPerformance?.drivers || driverPerformance.drivers.length === 0) && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          No driver data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Boroughs Tab */}
        <TabsContent value="boroughs" className="mt-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Orders by Borough
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(dashboardData?.orders_by_borough || {}).map(([borough, count]) => {
                  const totalOrders = summary.total_orders || 1;
                  const percentage = ((count / totalOrders) * 100).toFixed(1);
                  return (
                    <div key={borough} className="p-4 bg-slate-700/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${boroughColors[borough] || 'bg-slate-500'}`} />
                          <span className="text-white font-medium">
                            {boroughNames[borough] || borough || 'Unknown'}
                          </span>
                        </div>
                        <span className="text-2xl font-bold text-white">{count}</span>
                      </div>
                      <div className="w-full bg-slate-600 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${boroughColors[borough] || 'bg-slate-500'}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{percentage}% of total</p>
                    </div>
                  );
                })}
                {(!dashboardData?.orders_by_borough || Object.keys(dashboardData.orders_by_borough).length === 0) && (
                  <div className="col-span-full py-8 text-center text-slate-500">
                    No borough data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsManagement;
