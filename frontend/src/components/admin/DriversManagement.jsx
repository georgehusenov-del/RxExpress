import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
  Truck, Search, CheckCircle, Eye, MoreVertical,
  MapPin, Car, FileText, Star, Package
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { adminAPI } from '@/lib/api';
import { toast } from 'sonner';

const statusColors = {
  available: 'bg-green-500/20 text-green-400 border-green-500/30',
  on_route: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  on_break: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  offline: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

export const DriversManagement = () => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const fetchDrivers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getDrivers();
      setDrivers(response.data.drivers || []);
    } catch (err) {
      console.error('Failed to fetch drivers:', err);
      toast.error('Failed to load drivers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  const handleVerifyDriver = async (driverId) => {
    try {
      await adminAPI.verifyDriver(driverId);
      toast.success('Driver verified successfully');
      fetchDrivers();
    } catch (err) {
      toast.error('Failed to verify driver');
    }
  };

  const filteredDrivers = drivers.filter(driver =>
    driver.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    driver.user?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    driver.user?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    driver.vehicle_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-heading font-semibold text-white">Driver Management</h3>
          <p className="text-sm text-slate-400">Manage registered drivers and verify new ones</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search drivers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-slate-800 border-slate-700 text-white w-64"
            data-testid="search-drivers-input"
          />
        </div>
      </div>

      {/* Drivers Table */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700 hover:bg-slate-700/50">
                <TableHead className="text-slate-400">Driver</TableHead>
                <TableHead className="text-slate-400">Vehicle</TableHead>
                <TableHead className="text-slate-400">Status</TableHead>
                <TableHead className="text-slate-400">Verification</TableHead>
                <TableHead className="text-slate-400">Deliveries</TableHead>
                <TableHead className="text-slate-400">Rating</TableHead>
                <TableHead className="text-slate-400 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    Loading drivers...
                  </TableCell>
                </TableRow>
              ) : filteredDrivers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    No drivers found
                  </TableCell>
                </TableRow>
              ) : (
                filteredDrivers.map((driver) => (
                  <TableRow
                    key={driver.id}
                    className="border-slate-700 hover:bg-slate-700/50"
                    data-testid={`driver-row-${driver.id}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center">
                          <Truck className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-white">
                            {driver.user?.first_name || 'Unknown'} {driver.user?.last_name || ''}
                          </p>
                          <p className="text-sm text-slate-400">{driver.user?.email || 'No email'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-slate-300">
                        <p>{driver.vehicle_type || 'N/A'}</p>
                        <p className="text-sm text-slate-500 font-mono">{driver.vehicle_number || 'N/A'}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[driver.status] || statusColors.offline}>
                        {driver.status || 'offline'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={driver.is_verified
                          ? 'bg-green-500/20 text-green-400 border-green-500/30'
                          : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        }
                      >
                        {driver.is_verified ? 'Verified' : 'Pending'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {driver.total_deliveries || 0}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-slate-300">
                        <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                        <span>{driver.rating?.toFixed(1) || '0.0'}</span>
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
                              setSelectedDriver(driver);
                              setShowDetailsModal(true);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {!driver.is_verified && (
                            <DropdownMenuItem
                              className="text-green-400 hover:bg-slate-700"
                              onClick={() => handleVerifyDriver(driver.id)}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Verify Driver
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

      {/* Driver Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>Driver Details</DialogTitle>
          </DialogHeader>
          {selectedDriver && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-green-600 flex items-center justify-center">
                  <Truck className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">
                    {selectedDriver.user?.first_name || 'Unknown'} {selectedDriver.user?.last_name || ''}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className={statusColors[selectedDriver.status] || statusColors.offline}>
                      {selectedDriver.status || 'offline'}
                    </Badge>
                    <Badge variant="outline" className={selectedDriver.is_verified
                      ? 'bg-green-500/20 text-green-400 border-green-500/30'
                      : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    }>
                      {selectedDriver.is_verified ? 'Verified' : 'Pending'}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3 pt-4 border-t border-slate-700">
                <div className="flex items-center gap-3 text-slate-300">
                  <Car className="w-4 h-4 text-slate-500" />
                  <span>{selectedDriver.vehicle_type || 'N/A'} - {selectedDriver.vehicle_number || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-300">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span>License: {selectedDriver.license_number || 'Not provided'}</span>
                </div>
                {selectedDriver.current_location && (
                  <div className="flex items-center gap-3 text-slate-300">
                    <MapPin className="w-4 h-4 text-slate-500" />
                    <span>
                      {selectedDriver.current_location.latitude?.toFixed(4)}, {selectedDriver.current_location.longitude?.toFixed(4)}
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700">
                <div className="text-center p-3 bg-slate-700/50 rounded-lg">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Package className="w-4 h-4 text-teal-400" />
                  </div>
                  <p className="text-2xl font-bold text-teal-400">{selectedDriver.total_deliveries || 0}</p>
                  <p className="text-xs text-slate-400">Total Deliveries</p>
                </div>
                <div className="text-center p-3 bg-slate-700/50 rounded-lg">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  </div>
                  <p className="text-2xl font-bold text-amber-400">{selectedDriver.rating?.toFixed(1) || '0.0'}</p>
                  <p className="text-xs text-slate-400">Rating</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            {selectedDriver && !selectedDriver.is_verified && (
              <Button
                onClick={() => {
                  handleVerifyDriver(selectedDriver.id);
                  setShowDetailsModal(false);
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Verify Driver
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowDetailsModal(false)} className="border-slate-600">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DriversManagement;
