import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Truck, Package, MapPin, Clock, Plus, X, Loader2,
  DollarSign, Snowflake, Zap, Calendar, Sun, Sunset, Moon, FileText
} from 'lucide-react';
import { ordersAPI, publicAPI } from '@/lib/api';
import { toast } from 'sonner';
import { OrderSuccessModal } from './OrderSuccessModal';

export const CreateDeliveryModal = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [pricing, setPricing] = useState(null);
  const [loadingPricing, setLoadingPricing] = useState(true);
  const [createdOrder, setCreatedOrder] = useState(null);
  const [activeDeliveryTab, setActiveDeliveryTab] = useState('next_day');
  
  const [formData, setFormData] = useState({
    delivery_type: 'next_day',
    time_window: '8am-1pm',
    selected_pricing_id: null,
    scheduled_date: null,
    recipient_name: '',
    recipient_phone: '',
    recipient_email: '',
    street: '',
    apt_unit: '',
    city: '',
    state: '',
    postal_code: '',
    delivery_instructions: '',
    packages: [{
      medication_name: '',
      rx_number: '',
      quantity: 1,
      dosage: '',
      requires_refrigeration: false,
      requires_signature: true
    }],
    requires_signature: true,
    requires_photo_proof: true,
    requires_id_verification: false,
    delivery_notes: '',
    add_refrigerated: false,
    copay_amount: 0,
    pharmacy_notes: ''
  });

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const response = await publicAPI.getActivePricing();
        setPricing(response.data);
        
        const nextDayOptions = response.data.grouped?.next_day || [];
        if (nextDayOptions.length > 0) {
          setFormData(prev => ({
            ...prev,
            selected_pricing_id: nextDayOptions[0].id,
            time_window: nextDayOptions[0].time_window_start ? 
              formatTimeWindowForApi(nextDayOptions[0].time_window_start, nextDayOptions[0].time_window_end) : null
          }));
        }
      } catch (err) {
        console.error('Failed to fetch pricing:', err);
        toast.error('Failed to load pricing options');
      } finally {
        setLoadingPricing(false);
      }
    };
    fetchPricing();
  }, []);

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const formatTimeWindowForApi = (start, end) => {
    if (!start || !end) return null;
    const formatTime = (t) => {
      const [h] = t.split(':');
      const hour = parseInt(h);
      const ampm = hour >= 12 ? 'pm' : 'am';
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      return `${displayHour}${ampm}`;
    };
    return `${formatTime(start)}-${formatTime(end)}`;
  };

  const formatTimeWindow = (start, end) => {
    if (!start || !end) return '';
    const formatTime = (t) => {
      const [h] = t.split(':');
      const hour = parseInt(h);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      return `${displayHour}${ampm}`;
    };
    return `${formatTime(start)} - ${formatTime(end)}`;
  };

  const selectPricing = (pricingOption) => {
    const timeWindow = pricingOption.time_window_start && pricingOption.time_window_end
      ? formatTimeWindowForApi(pricingOption.time_window_start, pricingOption.time_window_end)
      : null;
    
    setFormData(prev => ({
      ...prev,
      delivery_type: pricingOption.delivery_type,
      selected_pricing_id: pricingOption.id,
      time_window: timeWindow
    }));
  };

  const handleTabChange = (tabValue) => {
    setActiveDeliveryTab(tabValue);
    
    // Auto-select first option in the tab
    let options = [];
    if (tabValue === 'next_day') {
      options = pricing?.grouped?.next_day || [];
    } else if (tabValue === 'same_day') {
      options = pricing?.grouped?.same_day || [];
    } else if (tabValue === 'priority') {
      options = pricing?.grouped?.priority || [];
    } else if (tabValue === 'scheduled') {
      options = pricing?.grouped?.scheduled || [];
    }
    
    if (options.length > 0) {
      selectPricing(options[0]);
    }
  };

  const addPackage = () => {
    setFormData(prev => ({
      ...prev,
      packages: [...prev.packages, {
        medication_name: '',
        rx_number: '',
        quantity: 1,
        dosage: '',
        requires_refrigeration: false,
        requires_signature: true
      }]
    }));
  };

  const updatePackage = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      packages: prev.packages.map((pkg, i) => 
        i === index ? { ...pkg, [field]: value } : pkg
      )
    }));
  };

  const removePackage = (index) => {
    if (formData.packages.length > 1) {
      setFormData(prev => ({
        ...prev,
        packages: prev.packages.filter((_, i) => i !== index)
      }));
    }
  };

  const calculateTotal = () => {
    let total = 0;
    const selectedOption = pricing?.pricing?.find(p => p.id === formData.selected_pricing_id);
    if (selectedOption) {
      total += selectedOption.base_price;
    }
    if (formData.add_refrigerated || formData.packages.some(p => p.requires_refrigeration)) {
      const refrigeratedFee = pricing?.grouped?.addons?.find(p => 
        p.name.toLowerCase().includes('refrigerat')
      );
      if (refrigeratedFee) {
        total += refrigeratedFee.base_price;
      }
    }
    return total;
  };

  const handleSubmit = async () => {
    // Validate minimum packages for scheduled delivery
    if (formData.delivery_type === 'scheduled') {
      const selectedPricing = pricing?.grouped?.scheduled?.find(p => p.id === formData.selected_pricing_id);
      if (selectedPricing?.minimum_packages && formData.packages.length < selectedPricing.minimum_packages) {
        toast.error(`Scheduled delivery requires minimum ${selectedPricing.minimum_packages} packages. You have ${formData.packages.length}.`);
        return;
      }
      if (!formData.scheduled_date) {
        toast.error('Please select a delivery date for scheduled delivery.');
        return;
      }
    }
    
    setLoading(true);
    try {
      const pharmacyId = localStorage.getItem('pharmacy_id') || 'e4172010-3a02-4635-9a24-f9f566e995a0';
      
      const orderData = {
        pharmacy_id: pharmacyId,
        delivery_type: formData.delivery_type,
        time_window: formData.time_window,
        pricing_id: formData.selected_pricing_id,
        scheduled_date: formData.scheduled_date || null,
        recipient: {
          name: formData.recipient_name,
          phone: formData.recipient_phone,
          email: formData.recipient_email || null
        },
        delivery_address: {
          street: formData.street,
          apt_unit: formData.apt_unit || null,
          city: formData.city,
          state: formData.state,
          postal_code: formData.postal_code,
          delivery_instructions: formData.delivery_instructions || null
        },
        packages: formData.packages.map(pkg => ({
          prescriptions: [{
            medication_name: pkg.medication_name,
            rx_number: pkg.rx_number,
            quantity: parseInt(pkg.quantity) || 1,
            dosage: pkg.dosage,
            requires_refrigeration: pkg.requires_refrigeration
          }],
          requires_refrigeration: pkg.requires_refrigeration,
          requires_signature: pkg.requires_signature
        })),
        requires_signature: formData.requires_signature,
        requires_photo_proof: formData.requires_photo_proof,
        requires_id_verification: formData.requires_id_verification,
        delivery_notes: formData.delivery_notes || null,
        pharmacy_notes: formData.pharmacy_notes || null,
        estimated_cost: calculateTotal(),
        copay_amount: formData.copay_amount || 0
      };

      const response = await ordersAPI.create(orderData);
      setCreatedOrder({
        ...response.data,
        time_window: formData.time_window,
        copay_amount: formData.copay_amount
      });
    } catch (err) {
      console.error('Failed to create delivery:', err);
      toast.error(err.response?.data?.detail || 'Failed to create delivery');
    } finally {
      setLoading(false);
    }
  };

  if (createdOrder) {
    return (
      <OrderSuccessModal 
        order={createdOrder} 
        onClose={() => {
          setCreatedOrder(null);
          onSuccess();
        }} 
      />
    );
  }

  const getTimeIcon = (timeWindowStart) => {
    if (!timeWindowStart) return Clock;
    const hour = parseInt(timeWindowStart.split(':')[0]);
    if (hour < 12) return Sun;
    if (hour < 17) return Sunset;
    return Moon;
  };

  const getTimeSlotLabel = (start, end) => {
    if (!start) return '';
    const hour = parseInt(start.split(':')[0]);
    if (hour < 12) return 'Morning';
    if (hour < 16) return 'Afternoon';
    return 'Evening';
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading">
            <Truck className="w-5 h-5 text-teal-600" />
            Create New Delivery
          </DialogTitle>
          <DialogDescription>
            Step {step} of 3: {step === 1 ? 'Delivery Type & Pricing' : step === 2 ? 'Recipient & Address' : 'Packages'}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {/* Step 1: Delivery Type with Tabs */}
          {step === 1 && (
            <div className="space-y-6">
              {loadingPricing ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
                  <span className="ml-2 text-slate-500">Loading pricing...</span>
                </div>
              ) : (
                <>
                  {/* Delivery Type Tabs */}
                  <Tabs value={activeDeliveryTab} onValueChange={handleTabChange} className="w-full">
                    <TabsList className="grid w-full grid-cols-4 bg-slate-100 p-1 rounded-xl">
                      <TabsTrigger 
                        value="next_day" 
                        className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg font-medium text-xs"
                        data-testid="tab-next-day"
                      >
                        <Calendar className="w-3 h-3 mr-1" />
                        Next Day
                      </TabsTrigger>
                      <TabsTrigger 
                        value="same_day"
                        className="data-[state=active]:bg-amber-500 data-[state=active]:text-white rounded-lg font-medium text-xs"
                        data-testid="tab-same-day"
                      >
                        <Zap className="w-3 h-3 mr-1" />
                        Same Day
                      </TabsTrigger>
                      <TabsTrigger 
                        value="priority"
                        className="data-[state=active]:bg-purple-600 data-[state=active]:text-white rounded-lg font-medium text-xs"
                        data-testid="tab-priority"
                      >
                        <Zap className="w-3 h-3 mr-1" />
                        Priority
                      </TabsTrigger>
                      <TabsTrigger 
                        value="scheduled"
                        className="data-[state=active]:bg-teal-600 data-[state=active]:text-white rounded-lg font-medium text-xs"
                        data-testid="tab-scheduled"
                      >
                        <Calendar className="w-3 h-3 mr-1" />
                        Scheduled
                      </TabsTrigger>
                    </TabsList>

                    {/* Next Day Tab Content */}
                    <TabsContent value="next_day" className="mt-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                        <h4 className="font-semibold text-blue-900 flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Select Delivery Time Window
                        </h4>
                        <p className="text-sm text-blue-700 mt-1">
                          Choose when you want the package delivered tomorrow
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-3">
                        {pricing?.grouped?.next_day?.filter(p => !p.is_addon).map((option) => {
                          const TimeIcon = getTimeIcon(option.time_window_start);
                          const isSelected = formData.selected_pricing_id === option.id;
                          const timeLabel = getTimeSlotLabel(option.time_window_start, option.time_window_end);
                          
                          return (
                            <div
                              key={option.id}
                              onClick={() => selectPricing(option)}
                              className={`flex items-center justify-between p-4 border-2 rounded-xl cursor-pointer transition-all ${
                                isSelected 
                                  ? 'border-blue-500 bg-blue-50 shadow-md' 
                                  : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                              }`}
                              data-testid={`pricing-option-${option.id}`}
                            >
                              <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                  isSelected ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'
                                }`}>
                                  <TimeIcon className="w-6 h-6" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-lg text-slate-900">
                                      {formatTimeWindow(option.time_window_start, option.time_window_end)}
                                    </span>
                                    <Badge variant="outline" className={`${
                                      isSelected ? 'border-blue-500 text-blue-600' : 'border-slate-300 text-slate-500'
                                    }`}>
                                      {timeLabel}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-slate-500 mt-1">{option.description}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={`text-2xl font-bold ${isSelected ? 'text-blue-600' : 'text-slate-700'}`}>
                                  ${option.base_price}
                                </p>
                                {isSelected && (
                                  <Badge className="bg-blue-500 text-white mt-1">Selected</Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </TabsContent>

                    {/* Same Day Tab Content */}
                    <TabsContent value="same_day" className="mt-4">
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                        <h4 className="font-semibold text-amber-900 flex items-center gap-2">
                          <Zap className="w-4 h-4" />
                          Same-Day Express Delivery
                        </h4>
                        <p className="text-sm text-amber-700 mt-1">
                          Get your package delivered today
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-3">
                        {pricing?.grouped?.same_day?.map((option) => {
                          const isSelected = formData.selected_pricing_id === option.id;
                          
                          return (
                            <div
                              key={option.id}
                              onClick={() => selectPricing(option)}
                              className={`flex items-center justify-between p-4 border-2 rounded-xl cursor-pointer transition-all ${
                                isSelected 
                                  ? 'border-amber-500 bg-amber-50 shadow-md' 
                                  : 'border-slate-200 hover:border-amber-300 hover:bg-slate-50'
                              }`}
                              data-testid={`pricing-option-${option.id}`}
                            >
                              <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                  isSelected ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500'
                                }`}>
                                  <Zap className="w-6 h-6" />
                                </div>
                                <div>
                                  <span className="font-bold text-lg text-slate-900">{option.name}</span>
                                  <p className="text-sm text-slate-500 mt-1">{option.description}</p>
                                  {option.cutoff_time && (
                                    <Badge variant="outline" className="border-amber-500 text-amber-600 mt-2">
                                      <Clock className="w-3 h-3 mr-1" />
                                      Order before {option.cutoff_time.replace(':00', '')}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={`text-2xl font-bold ${isSelected ? 'text-amber-600' : 'text-slate-700'}`}>
                                  ${option.base_price}
                                </p>
                                {isSelected && (
                                  <Badge className="bg-amber-500 text-white mt-1">Selected</Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </TabsContent>

                    {/* Priority Tab Content */}
                    <TabsContent value="priority" className="mt-4">
                      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-4">
                        <h4 className="font-semibold text-purple-900 flex items-center gap-2">
                          <Zap className="w-4 h-4" />
                          Priority Delivery
                        </h4>
                        <p className="text-sm text-purple-700 mt-1">
                          First delivery of the day - guaranteed early delivery
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-3">
                        {pricing?.grouped?.priority?.map((option) => {
                          const isSelected = formData.selected_pricing_id === option.id;
                          
                          return (
                            <div
                              key={option.id}
                              onClick={() => selectPricing(option)}
                              className={`flex items-center justify-between p-4 border-2 rounded-xl cursor-pointer transition-all ${
                                isSelected 
                                  ? 'border-purple-500 bg-purple-50 shadow-md' 
                                  : 'border-slate-200 hover:border-purple-300 hover:bg-slate-50'
                              }`}
                              data-testid={`pricing-option-${option.id}`}
                            >
                              <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                  isSelected ? 'bg-purple-500 text-white' : 'bg-slate-100 text-slate-500'
                                }`}>
                                  <Zap className="w-6 h-6" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-lg text-slate-900">{option.name}</span>
                                    {option.time_window_start && option.time_window_end && (
                                      <Badge variant="outline" className="border-purple-500 text-purple-600">
                                        {formatTimeWindow(option.time_window_start, option.time_window_end)}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-slate-500 mt-1">{option.description}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={`text-2xl font-bold ${isSelected ? 'text-purple-600' : 'text-slate-700'}`}>
                                  ${option.base_price}
                                </p>
                                {isSelected && (
                                  <Badge className="bg-purple-500 text-white mt-1">Selected</Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </TabsContent>

                    {/* Scheduled Bulk Delivery Tab Content */}
                    <TabsContent value="scheduled" className="mt-4">
                      <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 mb-4">
                        <h4 className="font-semibold text-teal-900 flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Scheduled Bulk Delivery
                        </h4>
                        <p className="text-sm text-teal-700 mt-1">
                          Schedule deliveries for a future date. Local deliveries only.
                        </p>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline" className="border-teal-500 text-teal-700 bg-teal-100">
                            Min 15+ packages
                          </Badge>
                          <Badge variant="outline" className="border-teal-500 text-teal-700 bg-teal-100">
                            8AM - 10PM
                          </Badge>
                          <Badge variant="outline" className="border-teal-500 text-teal-700 bg-teal-100">
                            Local only
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-3">
                        {pricing?.grouped?.scheduled?.map((option) => {
                          const isSelected = formData.selected_pricing_id === option.id;
                          
                          return (
                            <div
                              key={option.id}
                              onClick={() => selectPricing(option)}
                              className={`flex items-center justify-between p-4 border-2 rounded-xl cursor-pointer transition-all ${
                                isSelected 
                                  ? 'border-teal-500 bg-teal-50 shadow-md' 
                                  : 'border-slate-200 hover:border-teal-300 hover:bg-slate-50'
                              }`}
                              data-testid={`pricing-option-${option.id}`}
                            >
                              <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                  isSelected ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-500'
                                }`}>
                                  <Calendar className="w-6 h-6" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-lg text-slate-900">{option.name}</span>
                                    <Badge variant="outline" className="border-teal-500 text-teal-600">
                                      $9 flat rate
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-slate-500 mt-1">{option.description}</p>
                                  {option.minimum_packages && (
                                    <p className="text-xs text-amber-600 mt-1 font-medium">
                                      ⚠️ Requires minimum {option.minimum_packages} packages
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={`text-2xl font-bold ${isSelected ? 'text-teal-600' : 'text-slate-700'}`}>
                                  ${option.base_price}
                                </p>
                                {isSelected && (
                                  <Badge className="bg-teal-500 text-white mt-1">Selected</Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        
                        {(!pricing?.grouped?.scheduled || pricing.grouped.scheduled.length === 0) && (
                          <div className="text-center py-8 text-slate-500">
                            <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>Scheduled delivery not available</p>
                            <p className="text-xs">Contact admin to enable this option</p>
                          </div>
                        )}
                      </div>
                      
                      {/* Date picker for scheduled delivery */}
                      {formData.delivery_type === 'scheduled' && (
                        <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                          <Label className="text-sm font-medium text-slate-700 mb-2 block">
                            Select Delivery Date
                          </Label>
                          <Input
                            type="date"
                            value={formData.scheduled_date || ''}
                            onChange={(e) => updateField('scheduled_date', e.target.value)}
                            min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                            className="w-full"
                            data-testid="scheduled-date-input"
                          />
                          <p className="text-xs text-slate-500 mt-1">
                            Choose a date at least 1 day in advance
                          </p>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>

                  {/* Add-ons Section */}
                  {pricing?.grouped?.addons?.length > 0 && (
                    <div className="border-t pt-4">
                      <Label className="text-base font-medium flex items-center gap-2 mb-3">
                        <Snowflake className="w-4 h-4 text-cyan-500" />
                        Add-ons
                      </Label>
                      <div className="space-y-2">
                        {pricing.grouped.addons.map((addon) => (
                          <label
                            key={addon.id}
                            className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                              formData.add_refrigerated 
                                ? 'border-cyan-500 bg-cyan-50' 
                                : 'border-slate-200 hover:border-cyan-300'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={formData.add_refrigerated}
                                onCheckedChange={(checked) => updateField('add_refrigerated', checked)}
                              />
                              <div>
                                <span className="font-medium text-slate-900">{addon.name}</span>
                                <p className="text-xs text-slate-500">{addon.description}</p>
                              </div>
                            </div>
                            <span className="font-bold text-cyan-600">+${addon.base_price}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Copay Collection */}
                  <div className="border-t pt-4">
                    <Label className="text-base font-medium flex items-center gap-2 mb-3">
                      <DollarSign className="w-4 h-4 text-green-500" />
                      Copay to Collect
                    </Label>
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.copay_amount || ''}
                          onChange={(e) => updateField('copay_amount', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="pl-8 text-lg font-semibold"
                          data-testid="copay-input"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Enter the copay amount the driver needs to collect from the patient
                    </p>
                  </div>

                  {/* Pharmacy Notes */}
                  <div className="border-t pt-4">
                    <Label className="text-base font-medium flex items-center gap-2 mb-3">
                      <FileText className="w-4 h-4 text-blue-500" />
                      Notes
                    </Label>
                    <Textarea
                      value={formData.pharmacy_notes}
                      onChange={(e) => updateField('pharmacy_notes', e.target.value)}
                      placeholder="Add any special instructions or notes for this delivery..."
                      className="resize-none"
                      rows={3}
                      data-testid="pharmacy-notes-input"
                    />
                    <p className="text-xs text-slate-500 mt-2">
                      These notes will be visible to the driver and admin
                    </p>
                  </div>

                  {/* Total Summary */}
                  <div className="bg-slate-100 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-slate-500">Delivery Cost</p>
                      <p className="text-xl font-bold text-slate-900">${calculateTotal().toFixed(2)}</p>
                    </div>
                    {formData.copay_amount > 0 && (
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                        <p className="text-sm text-green-600 font-medium">Copay to Collect</p>
                        <p className="text-xl font-bold text-green-600">${formData.copay_amount.toFixed(2)}</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 2: Recipient & Address */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="recipient_name">Recipient Name *</Label>
                  <Input
                    id="recipient_name"
                    value={formData.recipient_name}
                    onChange={(e) => updateField('recipient_name', e.target.value)}
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="recipient_phone">Phone Number *</Label>
                  <Input
                    id="recipient_phone"
                    value={formData.recipient_phone}
                    onChange={(e) => updateField('recipient_phone', e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="recipient_email">Email (Optional)</Label>
                <Input
                  id="recipient_email"
                  type="email"
                  value={formData.recipient_email}
                  onChange={(e) => updateField('recipient_email', e.target.value)}
                  placeholder="john@example.com"
                />
              </div>

              <div className="border-t pt-4">
                <Label className="text-base font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Delivery Address
                </Label>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="street">Street Address *</Label>
                  <Input
                    id="street"
                    value={formData.street}
                    onChange={(e) => updateField('street', e.target.value)}
                    placeholder="123 Main Street"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="apt_unit">Apt/Unit</Label>
                  <Input
                    id="apt_unit"
                    value={formData.apt_unit}
                    onChange={(e) => updateField('apt_unit', e.target.value)}
                    placeholder="Apt 4B"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    placeholder="New York"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => updateField('state', e.target.value)}
                    placeholder="NY"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="postal_code">ZIP Code *</Label>
                  <Input
                    id="postal_code"
                    value={formData.postal_code}
                    onChange={(e) => updateField('postal_code', e.target.value)}
                    placeholder="10001"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="delivery_instructions">Delivery Instructions</Label>
                <Textarea
                  id="delivery_instructions"
                  value={formData.delivery_instructions}
                  onChange={(e) => updateField('delivery_instructions', e.target.value)}
                  placeholder="Ring doorbell, leave at door, etc."
                  rows={2}
                />
              </div>
            </div>
          )}

          {/* Step 3: Packages */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium flex items-center gap-2">
                  <Package className="w-4 h-4" /> Packages ({formData.packages.length})
                </Label>
                <Button variant="outline" size="sm" onClick={addPackage}>
                  <Plus className="w-4 h-4 mr-1" /> Add Package
                </Button>
              </div>

              {formData.packages.map((pkg, index) => (
                <div key={index} className="p-4 border rounded-lg bg-slate-50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-sm">Package #{index + 1}</span>
                    {formData.packages.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => removePackage(index)}>
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Medication Name *</Label>
                      <Input
                        value={pkg.medication_name}
                        onChange={(e) => updatePackage(index, 'medication_name', e.target.value)}
                        placeholder="Amoxicillin"
                      />
                    </div>
                    <div>
                      <Label>RX Number</Label>
                      <Input
                        value={pkg.rx_number}
                        onChange={(e) => updatePackage(index, 'rx_number', e.target.value)}
                        placeholder="RX123456"
                      />
                    </div>
                    <div>
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        value={pkg.quantity}
                        onChange={(e) => updatePackage(index, 'quantity', e.target.value)}
                        min="1"
                      />
                    </div>
                    <div>
                      <Label>Dosage</Label>
                      <Input
                        value={pkg.dosage}
                        onChange={(e) => updatePackage(index, 'dosage', e.target.value)}
                        placeholder="500mg"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-3">
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={pkg.requires_refrigeration}
                        onCheckedChange={(checked) => updatePackage(index, 'requires_refrigeration', checked)}
                      />
                      <Snowflake className="w-3 h-3 text-cyan-500" />
                      Requires Refrigeration (+$3)
                    </label>
                  </div>
                </div>
              ))}

              <div className="border-t pt-4">
                <Label className="text-base font-medium">Delivery Options</Label>
                <div className="flex flex-col gap-3 mt-2">
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.requires_signature}
                      onCheckedChange={(checked) => updateField('requires_signature', checked)}
                    />
                    <span className="text-sm">Require Signature</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.requires_photo_proof}
                      onCheckedChange={(checked) => updateField('requires_photo_proof', checked)}
                    />
                    <span className="text-sm">Require Photo Proof</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.requires_id_verification}
                      onCheckedChange={(checked) => updateField('requires_id_verification', checked)}
                    />
                    <span className="text-sm">Require ID Verification</span>
                  </label>
                </div>
              </div>

              <div>
                <Label htmlFor="delivery_notes">Additional Notes</Label>
                <Textarea
                  id="delivery_notes"
                  value={formData.delivery_notes}
                  onChange={(e) => updateField('delivery_notes', e.target.value)}
                  placeholder="Any additional notes for the driver..."
                  rows={2}
                />
              </div>

              {/* Order Summary */}
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
                <h4 className="font-semibold text-teal-900 mb-2">Order Summary</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Delivery Type:</span>
                    <span className="font-medium capitalize">{formData.delivery_type.replace('_', ' ')}</span>
                  </div>
                  {formData.time_window && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Time Window:</span>
                      <span className="font-medium">{formData.time_window}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-600">Packages:</span>
                    <span className="font-medium">{formData.packages.length}</span>
                  </div>
                  {(formData.add_refrigerated || formData.packages.some(p => p.requires_refrigeration)) && (
                    <div className="flex justify-between text-cyan-600">
                      <span>Refrigerated:</span>
                      <span>+$3.00</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-teal-200 text-lg font-bold text-teal-900">
                    <span>Total:</span>
                    <span>${calculateTotal().toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-6 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => step > 1 ? setStep(step - 1) : onClose()}
            >
              {step === 1 ? 'Cancel' : 'Back'}
            </Button>

            {step < 3 ? (
              <Button
                className="bg-teal-600 hover:bg-teal-700"
                onClick={() => setStep(step + 1)}
                disabled={
                  (step === 1 && !formData.selected_pricing_id) ||
                  (step === 2 && (!formData.recipient_name || !formData.recipient_phone || !formData.street || !formData.city || !formData.state || !formData.postal_code))
                }
              >
                Continue
              </Button>
            ) : (
              <Button
                className="bg-teal-600 hover:bg-teal-700"
                onClick={handleSubmit}
                disabled={loading || formData.packages.some(p => !p.medication_name)}
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
                ) : (
                  <>Create Delivery - ${calculateTotal().toFixed(2)}</>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateDeliveryModal;
