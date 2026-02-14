import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Route, Plus, Play, Send, RefreshCw, Trash2, Package,
  MapPin, Clock, CheckCircle, AlertCircle, Loader2, 
  ChevronRight, Users, Calendar, Zap, TruckIcon
} from 'lucide-react';
import { circuitAPI } from '@/lib/api';
import { toast } from 'sonner';

export const RouteManagement = () => {
  // State
  const [circuitStatus, setCircuitStatus] = useState(null);
  const [plans, setPlans] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [circuitDrivers, setCircuitDrivers] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [planDetails, setPlanDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [operationId, setOperationId] = useState(null);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [assigningDriver, setAssigningDriver] = useState(null); // Track which plan is being assigned
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddOrdersModal, setShowAddOrdersModal] = useState(false);
  const [showPlanDetailsModal, setShowPlanDetailsModal] = useState(false);
  
  // Form state
  const [newPlanDate, setNewPlanDate] = useState(new Date().toISOString().split('T')[0]);
  const [newPlanTitle, setNewPlanTitle] = useState('');
  const [selectedDrivers, setSelectedDrivers] = useState([]);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [filterDate, setFilterDate] = useState('');
  const [filterDeliveryType, setFilterDeliveryType] = useState('');
  const [quickAddRoute, setQuickAddRoute] = useState('');

  // Get next gig number
  const getNextGigNumber = useCallback(() => {
    const gigNumbers = plans
      .map(p => {
        const match = p.title?.match(/Gig (\d+)/i);
        return match ? parseInt(match[1]) : 0;
      })
      .filter(n => n > 0);
    return gigNumbers.length > 0 ? Math.max(...gigNumbers) + 1 : 1;
  }, [plans]);

  // Fetch Circuit status
  const fetchStatus = useCallback(async () => {
    try {
      const response = await circuitAPI.getStatus();
      setCircuitStatus(response.data);
    } catch (err) {
      console.error('Failed to fetch Circuit status:', err);
      setCircuitStatus({ status: 'error', message: 'Connection failed' });
    }
  }, []);

  // Fetch local plans
  const fetchPlans = useCallback(async () => {
    try {
      const response = await circuitAPI.listLocalPlans({});
      setPlans(response.data.plans || []);
    } catch (err) {
      console.error('Failed to fetch plans:', err);
    }
  }, []);

  // Fetch pending orders
  const fetchPendingOrders = useCallback(async () => {
    try {
      const params = {};
      if (filterDate) params.date = filterDate;
      if (filterDeliveryType) params.delivery_type = filterDeliveryType;
      
      const response = await circuitAPI.getPendingOrders(params);
      setPendingOrders(response.data.orders || []);
    } catch (err) {
      console.error('Failed to fetch pending orders:', err);
    }
  }, [filterDate, filterDeliveryType]);

  // Fetch Circuit drivers
  const fetchCircuitDrivers = useCallback(async () => {
    try {
      const response = await circuitAPI.getDrivers();
      setCircuitDrivers(response.data.drivers || []);
    } catch (err) {
      console.error('Failed to fetch Circuit drivers:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([
        fetchStatus(),
        fetchPlans(),
        fetchPendingOrders(),
        fetchCircuitDrivers()
      ]);
      setLoading(false);
    };
    loadAll();
  }, [fetchStatus, fetchPlans, fetchPendingOrders, fetchCircuitDrivers]);

  // Poll for optimization status
  useEffect(() => {
    if (!operationId || !optimizing) return;
    
    const pollInterval = setInterval(async () => {
      try {
        const response = await circuitAPI.getOperation(operationId);
        const operation = response.data;
        
        if (operation.done) {
          setOptimizing(false);
          setOperationId(null);
          
          if (operation.result?.code) {
            toast.error(`Optimization failed: ${operation.result.message}`);
          } else {
            toast.success(`Optimization complete! ${operation.result?.numOptimizedStops || 0} stops optimized`);
            if (operation.result?.skippedStops?.length > 0) {
              toast.warning(`${operation.result.skippedStops.length} stops skipped`);
            }
            fetchPlans();
          }
        }
      } catch (err) {
        console.error('Failed to poll operation:', err);
      }
    }, 3000);
    
    return () => clearInterval(pollInterval);
  }, [operationId, optimizing, fetchPlans]);

  // Create new plan with auto-generated Gig name
  const handleCreatePlan = async () => {
    try {
      const gigNumber = getNextGigNumber();
      const autoTitle = `Gig ${gigNumber}`;
      
      const response = await circuitAPI.createPlanForDate({
        title: newPlanTitle || autoTitle,
        date: newPlanDate,
        driver_ids: selectedDrivers
      });
      
      toast.success(`${newPlanTitle || autoTitle} created!`);
      setShowCreateModal(false);
      setNewPlanTitle('');
      setSelectedDrivers([]);
      fetchPlans();
    } catch (err) {
      console.error('Failed to create plan:', err);
      toast.error(err.response?.data?.detail || 'Failed to create plan');
    }
  };

  // Quick add selected orders to a route
  const handleQuickAddToRoute = async (planId) => {
    if (selectedOrders.length === 0) {
      toast.error('Select orders first');
      return;
    }
    
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;
    
    try {
      await circuitAPI.batchImportOrders(planId, selectedOrders);
      toast.success(`${selectedOrders.length} orders added to ${plan.title}`);
      setSelectedOrders([]);
      fetchPlans();
      fetchPendingOrders();
    } catch (err) {
      console.error('Failed to add orders:', err);
      toast.error(err.response?.data?.detail || 'Failed to add orders');
    }
  };

  // Toggle order selection
  const toggleOrderSelection = (orderId) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  // Select all orders
  const selectAllOrders = () => {
    if (selectedOrders.length === pendingOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(pendingOrders.map(o => o.id));
    }
  };

  // Add orders to plan
  const handleAddOrders = async () => {
    if (!selectedPlan || selectedOrders.length === 0) return;
    
    try {
      const response = await circuitAPI.batchImportOrders(
        selectedPlan.circuit_plan_id,
        selectedOrders
      );
      
      toast.success(`Added ${response.data.success_count} orders to route`);
      if (response.data.failed_count > 0) {
        toast.warning(`${response.data.failed_count} orders failed to import`);
      }
      
      setShowAddOrdersModal(false);
      setSelectedOrders([]);
      fetchPlans();
      fetchPendingOrders();
    } catch (err) {
      console.error('Failed to add orders:', err);
      toast.error(err.response?.data?.detail || 'Failed to add orders');
    }
  };

  // Optimize plan
  const handleOptimize = async (plan) => {
    try {
      setOptimizing(true);
      const response = await circuitAPI.optimizeAndDistribute(plan.circuit_plan_id);
      setOperationId(response.data.operation_id);
      toast.info('Route optimization started...');
    } catch (err) {
      console.error('Failed to optimize:', err);
      toast.error(err.response?.data?.detail || 'Failed to start optimization');
      setOptimizing(false);
    }
  };

  // Distribute plan
  const handleDistribute = async (plan) => {
    try {
      await circuitAPI.distributePlan(plan.circuit_plan_id);
      toast.success('Routes distributed to drivers');
      fetchPlans();
    } catch (err) {
      console.error('Failed to distribute:', err);
      toast.error(err.response?.data?.detail || 'Failed to distribute');
    }
  };

  // View plan details
  const handleViewDetails = async (plan) => {
    try {
      const response = await circuitAPI.getPlanFullStatus(plan.circuit_plan_id);
      setPlanDetails(response.data);
      setShowPlanDetailsModal(true);
    } catch (err) {
      console.error('Failed to fetch plan details:', err);
      toast.error('Failed to load plan details');
    }
  };

  // Delete plan
  const handleDeletePlan = async (plan) => {
    if (!confirm('Are you sure you want to delete this plan? Orders will be unlinked.')) return;
    
    try {
      await circuitAPI.deletePlan(plan.circuit_plan_id);
      toast.success('Plan deleted');
      fetchPlans();
      fetchPendingOrders();
    } catch (err) {
      console.error('Failed to delete plan:', err);
      toast.error('Failed to delete plan');
    }
  };

  // Auto-assign orders by borough
  const handleAutoAssign = async () => {
    setAutoAssigning(true);
    try {
      const response = await circuitAPI.autoAssignByBorough('out_for_delivery');
      const result = response.data;
      
      if (result.total_assigned > 0) {
        toast.success(`Auto-assigned ${result.total_assigned} orders to ${result.gigs_created} gig(s)`);
        
        // Show borough breakdown
        Object.entries(result.by_borough || {}).forEach(([borough, data]) => {
          if (data.orders_count > 0 && !data.error) {
            toast.info(`${borough}: ${data.orders_count} orders → ${data.gig}`);
          }
        });
      } else {
        toast.info('No "out for delivery" orders found to auto-assign');
      }
      
      fetchPlans();
      fetchPendingOrders();
    } catch (err) {
      console.error('Failed to auto-assign:', err);
      toast.error(err.response?.data?.detail || 'Failed to auto-assign orders');
    } finally {
      setAutoAssigning(false);
    }
  };

  // Assign driver to gig
  const handleAssignDriver = async (plan, driverId) => {
    if (!driverId) return;
    
    setAssigningDriver(plan.id);
    try {
      const response = await circuitAPI.assignDriverToGig(plan.circuit_plan_id, driverId);
      toast.success(response.data.message || 'Driver assigned successfully');
      fetchPlans();
    } catch (err) {
      console.error('Failed to assign driver:', err);
      toast.error(err.response?.data?.detail || 'Failed to assign driver');
    } finally {
      setAssigningDriver(null);
    }
  };

  // Toggle driver selection
  const toggleDriverSelection = (driverId) => {
    setSelectedDrivers(prev =>
      prev.includes(driverId)
        ? prev.filter(id => id !== driverId)
        : [...prev, driverId]
    );
  };

  const getStatusBadge = (status) => {
    const styles = {
      created: 'border-blue-500 text-blue-400 bg-blue-500/10',
      optimizing: 'border-amber-500 text-amber-400 bg-amber-500/10',
      optimized: 'border-green-500 text-green-400 bg-green-500/10',
      distributed: 'border-purple-500 text-purple-400 bg-purple-500/10',
      error: 'border-red-500 text-red-400 bg-red-500/10'
    };
    return styles[status] || 'border-slate-500 text-slate-400';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 text-teal-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Route className="w-5 h-5 text-teal-400" />
            Route Management
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            Create and manage delivery routes for drivers
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAutoAssign}
            disabled={autoAssigning}
            className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
            data-testid="auto-assign-btn"
          >
            {autoAssigning ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Zap className="w-4 h-4 mr-2" />
            )}
            Auto-Assign
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchPlans();
              fetchPendingOrders();
              fetchStatus();
            }}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
            data-testid="refresh-routes-btn"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setShowCreateModal(true)}
            className="bg-teal-600 hover:bg-teal-700"
            data-testid="create-route-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Gig
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Route className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{plans.length}</p>
                <p className="text-sm text-slate-400">Active Plans</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Package className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{pendingOrders.length}</p>
                <p className="text-sm text-slate-400">Ready to Route</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{circuitDrivers.length}</p>
                <p className="text-sm text-slate-400">Available Drivers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <TruckIcon className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {plans.filter(p => p.distributed).length}
                </p>
                <p className="text-sm text-slate-400">Distributed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gigs / Route Plans */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <TruckIcon className="w-4 h-4 text-teal-400" />
            Active Gigs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {plans.length === 0 ? (
            <div className="text-center py-8">
              <Route className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 mb-4">No gigs created yet</p>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-teal-600 hover:bg-teal-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Gig
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {plans.map((plan, index) => {
                // Extract a clean display number
                const gigMatch = plan.title?.match(/^Gig (\d+)$/i);
                const routeMatch = plan.title?.match(/^Route (\d+)$/i);
                let displayNumber;
                let displayName;
                
                if (gigMatch) {
                  displayNumber = gigMatch[1];
                  displayName = plan.title;
                } else if (routeMatch && routeMatch[1].length <= 3) {
                  // Only use route number if it's short (1-999)
                  displayNumber = routeMatch[1];
                  displayName = plan.title;
                } else {
                  // For legacy routes with long IDs, use sequential index
                  displayNumber = index + 1;
                  displayName = plan.title?.length > 25 ? plan.title.substring(0, 22) + '...' : plan.title;
                }
                
                // Get assigned driver info
                const assignedDriver = plan.assigned_driver;
                
                return (
                  <div
                    key={plan.id}
                    className="p-4 bg-slate-700/50 rounded-lg border border-slate-600 hover:border-teal-500/50 transition-colors"
                    data-testid={`route-plan-${plan.id}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center shadow-lg">
                          <span className="text-lg font-bold text-white">{displayNumber}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white truncate" title={plan.title}>{displayName}</p>
                          <p className="text-xs text-slate-400">{plan.date}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-3 text-sm flex-wrap">
                      <div className="flex items-center gap-1 text-slate-300">
                        <Package className="w-3 h-3 text-amber-400" />
                        <span className="font-medium">{plan.stops_count}</span> orders
                      </div>
                      {plan.distributed && (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                          Active
                        </Badge>
                      )}
                      {plan.optimization_status === 'done' && !plan.distributed && (
                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                          Optimized
                        </Badge>
                      )}
                      {plan.borough_name && (
                        <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                          {plan.borough_name}
                        </Badge>
                      )}
                    </div>
                    
                    {/* Driver Assignment - One-click dropdown */}
                    <div className="mb-3">
                      {assignedDriver ? (
                        <div className="flex items-center gap-2 p-2 bg-green-500/10 rounded-lg border border-green-500/30">
                          <Users className="w-4 h-4 text-green-400" />
                          <span className="text-sm text-green-400 font-medium truncate">
                            {assignedDriver.name || assignedDriver.email}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              // Reset driver - show dropdown again
                              const planCopy = {...plan};
                              delete planCopy.assigned_driver;
                              setPlans(prev => prev.map(p => p.id === plan.id ? planCopy : p));
                            }}
                            className="h-6 w-6 p-0 ml-auto text-slate-400 hover:text-white hover:bg-slate-600"
                            title="Change driver"
                          >
                            <RefreshCw className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <Select 
                          value="" 
                          onValueChange={(driverId) => handleAssignDriver(plan, driverId)}
                          disabled={assigningDriver === plan.id}
                        >
                          <SelectTrigger 
                            className="w-full h-9 bg-slate-600/50 border-slate-500 text-white text-sm"
                            data-testid={`assign-driver-${plan.id}`}
                          >
                            <SelectValue placeholder={
                              assigningDriver === plan.id 
                                ? "Assigning..." 
                                : "Assign Driver"
                            } />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-700 border-slate-600">
                            {circuitDrivers.map((driver) => (
                              <SelectItem 
                                key={driver.id} 
                                value={driver.id} 
                                className="text-white hover:bg-slate-600"
                              >
                                <div className="flex items-center gap-2">
                                  <Users className="w-3 h-3 text-slate-400" />
                                  {driver.name || driver.email}
                                </div>
                              </SelectItem>
                            ))}
                            {circuitDrivers.length === 0 && (
                              <div className="p-2 text-sm text-slate-400 text-center">
                                No drivers available
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOptimize(plan)}
                        disabled={optimizing || plan.stops_count === 0}
                        className="flex-1 h-8 border-amber-500/50 text-amber-400 hover:bg-amber-500/10 text-xs"
                        title="Optimize route"
                      >
                        {optimizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3 mr-1" />}
                        Optimize
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDistribute(plan)}
                        disabled={plan.optimization_status !== 'done'}
                        className="flex-1 h-8 border-green-500/50 text-green-400 hover:bg-green-500/10 text-xs"
                        title="Send to drivers"
                      >
                        <Send className="w-3 h-3 mr-1" />
                        Send
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeletePlan(plan)}
                        className="h-8 w-8 p-0 text-red-400 hover:bg-red-500/10"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Orders */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-400" />
              Orders Ready for Routing
              {pendingOrders.length > 0 && (
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                  {pendingOrders.length}
                </Badge>
              )}
            </CardTitle>
            <div className="flex gap-2 items-center">
              {/* Quick Add to Gig dropdown - only show when orders selected */}
              {selectedOrders.length > 0 && plans.length > 0 && (
                <Select value="" onValueChange={(planId) => handleQuickAddToRoute(planId)}>
                  <SelectTrigger className="w-48 bg-teal-600 border-teal-500 text-white text-sm">
                    <SelectValue placeholder={`Add ${selectedOrders.length} to Gig`} />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    {plans.map(plan => (
                      <SelectItem key={plan.id} value={plan.id} className="text-white">
                        {plan.title} ({plan.stops_count} orders)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-40 bg-slate-700 border-slate-600 text-white text-sm"
                placeholder="Filter by date"
              />
              <Select value={filterDeliveryType || "all"} onValueChange={(v) => setFilterDeliveryType(v === "all" ? "" : v)}>
                <SelectTrigger className="w-32 bg-slate-700 border-slate-600 text-white text-sm">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="all" className="text-white">All types</SelectItem>
                  <SelectItem value="same_day" className="text-white">Same Day</SelectItem>
                  <SelectItem value="next_day" className="text-white">Next Day</SelectItem>
                  <SelectItem value="priority" className="text-white">Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {pendingOrders.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500/50 mx-auto mb-3" />
              <p className="text-slate-400">All orders have been assigned to routes</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="w-10">
                    <Checkbox
                      checked={selectedOrders.length === pendingOrders.length && pendingOrders.length > 0}
                      onCheckedChange={selectAllOrders}
                      className="border-slate-500"
                    />
                  </TableHead>
                  <TableHead className="text-slate-400">Order #</TableHead>
                  <TableHead className="text-slate-400">Delivery Address</TableHead>
                  <TableHead className="text-slate-400">Type</TableHead>
                  <TableHead className="text-slate-400">Packages</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingOrders.map((order) => (
                  <TableRow 
                    key={order.id} 
                    className={`border-slate-700 cursor-pointer hover:bg-slate-700/50 ${selectedOrders.includes(order.id) ? 'bg-teal-500/10' : ''}`}
                    onClick={() => toggleOrderSelection(order.id)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedOrders.includes(order.id)}
                        onCheckedChange={() => toggleOrderSelection(order.id)}
                        className="border-slate-500"
                      />
                    </TableCell>
                    <TableCell className="text-white font-mono">{order.order_number}</TableCell>
                    <TableCell className="text-slate-300">
                      {order.delivery_address?.street}, {order.delivery_address?.city}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-slate-500 text-slate-300 text-xs">
                        {order.delivery_type?.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {order.packages?.length || 1}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Gig Modal - Simplified */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <TruckIcon className="w-5 h-5 text-teal-400" />
              Create New Gig
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Auto-named: <span className="text-teal-400 font-bold text-lg">Gig {getNextGigNumber()}</span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Delivery Date</Label>
              <Input
                type="date"
                value={newPlanDate}
                onChange={(e) => setNewPlanDate(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            
            {circuitDrivers.length > 0 && (
              <div className="space-y-2">
                <Label className="text-slate-300">Assign Driver (optional)</Label>
                <Select 
                  value={selectedDrivers[0] || "none"} 
                  onValueChange={(v) => setSelectedDrivers(v === "none" ? [] : [v])}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Select a driver" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="none" className="text-slate-400">No driver</SelectItem>
                    {circuitDrivers.map((driver) => (
                      <SelectItem key={driver.id} value={driver.id} className="text-white">
                        {driver.name || driver.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="space-y-2">
              <Label className="text-slate-300">Custom Name (optional)</Label>
              <Input
                value={newPlanTitle}
                onChange={(e) => setNewPlanTitle(e.target.value)}
                placeholder={`Gig ${getNextGigNumber()}`}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCreateModal(false)}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreatePlan}
              className="bg-teal-600 hover:bg-teal-700"
              data-testid="confirm-create-plan"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Gig {getNextGigNumber()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Orders Modal */}
      <Dialog open={showAddOrdersModal} onOpenChange={setShowAddOrdersModal}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Add Orders to Route</DialogTitle>
            <DialogDescription className="text-slate-400">
              Select orders to add to: {selectedPlan?.title}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-slate-400">
                {pendingOrders.length} pending orders available
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedOrders(pendingOrders.map(o => o.id))}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Select All
              </Button>
            </div>
            
            <div className="max-h-96 overflow-y-auto space-y-2">
              {pendingOrders.map((order) => (
                <div
                  key={order.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedOrders.includes(order.id)
                      ? 'bg-teal-500/10 border-teal-500'
                      : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                  }`}
                  onClick={() => toggleOrderSelection(order.id)}
                >
                  <Checkbox
                    checked={selectedOrders.includes(order.id)}
                    className="border-slate-500"
                  />
                  <div className="flex-1">
                    <p className="font-mono text-white">{order.order_number}</p>
                    <p className="text-sm text-slate-400">
                      {order.delivery_address?.street}, {order.delivery_address?.city}
                    </p>
                  </div>
                  <Badge variant="outline" className="border-slate-500 text-slate-300">
                    {order.delivery_type}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddOrdersModal(false);
                setSelectedOrders([]);
              }}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddOrders}
              disabled={selectedOrders.length === 0}
              className="bg-teal-600 hover:bg-teal-700"
              data-testid="confirm-add-orders"
            >
              Add {selectedOrders.length} Orders
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Plan Details Modal */}
      <Dialog open={showPlanDetailsModal} onOpenChange={setShowPlanDetailsModal}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              Plan Details: {planDetails?.circuit_plan?.title}
            </DialogTitle>
          </DialogHeader>
          
          {planDetails && (
            <div className="space-y-4 py-4">
              {/* Status Overview */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-slate-700/50 rounded-lg">
                  <p className="text-sm text-slate-400">Optimization</p>
                  <Badge variant="outline" className={getStatusBadge(planDetails.optimization_status)}>
                    {planDetails.optimization_status || 'pending'}
                  </Badge>
                </div>
                <div className="p-3 bg-slate-700/50 rounded-lg">
                  <p className="text-sm text-slate-400">Distributed</p>
                  <p className="text-white font-medium">
                    {planDetails.distributed ? 'Yes' : 'No'}
                  </p>
                </div>
                <div className="p-3 bg-slate-700/50 rounded-lg">
                  <p className="text-sm text-slate-400">Total Stops</p>
                  <p className="text-white font-medium">{planDetails.stops_count}</p>
                </div>
              </div>

              {/* Drivers */}
              {planDetails.drivers?.length > 0 && (
                <div>
                  <p className="text-sm text-slate-400 mb-2">Assigned Drivers</p>
                  <div className="flex flex-wrap gap-2">
                    {planDetails.drivers.map((driver, i) => (
                      <Badge key={i} variant="outline" className="border-green-500 text-green-400">
                        {driver.name || driver.email}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Routes */}
              {planDetails.routes?.length > 0 && (
                <div>
                  <p className="text-sm text-slate-400 mb-2">Optimized Routes</p>
                  <div className="space-y-2">
                    {planDetails.routes.map((route, i) => (
                      <div key={i} className="p-3 bg-slate-700/50 rounded-lg">
                        <p className="text-white font-medium">Route {i + 1}</p>
                        <p className="text-sm text-slate-400">
                          {route.stopsCount || 0} stops
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Linked Orders */}
              {planDetails.linked_orders?.length > 0 && (
                <div>
                  <p className="text-sm text-slate-400 mb-2">
                    Linked Orders ({planDetails.linked_orders.length})
                  </p>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-700">
                        <TableHead className="text-slate-400">Order #</TableHead>
                        <TableHead className="text-slate-400">Status</TableHead>
                        <TableHead className="text-slate-400">Circuit Stop</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {planDetails.linked_orders.map((order) => (
                        <TableRow key={order.id} className="border-slate-700">
                          <TableCell className="text-white font-mono">
                            {order.order_number}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="border-slate-500 text-slate-300">
                              {order.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-400 text-xs font-mono">
                            {order.circuit_stop_id?.split('/').pop()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPlanDetailsModal(false)}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RouteManagement;
