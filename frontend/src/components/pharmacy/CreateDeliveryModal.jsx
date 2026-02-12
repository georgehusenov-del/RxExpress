import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Truck, Package, MapPin, User, Clock, Plus, X, Loader2
} from 'lucide-react';
import { ordersAPI } from '@/lib/api';
import { toast } from 'sonner';

export const CreateDeliveryModal = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    // Delivery Type
    delivery_type: 'next_day',
    time_window: null,
    
    // Recipient
    recipient_name: '',
    recipient_phone: '',
    recipient_email: '',
    
    // Address
    street: '',
    apt_unit: '',
    city: '',
    state: '',
    postal_code: '',
    delivery_instructions: '',
    
    // Packages
    packages: [{
      medication_name: '',
      rx_number: '',
      quantity: 1,
      dosage: '',
      requires_refrigeration: false,
      requires_signature: true
    }],
    
    // Options
    requires_signature: true,
    requires_photo_proof: true,
    requires_id_verification: false,
    delivery_notes: ''
  });

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Get pharmacy ID from user context (simplified - should come from auth)
      const pharmacyId = localStorage.getItem('pharmacy_id') || 'e4172010-3a02-4635-9a24-f9f566e995a0';
      
      const orderData = {
        pharmacy_id: pharmacyId,
        delivery_type: formData.delivery_type,
        time_window: formData.delivery_type === 'time_window' ? formData.time_window : null,
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
        delivery_notes: formData.delivery_notes || null
      };

      const response = await ordersAPI.create(orderData);
      toast.success(`Delivery created: ${response.data.order_number}`);
      onSuccess();
    } catch (err) {
      console.error('Failed to create delivery:', err);
      toast.error(err.response?.data?.detail || 'Failed to create delivery');
    } finally {
      setLoading(false);
    }
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
            Step {step} of 3: {step === 1 ? 'Delivery Type' : step === 2 ? 'Recipient & Address' : 'Packages'}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {/* Step 1: Delivery Type */}
          {step === 1 && (
            <div className="space-y-4">
              <Label className="text-base font-medium">Select Delivery Type</Label>
              <RadioGroup
                value={formData.delivery_type}
                onValueChange={(value) => updateField('delivery_type', value)}
                className="grid grid-cols-2 gap-4"
              >
                <label className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                  formData.delivery_type === 'same_day' ? 'border-teal-500 bg-teal-50' : 'border-slate-200 hover:border-slate-300'
                }`}>
                  <RadioGroupItem value="same_day" />
                  <div>
                    <p className="font-medium text-slate-900">Same Day</p>
                    <p className="text-sm text-slate-500">Cutoff 2PM. Deliver today.</p>
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                  formData.delivery_type === 'next_day' ? 'border-teal-500 bg-teal-50' : 'border-slate-200 hover:border-slate-300'
                }`}>
                  <RadioGroupItem value="next_day" />
                  <div>
                    <p className="font-medium text-slate-900">Next Day</p>
                    <p className="text-sm text-slate-500">Pickup today, deliver tomorrow.</p>
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                  formData.delivery_type === 'priority' ? 'border-teal-500 bg-teal-50' : 'border-slate-200 hover:border-slate-300'
                }`}>
                  <RadioGroupItem value="priority" />
                  <div>
                    <p className="font-medium text-slate-900">Priority</p>
                    <p className="text-sm text-slate-500">First deliveries of the day. +$5</p>
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                  formData.delivery_type === 'time_window' ? 'border-teal-500 bg-teal-50' : 'border-slate-200 hover:border-slate-300'
                }`}>
                  <RadioGroupItem value="time_window" />
                  <div>
                    <p className="font-medium text-slate-900">Time Window</p>
                    <p className="text-sm text-slate-500">Choose a specific window.</p>
                  </div>
                </label>
              </RadioGroup>

              {formData.delivery_type === 'time_window' && (
                <div className="mt-4">
                  <Label>Select Time Window</Label>
                  <RadioGroup
                    value={formData.time_window}
                    onValueChange={(value) => updateField('time_window', value)}
                    className="flex gap-4 mt-2"
                  >
                    <label className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer ${
                      formData.time_window === '8am-1pm' ? 'border-teal-500 bg-teal-50' : 'border-slate-200'
                    }`}>
                      <RadioGroupItem value="8am-1pm" />
                      <span className="text-sm">8AM - 1PM</span>
                    </label>
                    <label className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer ${
                      formData.time_window === '1pm-6pm' ? 'border-teal-500 bg-teal-50' : 'border-slate-200'
                    }`}>
                      <RadioGroupItem value="1pm-6pm" />
                      <span className="text-sm">1PM - 6PM</span>
                    </label>
                    <label className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer ${
                      formData.time_window === '4pm-9pm' ? 'border-teal-500 bg-teal-50' : 'border-slate-200'
                    }`}>
                      <RadioGroupItem value="4pm-9pm" />
                      <span className="text-sm">4PM - 9PM</span>
                    </label>
                  </RadioGroup>
                </div>
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removePackage(index)}
                      >
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
                      Requires Refrigeration
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
                  (step === 1 && formData.delivery_type === 'time_window' && !formData.time_window) ||
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
                  'Create Delivery'
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
