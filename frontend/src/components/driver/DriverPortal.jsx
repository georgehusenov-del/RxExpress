import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
  Truck, Package, MapPin, Clock, CheckCircle, AlertCircle,
  QrCode, Navigation, Phone, User, RefreshCw, LogOut,
  ChevronRight, Thermometer, FileSignature, Upload, Route
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { driverPortalAPI } from '@/lib/api';
import { QRScanner } from '@/components/scanner/QRScanner';
import { ProofOfDeliveryModal } from '@/components/pod/ProofOfDeliveryModal';
import { buildGoogleMapsRouteUrl, buildSingleAddressUrl } from '@/components/maps/DeliveryMap';
import { toast } from 'sonner';

const statusColors = {
  new: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  picked_up: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  in_transit: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  out_for_delivery: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  delivered: 'bg-green-500/20 text-green-400 border-green-500/30',
  failed: 'bg-red-500/20 text-red-400 border-red-500/30',
  canceled: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  confirmed: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  ready_for_pickup: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  assigned: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  cancelled: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

const statusLabels = {
  new: 'New',
  picked_up: 'Picked Up',
  in_transit: 'In Transit',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  failed: 'Failed',
  canceled: 'Canceled',
  assigned: 'Out for Delivery',
  cancelled: 'Canceled',
};

export const DriverPortal = () => {
  const { logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [deliveries, setDeliveries] = useState([]);        // Out for delivery orders
  const [pickups, setPickups] = useState([]);              // New orders for pickup
  const [completedToday, setCompletedToday] = useState([]); // Completed today
  const [loading, setLoading] = useState(true);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanAction, setScanAction] = useState('delivery');
  const [showPodModal, setShowPodModal] = useState(false);
  const [activeTab, setActiveTab] = useState('deliveries');
  const [isOnline, setIsOnline] = useState(false);
  const [modalCopayCollected, setModalCopayCollected] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [profileRes, allDeliveriesRes, completedRes] = await Promise.all([
        driverPortalAPI.getProfile(),
        driverPortalAPI.getDeliveries(),
        driverPortalAPI.getDeliveries('delivered')
      ]);
      
      setProfile(profileRes.data);
      setIsOnline(profileRes.data?.driver?.status !== 'offline');
      
      // Separate deliveries and pickups based on status
      const allOrders = allDeliveriesRes.data.deliveries || [];
      
      // Deliveries tab: out_for_delivery, in_transit, assigned orders (ready to deliver)
      // Sort by stop_sequence (if available from Circuit route optimization)
      const deliveryOrders = allOrders
        .filter(o => ['out_for_delivery', 'in_transit', 'assigned'].includes(o.status))
        .sort((a, b) => {
          // Sort by stop_sequence first (from Circuit optimization)
          const seqA = a.stop_sequence ?? a.circuit_stop_sequence ?? 999;
          const seqB = b.stop_sequence ?? b.circuit_stop_sequence ?? 999;
          if (seqA !== seqB) return seqA - seqB;
          // Fallback to order creation time
          return new Date(a.created_at || 0) - new Date(b.created_at || 0);
        });
      
      // Pick Ups tab: new orders that need pickup (status = new, confirmed, ready_for_pickup, pending)
      const pickupOrders = allOrders.filter(o => 
        ['new', 'pending', 'confirmed', 'ready_for_pickup'].includes(o.status)
      );
      
      setDeliveries(deliveryOrders);
      setPickups(pickupOrders);
      
      // Filter completed deliveries for today only
      const today = new Date().toDateString();
      const todayCompleted = (completedRes.data.deliveries || []).filter(o => {
        const deliveryDate = o.actual_delivery_time || o.updated_at;
        if (deliveryDate) {
          return new Date(deliveryDate).toDateString() === today;
        }
        return false;
      });
      setCompletedToday(todayCompleted);
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
    }, 60000);
    
    return () => clearInterval(locationInterval);
  }, [fetchData]);

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const toggleOnlineStatus = async () => {
    const newStatus = isOnline ? 'offline' : 'available';
    try {
      await driverPortalAPI.updateStatus(newStatus);
      setIsOnline(!isOnline);
      toast.success(isOnline ? 'You are now offline' : 'You are now online');
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
    toast.success(`Package scanned successfully!`);
    setShowScanner(false);
    
    // After successful scan, activate POD modal for deliveries
    if (scanAction === 'delivery' && selectedDelivery) {
      // Small delay to let scanner close properly
      setTimeout(() => {
        setShowPodModal(true);
      }, 300);
    } else {
      // For pickups, just refresh the data
      fetchData();
    }
  };

  // Handle pickup scan - only changes from new to picked_up
  const handlePickupScan = (delivery) => {
    if (['out_for_delivery', 'in_transit', 'assigned'].includes(delivery.status)) {
      toast.error('This package is already out for delivery. No pickup scan needed.');
      return;
    }
    openScanner(delivery, 'pickup');
  };

  // Handle delivery scan - for completing delivery
  const handleDeliveryScan = (delivery) => {
    openScanner(delivery, 'delivery');
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
        {/* Driver Profile Card - Simplified */}
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
                <p className="text-xs text-slate-500">{profile.stats?.total_deliveries || 0} total deliveries</p>
              </div>
              {/* Online/Offline Toggle */}
              <Button
                onClick={toggleOnlineStatus}
                className={`${isOnline ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-600 hover:bg-slate-700'}`}
                data-testid="online-toggle-btn"
              >
                <div className={`w-2 h-2 rounded-full mr-2 ${isOnline ? 'bg-green-300' : 'bg-slate-400'}`} />
                {isOnline ? 'Online' : 'Offline'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Summary - Today's Completed */}
        <Card className="bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{completedToday.length}</p>
                  <p className="text-xs text-slate-400">Completed Today</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-400">{deliveries.length} to deliver</p>
                <p className="text-sm text-slate-400">{pickups.length} to pick up</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3 Tab Navigation */}
        <div className="flex gap-1 bg-slate-800 p-1 rounded-lg">
          <Button
            variant={activeTab === 'deliveries' ? 'default' : 'ghost'}
            className={`flex-1 text-xs ${activeTab === 'deliveries' ? 'bg-teal-600' : ''}`}
            onClick={() => setActiveTab('deliveries')}
            data-testid="tab-deliveries"
          >
            <Truck className="w-3 h-3 mr-1" />
            Deliveries ({deliveries.length})
          </Button>
          <Button
            variant={activeTab === 'pickups' ? 'default' : 'ghost'}
            className={`flex-1 text-xs ${activeTab === 'pickups' ? 'bg-blue-600' : ''}`}
            onClick={() => setActiveTab('pickups')}
            data-testid="tab-pickups"
          >
            <Upload className="w-3 h-3 mr-1" />
            Pick Ups ({pickups.length})
          </Button>
          <Button
            variant={activeTab === 'completed' ? 'default' : 'ghost'}
            className={`flex-1 text-xs ${activeTab === 'completed' ? 'bg-green-600' : ''}`}
            onClick={() => setActiveTab('completed')}
            data-testid="tab-completed"
          >
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed ({completedToday.length})
          </Button>
        </div>

        {/* Deliveries Tab - Orders to deliver */}
        {activeTab === 'deliveries' && (
          <div className="space-y-3">
            {deliveries.length === 0 ? (
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-8 text-center">
                  <Truck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">No deliveries pending</p>
                  <p className="text-xs text-slate-500 mt-1">Orders out for delivery will appear here</p>
                </CardContent>
              </Card>
            ) : (
              deliveries.map((delivery) => (
                <DeliveryCard
                  key={delivery.id}
                  delivery={delivery}
                  type="delivery"
                  onView={() => {
                    setSelectedDelivery(delivery);
                    setShowDeliveryModal(true);
                  }}
                  onScanDelivery={() => handleDeliveryScan(delivery)}
                  onCompletePod={() => {
                    setSelectedDelivery(delivery);
                    setShowPodModal(true);
                  }}
                />
              ))
            )}
          </div>
        )}

        {/* Pick Ups Tab - Orders to pick up */}
        {activeTab === 'pickups' && (
          <div className="space-y-3">
            {pickups.length === 0 ? (
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-8 text-center">
                  <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">No pickups pending</p>
                  <p className="text-xs text-slate-500 mt-1">New orders for pickup will appear here</p>
                </CardContent>
              </Card>
            ) : (
              pickups.map((delivery) => (
                <PickupCard
                  key={delivery.id}
                  delivery={delivery}
                  onView={() => {
                    setSelectedDelivery(delivery);
                    setShowDeliveryModal(true);
                  }}
                  onScanPickup={() => handlePickupScan(delivery)}
                />
              ))
            )}
          </div>
        )}

        {/* Completed Tab - Today's completed deliveries */}
        {activeTab === 'completed' && (
          <div className="space-y-3">
            {completedToday.length === 0 ? (
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-8 text-center">
                  <CheckCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">No completed deliveries today</p>
                  <p className="text-xs text-slate-500 mt-1">Your completed deliveries will appear here</p>
                </CardContent>
              </Card>
            ) : (
              completedToday.map((delivery) => (
                <CompletedCard
                  key={delivery.id}
                  delivery={delivery}
                  onView={() => {
                    setSelectedDelivery(delivery);
                    setShowDeliveryModal(true);
                  }}
                />
              ))
            )}
          </div>
        )}

        {/* Refresh Button */}
        <Button
          variant="outline"
          className="w-full border-slate-700 text-slate-300"
          onClick={fetchData}
          data-testid="refresh-deliveries-btn"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </main>

      {/* Delivery Details Modal */}
      <Dialog open={showDeliveryModal} onOpenChange={(open) => {
        setShowDeliveryModal(open);
        if (!open) setModalCopayCollected(false); // Reset copay checkbox when modal closes
      }}>
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
                {/* Show Pickup Scan only for new orders (not out for delivery) */}
                {['new', 'pending', 'confirmed', 'ready_for_pickup'].includes(selectedDelivery.status) && (
                  <Button
                    onClick={() => {
                      setShowDeliveryModal(false);
                      handlePickupScan(selectedDelivery);
                    }}
                    variant="outline"
                    className="w-full border-blue-500/50 text-blue-400 hover:bg-blue-500/20"
                    data-testid="modal-scan-pickup-btn"
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    Scan for Pickup
                  </Button>
                )}
                
                {/* Show Delivery options only for out_for_delivery orders */}
                {['out_for_delivery', 'in_transit', 'assigned'].includes(selectedDelivery.status) && (
                  <>
                    <Button
                      onClick={() => {
                        setShowDeliveryModal(false);
                        handleDeliveryScan(selectedDelivery);
                      }}
                      variant="outline"
                      className="w-full border-green-500/50 text-green-400 hover:bg-green-500/20"
                    >
                      <QrCode className="w-4 h-4 mr-2" />
                      Scan for Delivery
                    </Button>
                    
                    {/* Copay Collection Checkbox in Modal - Only show if order has copay */}
                    {(selectedDelivery?.copay_amount || 0) > 0 && (
                      <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 w-full">
                        <input
                          type="checkbox"
                          checked={modalCopayCollected}
                          onChange={(e) => setModalCopayCollected(e.target.checked)}
                          className="w-5 h-5 rounded border-2 border-amber-500 bg-slate-700 text-amber-500 focus:ring-amber-500 focus:ring-offset-0 cursor-pointer"
                          data-testid="modal-copay-checkbox"
                        />
                        <div className="flex-1">
                          <span className={`text-sm font-medium ${modalCopayCollected ? 'text-green-400' : 'text-amber-400'}`}>
                            {modalCopayCollected ? '✓ Copay collected' : 'Collect copay'}
                          </span>
                          <span className="text-amber-300 font-bold ml-2">${selectedDelivery.copay_amount.toFixed(2)}</span>
                        </div>
                      </label>
                    )}
                    
                    <Button
                      onClick={() => {
                        setShowDeliveryModal(false);
                        setShowPodModal(true);
                      }}
                      className={`w-full ${((selectedDelivery?.copay_amount || 0) > 0 ? modalCopayCollected : true) ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-600 cursor-not-allowed'}`}
                      disabled={(selectedDelivery?.copay_amount || 0) > 0 && !modalCopayCollected}
                      data-testid="complete-delivery-btn"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Complete Delivery (POD)
                    </Button>
                    
                    {(selectedDelivery?.copay_amount || 0) > 0 && !modalCopayCollected && (
                      <p className="text-xs text-amber-400/70 text-center w-full">
                        Collect ${selectedDelivery.copay_amount.toFixed(2)} copay to enable POD
                      </p>
                    )}
                  </>
                )}
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

      {/* POD Modal */}
      {showPodModal && selectedDelivery && (
        <ProofOfDeliveryModal
          delivery={selectedDelivery}
          onClose={() => {
            setShowPodModal(false);
            setSelectedDelivery(null);
          }}
          onSuccess={() => {
            setShowPodModal(false);
            setSelectedDelivery(null);
            fetchData();
          }}
        />
      )}

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

// Delivery Card Component - For orders to deliver
const DeliveryCard = ({ delivery, onView, onScanDelivery, onCompletePod }) => {
  const [copayCollected, setCopayCollected] = useState(false);
  const hasCopay = (delivery.copay_amount || 0) > 0;
  
  // If no copay, POD is enabled by default
  const canCompletePod = hasCopay ? copayCollected : true;
  
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
            <Package className="w-4 h-4" />
            <span>{delivery.packages?.length || 0} packages</span>
            {delivery.packages?.some(p => p.requires_refrigeration) && (
              <Thermometer className="w-4 h-4 text-cyan-400" />
            )}
            {delivery.packages?.some(p => p.requires_signature) && (
              <FileSignature className="w-4 h-4 text-blue-400" />
            )}
          </div>
        </div>
        
        {/* Copay Collection Checkbox - Only show if order has copay */}
        {hasCopay && (
          <div 
            className="mt-3 pt-3 border-t border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-colors">
              <input
                type="checkbox"
                checked={copayCollected}
                onChange={(e) => setCopayCollected(e.target.checked)}
                className="w-5 h-5 rounded border-2 border-amber-500 bg-slate-700 text-amber-500 focus:ring-amber-500 focus:ring-offset-0 cursor-pointer"
                data-testid={`copay-checkbox-${delivery.id}`}
              />
              <div className="flex-1">
                <span className={`text-sm font-medium ${copayCollected ? 'text-green-400' : 'text-amber-400'}`}>
                  {copayCollected ? '✓ Copay collected' : 'Collect copay'}
                </span>
                <span className="text-amber-300 font-bold ml-2">${delivery.copay_amount.toFixed(2)}</span>
              </div>
            </label>
          </div>
        )}
        
        {/* Action buttons for delivery */}
        <div className={`${hasCopay ? 'mt-2' : 'mt-3 pt-3 border-t border-slate-700'} flex gap-2`} onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 border-green-500/50 text-green-400 hover:bg-green-500/20"
            onClick={onScanDelivery}
            data-testid={`scan-delivery-${delivery.id}`}
          >
            <QrCode className="w-3 h-3 mr-1" />
            Scan Delivery
          </Button>
          <Button
            size="sm"
            className={`flex-1 ${canCompletePod ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-600 cursor-not-allowed'}`}
            onClick={onCompletePod}
            disabled={!canCompletePod}
            data-testid={`complete-pod-${delivery.id}`}
          >
            <CheckCircle className="w-3 h-3 mr-1" />
            Complete POD
          </Button>
        </div>
        
        {/* Warning if copay not collected */}
        {hasCopay && !copayCollected && (
          <p className="text-xs text-amber-400/70 mt-2 text-center">
            Collect ${delivery.copay_amount.toFixed(2)} copay to enable POD
          </p>
        )}
      </CardContent>
    </Card>
  );
};

// Pickup Card Component - For orders to pick up
const PickupCard = ({ delivery, onView, onScanPickup }) => {
  return (
    <Card
      className="bg-slate-800 border-slate-700 cursor-pointer hover:bg-slate-750 transition-colors"
      onClick={onView}
      data-testid={`pickup-card-${delivery.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-mono text-sm text-blue-400">{delivery.order_number}</p>
            <p className="text-xs text-slate-500">{delivery.pharmacy?.name || 'Pharmacy'}</p>
          </div>
          <Badge variant="outline" className={statusColors[delivery.status]}>
            {statusLabels[delivery.status] || delivery.status}
          </Badge>
        </div>
        
        {/* Pickup location */}
        <div className="p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg mb-3">
          <p className="text-xs text-blue-400 mb-1">PICKUP FROM</p>
          <p className="text-sm text-slate-300">
            {delivery.pharmacy?.address?.street || delivery.pickup_address?.street || 'Pharmacy location'}
          </p>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Package className="w-4 h-4" />
            <span>{delivery.packages?.length || 0} packages</span>
            {delivery.packages?.some(p => p.requires_refrigeration) && (
              <Thermometer className="w-4 h-4 text-cyan-400" />
            )}
          </div>
          <ChevronRight className="w-5 h-5 text-slate-500" />
        </div>
        
        {/* Pickup action button */}
        <div className="mt-3 pt-3 border-t border-slate-700" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            className="w-full bg-blue-600 hover:bg-blue-700"
            onClick={onScanPickup}
            data-testid={`scan-pickup-${delivery.id}`}
          >
            <QrCode className="w-3 h-3 mr-2" />
            Scan for Pickup
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Completed Card Component - For completed deliveries
const CompletedCard = ({ delivery, onView }) => {
  const deliveryTime = delivery.actual_delivery_time || delivery.updated_at;
  const timeStr = deliveryTime ? new Date(deliveryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  
  return (
    <Card
      className="bg-slate-800 border-slate-700 cursor-pointer hover:bg-slate-750 transition-colors"
      onClick={onView}
      data-testid={`completed-card-${delivery.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="font-mono text-sm text-green-400">{delivery.order_number}</p>
            <p className="text-xs text-slate-500">{delivery.pharmacy?.name || 'Pharmacy'}</p>
          </div>
          <div className="text-right">
            <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
              Delivered
            </Badge>
            {timeStr && <p className="text-xs text-slate-500 mt-1">{timeStr}</p>}
          </div>
        </div>
        
        <div className="flex items-start gap-2 text-slate-400 text-sm">
          <MapPin className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
          <span>
            {delivery.delivery_address?.street}, {delivery.delivery_address?.city}
          </span>
        </div>
        
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2 text-slate-500 text-xs">
            <Package className="w-3 h-3" />
            <span>{delivery.packages?.length || 0} packages</span>
          </div>
          <div className="flex items-center gap-1 text-green-400 text-xs">
            <CheckCircle className="w-3 h-3" />
            <span>Completed</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DriverPortal;
