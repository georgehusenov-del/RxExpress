import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
  DollarSign, Plus, Edit2, Trash2, RefreshCw, Clock,
  Truck, Snowflake, Zap, Calendar, ToggleLeft, ToggleRight
} from 'lucide-react';
import { adminAPI } from '@/lib/api';
import { toast } from 'sonner';

const DELIVERY_TYPES = [
  { value: 'next_day', label: 'Next-Day Delivery', icon: Calendar, description: 'Pickup today, deliver tomorrow with time window' },
  { value: 'same_day', label: 'Same-Day Delivery', icon: Clock, description: 'Cutoff 2pm, deliver same day' },
  { value: 'priority', label: 'Priority Delivery', icon: Zap, description: 'First deliveries of the day' },
  { value: 'time_window', label: 'Time Window', icon: Truck, description: 'Specific time slot delivery' },
  { value: 'scheduled', label: 'Scheduled Bulk', icon: Calendar, description: 'Schedule days in advance, min 15 packages, local only' },
];

export const PricingManagement = () => {
  const [pricing, setPricing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedPricing, setSelectedPricing] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    delivery_type: 'next_day',
    name: '',
    description: '',
    base_price: 0,
    is_active: true,
    time_window_start: '',
    time_window_end: '',
    cutoff_time: '',
    is_addon: false,
    minimum_packages: '',
    local_only: false,
    allow_future_date: false,
  });

  const fetchPricing = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getPricing(showInactive);
      setPricing(response.data.pricing || []);
    } catch (err) {
      console.error('Failed to fetch pricing:', err);
      toast.error('Failed to load pricing configurations');
    } finally {
      setLoading(false);
    }
  }, [showInactive]);

  useEffect(() => {
    fetchPricing();
  }, [fetchPricing]);

  const resetForm = () => {
    setFormData({
      delivery_type: 'next_day',
      name: '',
      description: '',
      base_price: 0,
      is_active: true,
      time_window_start: '',
      time_window_end: '',
      cutoff_time: '',
      is_addon: false,
      minimum_packages: '',
      local_only: false,
      allow_future_date: false,
    });
  };

  const handleCreate = async () => {
    if (!formData.name || formData.base_price < 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const payload = {
        ...formData,
        minimum_packages: formData.minimum_packages ? parseInt(formData.minimum_packages) : null,
      };
      await adminAPI.createPricing(payload);
      toast.success('Pricing configuration created successfully');
      setShowCreateModal(false);
      resetForm();
      fetchPricing();
    } catch (err) {
      console.error('Failed to create pricing:', err);
      toast.error(err.response?.data?.detail || 'Failed to create pricing');
    }
  };

  const handleEdit = async () => {
    if (!selectedPricing) return;

    try {
      await adminAPI.updatePricing(selectedPricing.id, {
        name: formData.name,
        description: formData.description,
        base_price: formData.base_price,
        is_active: formData.is_active,
        time_window_start: formData.time_window_start,
        time_window_end: formData.time_window_end,
        cutoff_time: formData.cutoff_time,
        minimum_packages: formData.minimum_packages ? parseInt(formData.minimum_packages) : null,
        local_only: formData.local_only,
        allow_future_date: formData.allow_future_date,
      });
      toast.success('Pricing configuration updated successfully');
      setShowEditModal(false);
      setSelectedPricing(null);
      resetForm();
      fetchPricing();
    } catch (err) {
      console.error('Failed to update pricing:', err);
      toast.error(err.response?.data?.detail || 'Failed to update pricing');
    }
  };

  const handleDelete = async () => {
    if (!selectedPricing) return;

    try {
      await adminAPI.deletePricing(selectedPricing.id);
      toast.success('Pricing configuration deleted');
      setShowDeleteModal(false);
      setSelectedPricing(null);
      fetchPricing();
    } catch (err) {
      console.error('Failed to delete pricing:', err);
      toast.error(err.response?.data?.detail || 'Failed to delete pricing');
    }
  };

  const handleToggle = async (pricingItem) => {
    try {
      await adminAPI.togglePricing(pricingItem.id);
      toast.success(`Pricing ${pricingItem.is_active ? 'deactivated' : 'activated'}`);
      fetchPricing();
    } catch (err) {
      console.error('Failed to toggle pricing:', err);
      toast.error('Failed to toggle pricing status');
    }
  };

  const openEditModal = (pricingItem) => {
    setSelectedPricing(pricingItem);
    setFormData({
      delivery_type: pricingItem.delivery_type,
      name: pricingItem.name,
      description: pricingItem.description || '',
      base_price: pricingItem.base_price,
      is_active: pricingItem.is_active,
      time_window_start: pricingItem.time_window_start || '',
      time_window_end: pricingItem.time_window_end || '',
      cutoff_time: pricingItem.cutoff_time || '',
      is_addon: pricingItem.is_addon || false,
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (pricingItem) => {
    setSelectedPricing(pricingItem);
    setShowDeleteModal(true);
  };

  const getDeliveryTypeInfo = (type) => {
    return DELIVERY_TYPES.find(dt => dt.value === type) || DELIVERY_TYPES[0];
  };

  const getTypeIcon = (type, isAddon) => {
    if (isAddon) return Snowflake;
    const typeInfo = getDeliveryTypeInfo(type);
    return typeInfo.icon;
  };

  const getTypeBadgeColor = (type, isAddon) => {
    if (isAddon) return 'border-cyan-500 text-cyan-400 bg-cyan-500/10';
    const colors = {
      next_day: 'border-blue-500 text-blue-400 bg-blue-500/10',
      same_day: 'border-amber-500 text-amber-400 bg-amber-500/10',
      priority: 'border-purple-500 text-purple-400 bg-purple-500/10',
      time_window: 'border-green-500 text-green-400 bg-green-500/10',
    };
    return colors[type] || 'border-slate-500 text-slate-400';
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
            <DollarSign className="w-5 h-5 text-teal-400" />
            Delivery Pricing Management
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            Configure pricing for delivery types: Next-Day, Same-Day, Priority, and Refrigerated add-ons
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch
              id="show-inactive"
              checked={showInactive}
              onCheckedChange={setShowInactive}
            />
            <Label htmlFor="show-inactive" className="text-slate-400 text-sm">
              Show Inactive
            </Label>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPricing}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
            data-testid="refresh-pricing-btn"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="bg-teal-600 hover:bg-teal-700"
            data-testid="create-pricing-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Pricing
          </Button>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      {pricing.length === 0 ? (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="py-12 text-center">
            <DollarSign className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 mb-4">No pricing configurations found</p>
            <Button
              onClick={() => {
                resetForm();
                setShowCreateModal(true);
              }}
              className="bg-teal-600 hover:bg-teal-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create First Pricing
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pricing.map((item) => {
            const TypeIcon = getTypeIcon(item.delivery_type, item.is_addon);
            return (
              <Card
                key={item.id}
                className={`bg-slate-800 border-slate-700 ${!item.is_active ? 'opacity-60' : ''}`}
                data-testid={`pricing-card-${item.id}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        item.is_addon ? 'bg-cyan-500/20' : 'bg-teal-500/20'
                      }`}>
                        <TypeIcon className={`w-5 h-5 ${item.is_addon ? 'text-cyan-400' : 'text-teal-400'}`} />
                      </div>
                      <div>
                        <CardTitle className="text-white text-base">{item.name}</CardTitle>
                        <Badge
                          variant="outline"
                          className={`mt-1 text-xs ${getTypeBadgeColor(item.delivery_type, item.is_addon)}`}
                        >
                          {item.is_addon ? 'Add-on' : getDeliveryTypeInfo(item.delivery_type).label}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggle(item)}
                      className={item.is_active ? 'text-green-400 hover:text-green-300' : 'text-slate-500 hover:text-slate-400'}
                      data-testid={`toggle-pricing-${item.id}`}
                    >
                      {item.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="space-y-3">
                    {item.description && (
                      <p className="text-sm text-slate-400">{item.description}</p>
                    )}
                    
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-white">${item.base_price.toFixed(2)}</span>
                      <span className="text-slate-400 text-sm">{item.is_addon ? 'add-on fee' : 'base price'}</span>
                    </div>

                    {/* Time Window Info */}
                    {(item.time_window_start || item.time_window_end) && (
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Clock className="w-4 h-4" />
                        <span>Window: {item.time_window_start} - {item.time_window_end}</span>
                      </div>
                    )}

                    {/* Cutoff Time */}
                    {item.cutoff_time && (
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Clock className="w-4 h-4" />
                        <span>Cutoff: {item.cutoff_time}</span>
                      </div>
                    )}

                    {/* Status Badge */}
                    <div className="flex items-center gap-2 pt-2">
                      <Badge
                        variant="outline"
                        className={item.is_active
                          ? 'border-green-500 text-green-400'
                          : 'border-slate-500 text-slate-400'
                        }
                      >
                        {item.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t border-slate-700">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(item)}
                        className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                        data-testid={`edit-pricing-${item.id}`}
                      >
                        <Edit2 className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDeleteModal(item)}
                        className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                        data-testid={`delete-pricing-${item.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={showCreateModal || showEditModal} onOpenChange={(open) => {
        if (!open) {
          setShowCreateModal(false);
          setShowEditModal(false);
          setSelectedPricing(null);
          resetForm();
        }
      }}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">
              {showEditModal ? 'Edit Pricing Configuration' : 'Create Pricing Configuration'}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {showEditModal ? 'Update the pricing details below' : 'Set up pricing for a delivery type'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Delivery Type (only for create) */}
            {!showEditModal && (
              <div className="space-y-2">
                <Label className="text-slate-300">Delivery Type *</Label>
                <Select
                  value={formData.delivery_type}
                  onValueChange={(value) => setFormData({ ...formData, delivery_type: value })}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Select delivery type" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    {DELIVERY_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value} className="text-white hover:bg-slate-600">
                        <div className="flex items-center gap-2">
                          <type.icon className="w-4 h-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Name */}
            <div className="space-y-2">
              <Label className="text-slate-300">Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Next-Day Standard"
                className="bg-slate-700 border-slate-600 text-white"
                data-testid="pricing-name-input"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-slate-300">Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this pricing"
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            {/* Base Price */}
            <div className="space-y-2">
              <Label className="text-slate-300">Base Price ($) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.base_price}
                onChange={(e) => setFormData({ ...formData, base_price: parseFloat(e.target.value) || 0 })}
                className="bg-slate-700 border-slate-600 text-white"
                data-testid="pricing-price-input"
              />
            </div>

            {/* Time Window */}
            {(formData.delivery_type === 'next_day' || formData.delivery_type === 'time_window') && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-slate-300">Window Start</Label>
                  <Input
                    type="time"
                    value={formData.time_window_start}
                    onChange={(e) => setFormData({ ...formData, time_window_start: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Window End</Label>
                  <Input
                    type="time"
                    value={formData.time_window_end}
                    onChange={(e) => setFormData({ ...formData, time_window_end: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>
            )}

            {/* Cutoff Time (for same_day) */}
            {formData.delivery_type === 'same_day' && (
              <div className="space-y-2">
                <Label className="text-slate-300">Cutoff Time</Label>
                <Input
                  type="time"
                  value={formData.cutoff_time}
                  onChange={(e) => setFormData({ ...formData, cutoff_time: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                  placeholder="14:00"
                />
                <p className="text-xs text-slate-500">Orders must be placed before this time</p>
              </div>
            )}

            {/* Is Add-on */}
            {!showEditModal && (
              <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                <div>
                  <Label className="text-slate-300">Add-on Fee</Label>
                  <p className="text-xs text-slate-500">Mark as additional fee (e.g., Refrigerated)</p>
                </div>
                <Switch
                  checked={formData.is_addon}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_addon: checked })}
                />
              </div>
            )}

            {/* Active Status */}
            <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
              <div>
                <Label className="text-slate-300">Active</Label>
                <p className="text-xs text-slate-500">Enable this pricing option</p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateModal(false);
                setShowEditModal(false);
                setSelectedPricing(null);
                resetForm();
              }}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={showEditModal ? handleEdit : handleCreate}
              className="bg-teal-600 hover:bg-teal-700"
              data-testid="save-pricing-btn"
            >
              {showEditModal ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Pricing</DialogTitle>
            <DialogDescription className="text-slate-400">
              Are you sure you want to delete "{selectedPricing?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteModal(false);
                setSelectedPricing(null);
              }}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              data-testid="confirm-delete-pricing-btn"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PricingManagement;
