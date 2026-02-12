import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  BarChart3, Calendar, Package, Truck, DollarSign,
  TrendingUp, Clock, CheckCircle, XCircle, RefreshCw
} from 'lucide-react';
import { adminAPI } from '@/lib/api';
import { toast } from 'sonner';

export const ReportsSection = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getDailyReport(selectedDate);
      setReport(response.data);
    } catch (err) {
      console.error('Failed to fetch report:', err);
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 text-teal-500 animate-pulse mx-auto mb-4" />
          <p className="text-slate-400">Loading report...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-heading font-semibold text-white">Daily Report</h3>
          <p className="text-sm text-slate-400">View delivery performance metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-800 border-slate-700 text-white w-40"
            data-testid="report-date-input"
          />
          <Button
            variant="outline"
            onClick={fetchReport}
            className="border-slate-700 text-slate-300"
            data-testid="refresh-report-btn"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Total Deliveries</p>
                <p className="text-3xl font-heading font-bold text-white">
                  {report?.total_deliveries || 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-teal-500/20 flex items-center justify-center">
                <Package className="w-6 h-6 text-teal-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Completed</p>
                <p className="text-3xl font-heading font-bold text-green-400">
                  {report?.completed_deliveries || 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Failed</p>
                <p className="text-3xl font-heading font-bold text-red-400">
                  {report?.failed_deliveries || 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Total Revenue</p>
                <p className="text-3xl font-heading font-bold text-white">
                  ${report?.total_revenue?.toFixed(2) || '0.00'}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* On-Time Performance */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="border-b border-slate-700">
            <CardTitle className="text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-teal-400" />
              On-Time Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="relative w-32 h-32 mx-auto mb-4">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="#334155"
                    strokeWidth="12"
                    fill="none"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="#14b8a6"
                    strokeWidth="12"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${(report?.on_time_percentage || 0) * 3.52} 352`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">
                    {report?.on_time_percentage?.toFixed(0) || 0}%
                  </span>
                </div>
              </div>
              <p className="text-slate-400">On-time delivery rate</p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-700">
              <div className="flex items-center justify-between text-slate-300">
                <span>Avg. Delivery Time</span>
                <span className="font-semibold">
                  {report?.average_delivery_time_minutes?.toFixed(0) || 0} min
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Deliveries by Type */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="border-b border-slate-700">
            <CardTitle className="text-white flex items-center gap-2">
              <Truck className="w-5 h-5 text-teal-400" />
              Deliveries by Type
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {Object.entries(report?.deliveries_by_type || {}).length > 0 ? (
                Object.entries(report?.deliveries_by_type || {}).map(([type, count]) => {
                  const total = report?.total_deliveries || 1;
                  const percentage = (count / total) * 100;
                  const colors = {
                    same_day: 'bg-blue-500',
                    next_day: 'bg-green-500',
                    priority: 'bg-amber-500',
                    time_window: 'bg-purple-500',
                  };
                  const labels = {
                    same_day: 'Same Day',
                    next_day: 'Next Day',
                    priority: 'Priority',
                    time_window: 'Time Window',
                  };
                  return (
                    <div key={type}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-slate-300">{labels[type] || type}</span>
                        <span className="text-slate-400">{count}</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${colors[type] || 'bg-teal-500'}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No deliveries for this date</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deliveries by Zone */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="border-b border-slate-700">
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-teal-400" />
            Deliveries by Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {Object.entries(report?.deliveries_by_zone || {}).length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(report?.deliveries_by_zone || {}).map(([zone, count]) => (
                <div
                  key={zone}
                  className="p-4 bg-slate-700/50 rounded-lg text-center"
                >
                  <p className="text-2xl font-bold text-white">{count}</p>
                  <p className="text-sm text-slate-400">{zone}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No zone data available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsSection;
