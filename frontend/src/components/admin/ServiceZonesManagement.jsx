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
  MapPin, Search, Plus, Edit, Trash2, Eye,
  MoreVertical, DollarSign, Clock
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { zonesAPI } from '@/lib/api';
import { toast } from 'sonner';

export const ServiceZonesManagement = () => {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedZone, setSelectedZone] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    zip_codes: '',
    cities: '',
    states: '',
    delivery_fee: 5.99,
    same_day_cutoff: '14:00',
    priority_surcharge: 5.00
  });

  const fetchZones = useCallback(async () => {
    try {
      setLoading(true);
      const response = await zonesAPI.list();
      setZones(response.data.zones || []);
    } catch (err) {
      console.error('Failed to fetch zones:', err);
      toast.error('Failed to load service zones');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchZones();
  }, [fetchZones]);

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      zip_codes: '',
      cities: '',
      states: '',
      delivery_fee: 5.99,
      same_day_cutoff: '14:00',
      priority_surcharge: 5.00
    });
  };

  const handleCreateZone = async () => {
    try {
      const payload = {
        ...formData,
        zip_codes: formData.zip_codes.split(',').map(z => z.trim()).filter(Boolean),
        cities: formData.cities.split(',').map(c => c.trim()).filter(Boolean),
        states: formData.states.split(',').map(s => s.trim()).filter(Boolean),
        delivery_fee: parseFloat(formData.delivery_fee),
        priority_surcharge: parseFloat(formData.priority_surcharge)
      };
      await zonesAPI.create(payload);
      toast.success('Service zone created successfully');
      setShowCreateModal(false);
      resetForm();
      fetchZones();
    } catch (err) {
      toast.error('Failed to create service zone');
    }
  };

  const handleUpdateZone = async () => {
    try {
      const payload = {
        ...formData,
        zip_codes: formData.zip_codes.split(',').map(z => z.trim()).filter(Boolean),
        cities: formData.cities.split(',').map(c => c.trim()).filter(Boolean),
        states: formData.states.split(',').map(s => s.trim()).filter(Boolean),
        delivery_fee: parseFloat(formData.delivery_fee),
        priority_surcharge: parseFloat(formData.priority_surcharge)
      };
      await zonesAPI.update(selectedZone.id, payload);
      toast.success('Service zone updated successfully');
      setShowEditModal(false);
      setSelectedZone(null);
      resetForm();
      fetchZones();
    } catch (err) {
      toast.error('Failed to update service zone');
    }
  };

  const handleDeleteZone = async (zoneId) => {
    if (!confirm('Are you sure you want to delete this service zone?')) return;
    try {
      await zonesAPI.delete(zoneId);
      toast.success('Service zone deleted successfully');
      fetchZones();
    } catch (err) {
      toast.error('Failed to delete service zone');
    }
  };

  const openEditModal = (zone) => {
    setSelectedZone(zone);
    setFormData({
      name: zone.name,
      code: zone.code,
      zip_codes: zone.zip_codes?.join(', ') || '',
      cities: zone.cities?.join(', ') || '',
      states: zone.states?.join(', ') || '',
      delivery_fee: zone.delivery_fee,
      same_day_cutoff: zone.same_day_cutoff,
      priority_surcharge: zone.priority_surcharge
    });
    setShowEditModal(true);
  };

  const filteredZones = zones.filter(zone =>
    zone.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    zone.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const ZoneFormFields = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-slate-300">Zone Name</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., New York City"
            className="bg-slate-700 border-slate-600 text-white"
            data-testid="zone-name-input"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-slate-300">Zone Code</Label>
          <Input
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            placeholder="e.g., NYC"
            className="bg-slate-700 border-slate-600 text-white"
            data-testid="zone-code-input"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-slate-300">ZIP Codes (comma separated)</Label>
        <Input
          value={formData.zip_codes}
          onChange={(e) => setFormData({ ...formData, zip_codes: e.target.value })}
          placeholder="e.g., 10001, 10002, 10003"
          className="bg-slate-700 border-slate-600 text-white"
          data-testid="zone-zip-codes-input"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-slate-300">Cities (comma separated)</Label>
        <Input
          value={formData.cities}
          onChange={(e) => setFormData({ ...formData, cities: e.target.value })}
          placeholder="e.g., New York, Brooklyn, Queens"
          className="bg-slate-700 border-slate-600 text-white"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-slate-300">States (comma separated)</Label>
        <Input
          value={formData.states}
          onChange={(e) => setFormData({ ...formData, states: e.target.value })}
          placeholder="e.g., NY, NJ"
          className="bg-slate-700 border-slate-600 text-white"
        />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label className="text-slate-300">Delivery Fee ($)</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.delivery_fee}
            onChange={(e) => setFormData({ ...formData, delivery_fee: e.target.value })}
            className="bg-slate-700 border-slate-600 text-white"
            data-testid="zone-delivery-fee-input"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-slate-300">Priority Surcharge ($)</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.priority_surcharge}
            onChange={(e) => setFormData({ ...formData, priority_surcharge: e.target.value })}
            className="bg-slate-700 border-slate-600 text-white"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-slate-300">Same-Day Cutoff</Label>
          <Input
            type="time"
            value={formData.same_day_cutoff}
            onChange={(e) => setFormData({ ...formData, same_day_cutoff: e.target.value })}
            className="bg-slate-700 border-slate-600 text-white"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-heading font-semibold text-white">Service Zones</h3>
          <p className="text-sm text-slate-400">Manage delivery service zones and pricing</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search zones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-slate-800 border-slate-700 text-white w-64"
              data-testid="search-zones-input"
            />
          </div>
          <Button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="bg-teal-600 hover:bg-teal-700"
            data-testid="create-zone-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Zone
          </Button>
        </div>
      </div>

      {/* Zones Table */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700 hover:bg-slate-700/50">
                <TableHead className="text-slate-400">Zone</TableHead>
                <TableHead className="text-slate-400">Coverage</TableHead>
                <TableHead className="text-slate-400">Delivery Fee</TableHead>
                <TableHead className="text-slate-400">Cutoff</TableHead>
                <TableHead className="text-slate-400">Status</TableHead>
                <TableHead className="text-slate-400 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    Loading zones...
                  </TableCell>
                </TableRow>
              ) : filteredZones.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    No service zones found
                  </TableCell>
                </TableRow>
              ) : (
                filteredZones.map((zone) => (
                  <TableRow
                    key={zone.id}
                    className="border-slate-700 hover:bg-slate-700/50"
                    data-testid={`zone-row-${zone.id}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-teal-600 flex items-center justify-center">
                          <MapPin className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{zone.name}</p>
                          <p className="text-sm text-slate-400 font-mono">{zone.code}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-300">
                      <div className="text-sm">
                        <p>{zone.zip_codes?.length || 0} ZIP codes</p>
                        <p className="text-slate-500">{zone.cities?.length || 0} cities</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-slate-300">
                        <DollarSign className="w-4 h-4 text-green-400" />
                        <span>{zone.delivery_fee?.toFixed(2)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-slate-300">
                        <Clock className="w-4 h-4 text-amber-400" />
                        <span>{zone.same_day_cutoff || '14:00'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={zone.is_active
                          ? 'bg-green-500/20 text-green-400 border-green-500/30'
                          : 'bg-red-500/20 text-red-400 border-red-500/30'
                        }
                      >
                        {zone.is_active ? 'Active' : 'Inactive'}
                      </Badge>
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
                            onClick={() => openEditModal(zone)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Zone
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-400 hover:bg-slate-700"
                            onClick={() => handleDeleteZone(zone.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
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

      {/* Create Zone Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Service Zone</DialogTitle>
          </DialogHeader>
          <ZoneFormFields />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)} className="border-slate-600">
              Cancel
            </Button>
            <Button onClick={handleCreateZone} className="bg-teal-600 hover:bg-teal-700">
              Create Zone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Zone Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Service Zone</DialogTitle>
          </DialogHeader>
          <ZoneFormFields />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)} className="border-slate-600">
              Cancel
            </Button>
            <Button onClick={handleUpdateZone} className="bg-teal-600 hover:bg-teal-700">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ServiceZonesManagement;
