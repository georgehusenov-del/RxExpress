import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Truck, Package, MapPin, Clock, CheckCircle, AlertCircle,
  QrCode, Navigation, Phone, User, RefreshCw, LogOut,
  ChevronRight, Star, Thermometer, FileSignature, XCircle
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { driverPortalAPI } from '@/lib/api';
import { QRScanner } from '@/components/scanner/QRScanner';
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
  assigned: 'Assigned',
  picked_up: 'Picked Up',
  in_transit: 'In Transit',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  failed: 'Failed',
};

const driverStatusColors = {
  available: 'bg-green-500',
  on_route: 'bg-blue-500',
  on_break: 'bg-amber-500',
  offline: 'bg-slate-500',
};

export const DriverPortal = () => {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [completedDeliveries, setCompletedDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanAction, setScanAction] = useState('pickup');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [activeTab, setActiveTab] = useState('active');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [profileRes, activeRes, completedRes] = await Promise.all([
        driverPortalAPI.getProfile(),
        driverPortalAPI.getDeliveries(),
        driverPortalAPI.getDeliveries('delivered')
      ]);
      
      setProfile(profileRes.data);
      setDeliveries(activeRes.data.deliveries || []);
      setCompletedDeliveries(completedRes.data.deliveries || []);
    } catch (err) {
      console.error('Failed to fetch driver data:', err);
      if (err.response?.status === 404) {
        toast.error('Driver profile not found. Please contact admin.');
      } else {
        toast.error('Failed to load driver data');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    
    // Update location periodically
    const locationInterval = setInterval(() => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            driverPortalAPI.updateLocation(
              position.coords.latitude,
              position.coords.longitude
            ).catch(console.error);
          },
          () => {},
          { enableHighAccuracy: true, timeout: 5000 }
        );
      }
    }, 60000); // Every minute
    
    return () => clearInterval(locationInterval);
  }, [fetchData]);

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const handleStatusUpdate = async () => {
    if (!selectedDelivery || !newStatus) return;
    
    setUpdatingStatus(true);
    try {
      await driverPortalAPI.updateDeliveryStatus(selectedDelivery.id, newStatus, statusNotes || null);
      toast.success(`Delivery status updated to ${statusLabels[newStatus]}`);
      setShowStatusModal(false);
      setShowDeliveryModal(false);
      setSelectedDelivery(null);
      setNewStatus('');
      setStatusNotes('');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDriverStatusChange = async (status) => {
    try {
      await driverPortalAPI.updateStatus(status);
      toast.success(`Status updated to ${status}`);
      fetchData();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const openScanner = (delivery, action) => {
    setSelectedDelivery(delivery);
    setScanAction(action);
    setShowScanner(true);
  };

  const handleScanSuccess = async (scanResult) => {
    toast.success(`Package scanned for ${scanAction}!`);
    setShowScanner(false);
    fetchData();
  };

  const openStatusModal = (delivery) => {
    setSelectedDelivery(delivery);
    setNewStatus(delivery.status);
    setStatusNotes('');
    setShowStatusModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Truck className="w-12 h-12 text-teal-500 animate-pulse mx-auto mb-4" />
          <p className="text-slate-400">Loading driver portal...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Card className="bg-slate-800 border-slate-700 max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Driver Profile Not Found</h2>
            <p className="text-slate-400 mb-4">
              Your account is not set up as a driver. Please contact an administrator.
            </p>
            <Button onClick={handleLogout} variant="outline" className="border-slate-600">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center">
                <Truck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-heading font-bold text-white">RX Expresss</h1>
                <p className="text-xs text-slate-400">Driver Portal</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-slate-400 hover:text-white"
              data-testid="driver-logout-btn"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Driver Profile Card */}
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-teal-600 flex items-center justify-center">
                <User className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-white">
                  {profile.user?.first_name} {profile.user?.last_name}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-2 h-2 rounded-full ${driverStatusColors[profile.driver?.status] || driverStatusColors.offline}`} />
                  <span className="text-sm text-slate-400 capitalize">{profile.driver?.status || 'Offline'}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-amber-400">
                  <Star className="w-4 h-4 fill-amber-400" />
                  <span className="font-semibold">{profile.stats?.rating?.toFixed(1) || '5.0'}</span>
                </div>
                <p className="text-xs text-slate-500">{profile.stats?.total_deliveries || 0} deliveries</p>
              </div>
            </div>
            
            {/* Status Toggle */}
            <div className="mt-4 pt-4 border-t border-slate-700">
              <Label className="text-sm text-slate-400 mb-2 block">Your Status</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  size="sm"
                  variant={profile.driver?.status === 'available' ? 'default' : 'outline'}
                  className={profile.driver?.status === 'available' ? 'bg-green-600 hover:bg-green-700' : 'border-slate-600'}
                  onClick={() => handleDriverStatusChange('available')}
                  data-testid="status-available-btn"
                >
                  Available
                </Button>
                <Button
                  size="sm"
                  variant={profile.driver?.status === 'on_break' ? 'default' : 'outline'}
                  className={profile.driver?.status === 'on_break' ? 'bg-amber-600 hover:bg-amber-700' : 'border-slate-600'}
                  onClick={() => handleDriverStatusChange('on_break')}
                >
                  On Break
                </Button>
                <Button
                  size="sm"
                  variant={profile.driver?.status === 'offline' ? 'default' : 'outline'}
                  className={profile.driver?.status === 'offline' ? 'bg-slate-600 hover:bg-slate-700' : 'border-slate-600'}
                  onClick={() => handleDriverStatusChange('offline')}
                >
                  Offline
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-gradient-to-br from-teal-500/20 to-teal-600/10 border-teal-500/30">
            <CardContent className="p-4 text-center">
              <Package className="w-8 h-8 text-teal-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{profile.stats?.active_deliveries || 0}</p>
              <p className="text-xs text-slate-400">Active Deliveries</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/30">
            <CardContent className="p-4 text-center">
              <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{profile.stats?.total_deliveries || 0}</p>
              <p className="text-xs text-slate-400">Total Completed</p>
            </CardContent>
          </Card>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 bg-slate-800 p-1 rounded-lg">
          <Button
            variant={activeTab === 'active' ? 'default' : 'ghost'}
            className={`flex-1 ${activeTab === 'active' ? 'bg-teal-600' : ''}`}
            onClick={() => setActiveTab('active')}
          >
            <Package className="w-4 h-4 mr-2" />
            Active ({deliveries.length})
          </Button>
          <Button
            variant={activeTab === 'completed' ? 'default' : 'ghost'}
            className={`flex-1 ${activeTab === 'completed' ? 'bg-teal-600' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Completed
          </Button>
        </div>

        {/* Deliveries List */}
        <div className="space-y-3">
          {activeTab === 'active' && (
            <>
              {deliveries.length === 0 ? (
                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="p-8 text-center">
                    <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">No active deliveries</p>
                    <p className="text-xs text-slate-500 mt-1">New deliveries will appear here</p>
                  </CardContent>
                </Card>
              ) : (
                deliveries.map((delivery) => (
                  <DeliveryCard
                    key={delivery.id}
                    delivery={delivery}
                    onView={() => {
                      setSelectedDelivery(delivery);
                      setShowDeliveryModal(true);
                    }}
                    onScan={(action) => openScanner(delivery, action)}
                    onUpdateStatus={() => openStatusModal(delivery)}
                  />
                ))
              )}
            </>
          )}
          
          {activeTab === 'completed' && (
            <>
              {completedDeliveries.length === 0 ? (
                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="p-8 text-center">
                    <CheckCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">No completed deliveries</p>
                  </CardContent>
                </Card>
              ) : (
                completedDeliveries.slice(0, 10).map((delivery) => (
                  <DeliveryCard
                    key={delivery.id}
                    delivery={delivery}
                    completed
                    onView={() => {
                      setSelectedDelivery(delivery);
                      setShowDeliveryModal(true);
                    }}
                  />
                ))
              )}
            </>
          )}
        </div>

        {/* Refresh Button */}
        <Button
          variant="outline"
          className="w-full border-slate-700 text-slate-300"
          onClick={fetchData}
          data-testid="refresh-deliveries-btn"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Deliveries
        </Button>
      </main>

      {/* Delivery Details Modal */}
      <Dialog open={showDeliveryModal} onOpenChange={setShowDeliveryModal}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Delivery Details</DialogTitle>
          </DialogHeader>
          {selectedDelivery && (
            <div className="space-y-4">
              {/* Order Info */}
              <div className="flex items-center justify-between">
                <span className="font-mono text-teal-400">{selectedDelivery.order_number}</span>
                <Badge variant="outline" className={statusColors[selectedDelivery.status]}>
                  {statusLabels[selectedDelivery.status] || selectedDelivery.status}
                </Badge>
              </div>

              {/* Pharmacy */}
              <div className="p-3 bg-slate-700/50 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">PICKUP FROM</p>
                <p className="text-white font-medium">{selectedDelivery.pharmacy?.name || 'Pharmacy'}</p>
                {selectedDelivery.pharmacy?.address && (
                  <p className="text-sm text-slate-400">
                    {selectedDelivery.pharmacy.address.street}, {selectedDelivery.pharmacy.address.city}
                  </p>
                )}
                {selectedDelivery.pharmacy?.phone && (
                  <a href={`tel:${selectedDelivery.pharmacy.phone}`} className="flex items-center gap-1 text-teal-400 text-sm mt-2">
                    <Phone className="w-3 h-3" />
                    {selectedDelivery.pharmacy.phone}
                  </a>
                )}
              </div>

              {/* Recipient */}
              <div className="p-3 bg-slate-700/50 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">DELIVER TO</p>
                <p className="text-white font-medium">{selectedDelivery.recipient?.name}</p>
                <p className="text-sm text-slate-400">
                  {selectedDelivery.delivery_address?.street}, {selectedDelivery.delivery_address?.city}, {selectedDelivery.delivery_address?.state} {selectedDelivery.delivery_address?.postal_code}
                </p>
                {selectedDelivery.recipient?.phone && (
                  <a href={`tel:${selectedDelivery.recipient.phone}`} className="flex items-center gap-1 text-teal-400 text-sm mt-2">
                    <Phone className="w-3 h-3" />
                    {selectedDelivery.recipient.phone}
                  </a>
                )}
              </div>

              {/* Packages */}
              {selectedDelivery.packages?.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 mb-2">PACKAGES ({selectedDelivery.packages.length})</p>
                  <div className="space-y-2">
                    {selectedDelivery.packages.map((pkg, idx) => (
                      <div key={idx} className="p-2 bg-slate-700/50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-sm text-slate-300">{pkg.qr_code}</span>
                          <div className="flex gap-1">
                            {pkg.requires_signature && (
                              <FileSignature className="w-4 h-4 text-blue-400" />
                            )}
                            {pkg.requires_refrigeration && (
                              <Thermometer className="w-4 h-4 text-cyan-400" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Special Instructions */}
              {selectedDelivery.special_instructions && (
                <div className="p-3 bg-amber-500/20 border border-amber-500/30 rounded-lg">
                  <p className="text-xs text-amber-400 mb-1">SPECIAL INSTRUCTIONS</p>
                  <p className="text-sm text-amber-300">{selectedDelivery.special_instructions}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            {selectedDelivery && !['delivered', 'failed', 'cancelled'].includes(selectedDelivery.status) && (
              <>
                <div className="grid grid-cols-2 gap-2 w-full">
                  <Button
                    onClick={() => {
                      setShowDeliveryModal(false);
                      openScanner(selectedDelivery, 'pickup');
                    }}
                    variant="outline"
                    className="border-blue-500/50 text-blue-400 hover:bg-blue-500/20"
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    Scan Pickup
                  </Button>
                  <Button
                    onClick={() => {
                      setShowDeliveryModal(false);
                      openScanner(selectedDelivery, 'delivery');
                    }}
                    variant="outline"
                    className="border-green-500/50 text-green-400 hover:bg-green-500/20"
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    Scan Delivery
                  </Button>
                </div>
                <Button
                  onClick={() => openStatusModal(selectedDelivery)}
                  className="w-full bg-teal-600 hover:bg-teal-700"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Update Status
                </Button>
              </>
            )}
            {selectedDelivery?.delivery_address && (
              <Button
                variant="outline"
                className="w-full border-slate-600"
                onClick={() => {
                  const address = `${selectedDelivery.delivery_address.street}, ${selectedDelivery.delivery_address.city}, ${selectedDelivery.delivery_address.state} ${selectedDelivery.delivery_address.postal_code}`;
                  window.open(`https://maps.google.com/?q=${encodeURIComponent(address)}`, '_blank');
                }}
              >
                <Navigation className="w-4 h-4 mr-2" />
                Navigate
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Update Modal */}
      <Dialog open={showStatusModal} onOpenChange={setShowStatusModal}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Update Delivery Status</DialogTitle>
          </DialogHeader>
          {selectedDelivery && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-700/50 rounded-lg">
                <p className="font-mono text-sm text-teal-400">{selectedDelivery.order_number}</p>
                <p className="text-xs text-slate-400 mt-1">
                  Current: <Badge variant="outline" className={statusColors[selectedDelivery.status]}>
                    {statusLabels[selectedDelivery.status] || selectedDelivery.status}
                  </Badge>
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">New Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="picked_up">Picked Up</SelectItem>
                    <SelectItem value="in_transit">In Transit</SelectItem>
                    <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Notes (Optional)</Label>
                <Textarea
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  placeholder="Add notes..."
                  className="bg-slate-700 border-slate-600 text-white resize-none"
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusModal(false)} className="border-slate-600">
              Cancel
            </Button>
            <Button
              onClick={handleStatusUpdate}
              disabled={updatingStatus || !newStatus}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {updatingStatus ? 'Updating...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Scanner Modal */}
      {showScanner && selectedDelivery && (
        <QRScanner
          action={scanAction}
          onScanSuccess={handleScanSuccess}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
};

// Delivery Card Component
const DeliveryCard = ({ delivery, completed, onView, onScan, onUpdateStatus }) => {
  return (
    <Card
      className="bg-slate-800 border-slate-700 cursor-pointer hover:bg-slate-750 transition-colors"
      onClick={onView}
      data-testid={`delivery-card-${delivery.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-mono text-sm text-teal-400">{delivery.order_number}</p>
            <p className="text-xs text-slate-500">{delivery.pharmacy?.name || 'Pharmacy'}</p>
          </div>
          <Badge variant="outline" className={statusColors[delivery.status]}>
            {statusLabels[delivery.status] || delivery.status}
          </Badge>
        </div>
        
        <div className="flex items-start gap-2 text-slate-300 text-sm mb-3">
          <MapPin className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
          <span>
            {delivery.delivery_address?.street}, {delivery.delivery_address?.city}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Clock className="w-4 h-4" />
            <span>{delivery.packages?.length || 0} packages</span>
            {delivery.packages?.some(p => p.requires_refrigeration) && (
              <Thermometer className="w-4 h-4 text-cyan-400" />
            )}
            {delivery.packages?.some(p => p.requires_signature) && (
              <FileSignature className="w-4 h-4 text-blue-400" />
            )}
          </div>
          <ChevronRight className="w-5 h-5 text-slate-500" />
        </div>
        
        {!completed && (
          <div className="mt-3 pt-3 border-t border-slate-700 flex gap-2" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 border-slate-600 text-slate-300"
              onClick={() => onScan?.('pickup')}
              data-testid={`scan-pickup-${delivery.id}`}
            >
              <QrCode className="w-3 h-3 mr-1" />
              Pickup
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 border-slate-600 text-slate-300"
              onClick={() => onScan?.('delivery')}
              data-testid={`scan-delivery-${delivery.id}`}
            >
              <QrCode className="w-3 h-3 mr-1" />
              Deliver
            </Button>
            <Button
              size="sm"
              className="bg-teal-600 hover:bg-teal-700"
              onClick={onUpdateStatus}
              data-testid={`update-status-${delivery.id}`}
            >
              <RefreshCw className="w-3 h-3" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DriverPortal;
