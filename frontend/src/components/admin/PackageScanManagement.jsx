import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  QrCode, Search, Package, CheckCircle, Clock,
  MoreVertical, Eye, Scan, BarChart3, User,
  RefreshCw, Filter, Truck, MapPin, Thermometer, FileSignature
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { adminAPI } from '@/lib/api';
import { QRScanner } from '@/components/scanner/QRScanner';
import { toast } from 'sonner';

const actionColors = {
  pickup: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  delivery: 'bg-green-500/20 text-green-400 border-green-500/30',
  verify: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  admin_verify: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

const actionLabels = {
  pickup: 'Pickup',
  delivery: 'Delivery',
  verify: 'Verify',
  admin_verify: 'Admin Verify',
};

// Simplified status labels
const statusLabels = {
  ready_for_pickup: 'Ready',
  assigned: 'Assigned',
  in_transit: 'In Transit',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  failed: 'Failed',
  // Legacy mappings
  pending: 'Ready',
  confirmed: 'Ready',
  picked_up: 'In Transit',
  out_for_delivery: 'In Transit',
};

const statusColors = {
  ready_for_pickup: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  assigned: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  in_transit: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  delivered: 'bg-green-500/20 text-green-400 border-green-500/30',
  cancelled: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  failed: 'bg-red-500/20 text-red-400 border-red-500/30',
  pending: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  confirmed: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  picked_up: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  out_for_delivery: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

export const PackageScanManagement = () => {
  const [activeTab, setActiveTab] = useState('packages');
  const [packages, setPackages] = useState([]);
  const [scans, setScans] = useState([]);
  const [scanStats, setScanStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [scannedFilter, setScannedFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [showScanner, setShowScanner] = useState(false);
  const [showPackageDetails, setShowPackageDetails] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [packagesRes, scansRes, statsRes] = await Promise.all([
        adminAPI.getPackages({ scanned: scannedFilter !== 'all' ? scannedFilter === 'scanned' : undefined }),
        adminAPI.getScans({ action: actionFilter !== 'all' ? actionFilter : undefined, limit: 100 }),
        adminAPI.getScanStats()
      ]);
      
      setPackages(packagesRes.data.packages || []);
      setScans(scansRes.data.scans || []);
      setScanStats(statsRes.data);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      toast.error('Failed to load package data');
    } finally {
      setLoading(false);
    }
  }, [scannedFilter, actionFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleVerifyPackage = async (qrCode) => {
    try {
      await adminAPI.verifyPackage(qrCode);
      toast.success('Package verified successfully');
      fetchData();
    } catch (err) {
      toast.error('Failed to verify package');
    }
  };

  const filteredPackages = packages.filter(pkg =>
    pkg.qr_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pkg.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pkg.recipient_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredScans = scans.filter(scan =>
    scan.qr_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    scan.order_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    scan.scanned_by_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-teal-500/20 to-teal-600/10 border-teal-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Scans</p>
                <p className="text-2xl font-bold text-white">{scanStats?.total_scans || 0}</p>
              </div>
              <Scan className="w-8 h-8 text-teal-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Last 24 Hours</p>
                <p className="text-2xl font-bold text-white">{scanStats?.recent_scans_24h || 0}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Pickups</p>
                <p className="text-2xl font-bold text-white">{scanStats?.scans_by_action?.pickup || 0}</p>
              </div>
              <Package className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-purple-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Deliveries</p>
                <p className="text-2xl font-bold text-white">{scanStats?.scans_by_action?.delivery || 0}</p>
              </div>
              <Truck className="w-8 h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <TabsList className="bg-slate-800">
            <TabsTrigger value="packages" className="data-[state=active]:bg-teal-600">
              <Package className="w-4 h-4 mr-2" />
              Packages
            </TabsTrigger>
            <TabsTrigger value="scans" className="data-[state=active]:bg-teal-600">
              <Scan className="w-4 h-4 mr-2" />
              Scan History
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-teal-600">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowScanner(true)}
              className="bg-teal-600 hover:bg-teal-700"
              data-testid="admin-scan-btn"
            >
              <QrCode className="w-4 h-4 mr-2" />
              Scan Package
            </Button>
            <Button
              variant="outline"
              onClick={fetchData}
              className="border-slate-600 text-slate-300"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Packages Tab */}
        <TabsContent value="packages">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="border-b border-slate-700">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <CardTitle className="text-white flex items-center gap-2">
                  <Package className="w-5 h-5 text-teal-400" />
                  All Packages
                </CardTitle>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Search packages..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 bg-slate-700 border-slate-600 text-white w-56"
                      data-testid="search-packages-input"
                    />
                  </div>
                  <Select value={scannedFilter} onValueChange={setScannedFilter}>
                    <SelectTrigger className="w-36 bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="scanned">Scanned</SelectItem>
                      <SelectItem value="not_scanned">Not Scanned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-slate-700/50">
                    <TableHead className="text-slate-400">QR Code</TableHead>
                    <TableHead className="text-slate-400">Order</TableHead>
                    <TableHead className="text-slate-400">Recipient</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                    <TableHead className="text-slate-400">Scanned</TableHead>
                    <TableHead className="text-slate-400">Requirements</TableHead>
                    <TableHead className="text-slate-400 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                        Loading packages...
                      </TableCell>
                    </TableRow>
                  ) : filteredPackages.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                        No packages found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPackages.map((pkg, idx) => (
                      <TableRow
                        key={`${pkg.id}-${idx}`}
                        className="border-slate-700 hover:bg-slate-700/50"
                        data-testid={`package-row-${pkg.qr_code}`}
                      >
                        <TableCell className="font-mono text-sm text-teal-400">
                          {pkg.qr_code}
                        </TableCell>
                        <TableCell className="text-slate-300">
                          <div>
                            <p className="font-mono text-sm">{pkg.order_number}</p>
                            <p className="text-xs text-slate-500">{pkg.pharmacy_name}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-300">
                          {pkg.recipient_name || 'Unknown'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            pkg.order_status === 'delivered' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                            pkg.order_status === 'in_transit' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                            'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          }>
                            {pkg.order_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {pkg.scanned_at ? (
                            <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Scanned
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-slate-500/20 text-slate-400 border-slate-500/30">
                              <Clock className="w-3 h-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {pkg.requires_signature && (
                              <Badge variant="outline" className="text-xs bg-blue-500/20 text-blue-400 border-blue-500/30">
                                <FileSignature className="w-3 h-3" />
                              </Badge>
                            )}
                            {pkg.requires_refrigeration && (
                              <Badge variant="outline" className="text-xs bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                                <Thermometer className="w-3 h-3" />
                              </Badge>
                            )}
                          </div>
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
                                  setSelectedPackage(pkg);
                                  setShowPackageDetails(true);
                                }}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              {!pkg.admin_verified && (
                                <DropdownMenuItem
                                  className="text-green-400 hover:bg-slate-700"
                                  onClick={() => handleVerifyPackage(pkg.qr_code)}
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Verify Package
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
        </TabsContent>

        {/* Scans Tab */}
        <TabsContent value="scans">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="border-b border-slate-700">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <CardTitle className="text-white flex items-center gap-2">
                  <Scan className="w-5 h-5 text-teal-400" />
                  Scan History
                </CardTitle>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Search scans..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 bg-slate-700 border-slate-600 text-white w-56"
                    />
                  </div>
                  <Select value={actionFilter} onValueChange={setActionFilter}>
                    <SelectTrigger className="w-36 bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Actions</SelectItem>
                      <SelectItem value="pickup">Pickup</SelectItem>
                      <SelectItem value="delivery">Delivery</SelectItem>
                      <SelectItem value="verify">Verify</SelectItem>
                      <SelectItem value="admin_verify">Admin Verify</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-slate-700/50">
                    <TableHead className="text-slate-400">QR Code</TableHead>
                    <TableHead className="text-slate-400">Action</TableHead>
                    <TableHead className="text-slate-400">Scanned By</TableHead>
                    <TableHead className="text-slate-400">Time</TableHead>
                    <TableHead className="text-slate-400">Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                        Loading scans...
                      </TableCell>
                    </TableRow>
                  ) : filteredScans.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                        No scans found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredScans.map((scan, idx) => (
                      <TableRow
                        key={`${scan.id}-${idx}`}
                        className="border-slate-700 hover:bg-slate-700/50"
                      >
                        <TableCell className="font-mono text-sm text-teal-400">
                          {scan.qr_code}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={actionColors[scan.action] || actionColors.verify}>
                            {actionLabels[scan.action] || scan.action}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center">
                              <User className="w-4 h-4 text-slate-400" />
                            </div>
                            <div>
                              <p className="text-slate-300 text-sm">{scan.scanned_by_name || 'Unknown'}</p>
                              <p className="text-xs text-slate-500">{scan.scanned_by_role}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-400 text-sm">
                          {scan.scanned_at ? new Date(scan.scanned_at).toLocaleString() : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {scan.location ? (
                            <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
                              <MapPin className="w-3 h-3 mr-1" />
                              {scan.location.latitude?.toFixed(3)}, {scan.location.longitude?.toFixed(3)}
                            </Badge>
                          ) : (
                            <span className="text-slate-500 text-sm">No location</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Scans by Action */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="border-b border-slate-700">
                <CardTitle className="text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-teal-400" />
                  Scans by Action
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {Object.entries(scanStats?.scans_by_action || {}).map(([action, count]) => {
                    const total = scanStats?.total_scans || 1;
                    const percentage = (count / total) * 100;
                    return (
                      <div key={action}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-slate-300">{actionLabels[action] || action}</span>
                          <span className="text-slate-400">{count}</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              action === 'pickup' ? 'bg-blue-500' :
                              action === 'delivery' ? 'bg-green-500' :
                              action === 'verify' ? 'bg-amber-500' :
                              'bg-purple-500'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {Object.keys(scanStats?.scans_by_action || {}).length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                      <Scan className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>No scan data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Top Scanners */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="border-b border-slate-700">
                <CardTitle className="text-white flex items-center gap-2">
                  <User className="w-5 h-5 text-teal-400" />
                  Top Scanners
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  {scanStats?.top_scanners?.map((scanner, idx) => (
                    <div
                      key={scanner._id}
                      className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          idx === 0 ? 'bg-amber-500' :
                          idx === 1 ? 'bg-slate-400' :
                          idx === 2 ? 'bg-amber-700' :
                          'bg-slate-600'
                        }`}>
                          <span className="text-white font-bold text-sm">{idx + 1}</span>
                        </div>
                        <span className="text-white">{scanner.name || 'Unknown'}</span>
                      </div>
                      <Badge variant="outline" className="bg-teal-500/20 text-teal-400 border-teal-500/30">
                        {scanner.count} scans
                      </Badge>
                    </div>
                  ))}
                  {(!scanStats?.top_scanners || scanStats.top_scanners.length === 0) && (
                    <div className="text-center py-8 text-slate-500">
                      <User className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>No scanner data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* QR Scanner Modal */}
      {showScanner && (
        <QRScanner
          action="admin_verify"
          onScanSuccess={() => {
            setShowScanner(false);
            fetchData();
          }}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Package Details Modal */}
      <Dialog open={showPackageDetails} onOpenChange={setShowPackageDetails}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Package Details</DialogTitle>
          </DialogHeader>
          {selectedPackage && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-700/50 rounded-lg text-center">
                <QrCode className="w-16 h-16 text-teal-400 mx-auto mb-2" />
                <p className="font-mono text-lg text-teal-400">{selectedPackage.qr_code}</p>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Order Number</span>
                  <span className="text-white font-mono">{selectedPackage.order_number}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Pharmacy</span>
                  <span className="text-white">{selectedPackage.pharmacy_name || 'Unknown'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Recipient</span>
                  <span className="text-white">{selectedPackage.recipient_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Order Status</span>
                  <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                    {selectedPackage.order_status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Scanned</span>
                  {selectedPackage.scanned_at ? (
                    <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
                      {new Date(selectedPackage.scanned_at).toLocaleString()}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-slate-500/20 text-slate-400 border-slate-500/30">
                      Not scanned
                    </Badge>
                  )}
                </div>
              </div>

              {/* Requirements */}
              <div className="pt-4 border-t border-slate-700">
                <p className="text-sm text-slate-400 mb-2">Requirements</p>
                <div className="flex gap-2">
                  {selectedPackage.requires_signature && (
                    <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                      <FileSignature className="w-3 h-3 mr-1" />
                      Signature Required
                    </Badge>
                  )}
                  {selectedPackage.requires_refrigeration && (
                    <Badge variant="outline" className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                      <Thermometer className="w-3 h-3 mr-1" />
                      Keep Cold
                    </Badge>
                  )}
                  {!selectedPackage.requires_signature && !selectedPackage.requires_refrigeration && (
                    <span className="text-slate-500">No special requirements</span>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            {selectedPackage && !selectedPackage.admin_verified && (
              <Button
                onClick={() => {
                  handleVerifyPackage(selectedPackage.qr_code);
                  setShowPackageDetails(false);
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Verify Package
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowPackageDetails(false)} className="border-slate-600">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PackageScanManagement;
