import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Truck, Search, CheckCircle, Eye, MoreVertical,
  MapPin, Car, FileText, Star, Package, Plus,
  UserX, UserCheck, Trash2, Edit, RefreshCw
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    vehicle_type: 'car',
    vehicle_number: '',
    license_number: ''
  });
  const [submitting, setSubmitting] = useState(false);

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

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      phone: '',
      vehicle_type: 'car',
      vehicle_number: '',
      license_number: ''
    });
  };

  const handleCreateDriver = async () => {
    if (!formData.email || !formData.password || !formData.first_name || !formData.last_name) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      await adminAPI.createDriver(formData);
      toast.success('Driver created successfully');
      setShowCreateModal(false);
      resetForm();
      fetchDrivers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create driver');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateDriver = async () => {
    if (!selectedDriver) return;

    setSubmitting(true);
    try {
      await adminAPI.updateDriver(selectedDriver.id, {
        vehicle_type: formData.vehicle_type,
        vehicle_number: formData.vehicle_number,
        license_number: formData.license_number
      });
      toast.success('Driver updated successfully');
      setShowEditModal(false);
      setSelectedDriver(null);
      resetForm();
      fetchDrivers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update driver');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyDriver = async (driverId) => {
    try {
      await adminAPI.verifyDriver(driverId);
      toast.success('Driver verified successfully');
      fetchDrivers();
    } catch (err) {
      toast.error('Failed to verify driver');
    }
  };

  const handleActivateDriver = async (driverId) => {
    try {
      await adminAPI.activateDriver(driverId);
      toast.success('Driver activated');
      fetchDrivers();
    } catch (err) {
      toast.error('Failed to activate driver');
    }
  };

  const handleDeactivateDriver = async (driverId) => {
    try {
      await adminAPI.deactivateDriver(driverId);
      toast.success('Driver deactivated');
      fetchDrivers();
    } catch (err) {
      toast.error('Failed to deactivate driver');
    }
  };

  const handleUpdateDriverStatus = async (driverId, status) => {
    try {
      await adminAPI.updateDriverStatus(driverId, status);
      toast.success(`Driver status updated to ${status}`);
      fetchDrivers();
    } catch (err) {
      toast.error('Failed to update driver status');
    }
  };

  const handleDeleteDriver = async (driverId) => {
    if (!confirm('Are you sure you want to delete this driver? This action cannot be undone.')) return;
    
    try {
      await adminAPI.deleteDriver(driverId);
      toast.success('Driver deleted successfully');
      fetchDrivers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete driver');
    }
  };

  const openEditModal = (driver) => {
    setSelectedDriver(driver);
    setFormData({
      ...formData,
      vehicle_type: driver.vehicle_type || 'car',
      vehicle_number: driver.vehicle_number || '',
      license_number: driver.license_number || ''
    });
    setShowEditModal(true);
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
          <p className="text-sm text-slate-400">Manage driver accounts and vehicles</p>
        </div>
        <div className="flex items-center gap-3">
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
          <Button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="bg-teal-600 hover:bg-teal-700"
            data-testid="create-driver-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Driver
          </Button>
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
                <TableHead className="text-slate-400">Account</TableHead>
                <TableHead className="text-slate-400">Deliveries</TableHead>
                <TableHead className="text-slate-400 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                    Loading drivers...
                  </TableCell>
                </TableRow>
              ) : filteredDrivers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-500">
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
                        <p className="capitalize">{driver.vehicle_type || 'N/A'}</p>
                        <p className="text-sm text-slate-500 font-mono">{driver.vehicle_number || 'N/A'}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={driver.status || 'offline'}
                        onValueChange={(value) => handleUpdateDriverStatus(driver.id, value)}
                      >
                        <SelectTrigger className={`w-28 h-8 ${statusColors[driver.status] || statusColors.offline} border`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="available">Available</SelectItem>
                          <SelectItem value="on_route">On Route</SelectItem>
                          <SelectItem value="on_break">On Break</SelectItem>
                          <SelectItem value="offline">Offline</SelectItem>
                        </SelectContent>
                      </Select>
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
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={driver.user?.is_active
                          ? 'bg-green-500/20 text-green-400 border-green-500/30'
                          : 'bg-red-500/20 text-red-400 border-red-500/30'
                        }
                      >
                        {driver.user?.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {driver.total_deliveries || 0}
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
                          <DropdownMenuItem
                            className="text-slate-300 hover:bg-slate-700"
                            onClick={() => openEditModal(driver)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Driver
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-slate-700" />
                          {!driver.is_verified && (
                            <DropdownMenuItem
                              className="text-green-400 hover:bg-slate-700"
                              onClick={() => handleVerifyDriver(driver.id)}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Verify Driver
                            </DropdownMenuItem>
                          )}
                          {driver.user?.is_active ? (
                            <DropdownMenuItem
                              className="text-amber-400 hover:bg-slate-700"
                              onClick={() => handleDeactivateDriver(driver.id)}
                            >
                              <UserX className="w-4 h-4 mr-2" />
                              Deactivate
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              className="text-green-400 hover:bg-slate-700"
                              onClick={() => handleActivateDriver(driver.id)}
                            >
                              <UserCheck className="w-4 h-4 mr-2" />
                              Activate
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator className="bg-slate-700" />
                          <DropdownMenuItem
                            className="text-red-400 hover:bg-slate-700"
                            onClick={() => handleDeleteDriver(driver.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Driver
                          </DropdownMenuItem>
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

      {/* Create Driver Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-teal-400" />
              Create New Driver
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">First Name *</Label>
                <Input
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                  data-testid="driver-first-name"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Last Name *</Label>
                <Input
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                  data-testid="driver-last-name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Email *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
                data-testid="driver-email"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Password *</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
                data-testid="driver-password"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Vehicle Type</Label>
                <Select value={formData.vehicle_type} onValueChange={(v) => setFormData({ ...formData, vehicle_type: v })}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="car">Car</SelectItem>
                    <SelectItem value="van">Van</SelectItem>
                    <SelectItem value="bike">Bike</SelectItem>
                    <SelectItem value="motorcycle">Motorcycle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Vehicle Number</Label>
                <Input
                  value={formData.vehicle_number}
                  onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                  placeholder="ABC-1234"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">License Number</Label>
              <Input
                value={formData.license_number}
                onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)} className="border-slate-600">
              Cancel
            </Button>
            <Button onClick={handleCreateDriver} disabled={submitting} className="bg-teal-600 hover:bg-teal-700">
              {submitting ? 'Creating...' : 'Create Driver'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Driver Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-teal-400" />
              Edit Driver
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Vehicle Type</Label>
                <Select value={formData.vehicle_type} onValueChange={(v) => setFormData({ ...formData, vehicle_type: v })}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="car">Car</SelectItem>
                    <SelectItem value="van">Van</SelectItem>
                    <SelectItem value="bike">Bike</SelectItem>
                    <SelectItem value="motorcycle">Motorcycle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Vehicle Number</Label>
                <Input
                  value={formData.vehicle_number}
                  onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                  placeholder="ABC-1234"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">License Number</Label>
              <Input
                value={formData.license_number}
                onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)} className="border-slate-600">
              Cancel
            </Button>
            <Button onClick={handleUpdateDriver} disabled={submitting} className="bg-teal-600 hover:bg-teal-700">
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                  <p className="text-sm text-slate-400">{selectedDriver.user?.email}</p>
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
                  <span className="capitalize">{selectedDriver.vehicle_type || 'N/A'} - {selectedDriver.vehicle_number || 'N/A'}</span>
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

              <div className="pt-4 border-t border-slate-700">
                <div className="text-center p-3 bg-slate-700/50 rounded-lg">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Package className="w-4 h-4 text-teal-400" />
                  </div>
                  <p className="text-2xl font-bold text-teal-400">{selectedDriver.total_deliveries || 0}</p>
                  <p className="text-xs text-slate-400">Total Deliveries</p>
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
