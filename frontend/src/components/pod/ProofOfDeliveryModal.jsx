import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  FileSignature, Camera, CheckCircle, AlertCircle,
  Package, User, MapPin, Loader2
} from 'lucide-react';
import { SignaturePad } from './SignaturePad';
import { PhotoCapture } from './PhotoCapture';
import { driverPortalAPI } from '@/lib/api';
import { toast } from 'sonner';

export const ProofOfDeliveryModal = ({ delivery, onClose, onSuccess }) => {
  const [activeTab, setActiveTab] = useState('signature');
  const [signatureData, setSignatureData] = useState(null);
  const [photoData, setPhotoData] = useState(null);
  const [recipientName, setRecipientName] = useState(delivery?.recipient?.name || '');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const requiresSignature = delivery?.packages?.some(pkg => pkg.requires_signature);

  const handleSubmit = async () => {
    // Validate required fields
    if (requiresSignature && !signatureData) {
      toast.error('Signature is required for this delivery');
      return;
    }

    setSubmitting(true);
    try {
      // Get current location
      let latitude = null;
      let longitude = null;
      
      if (navigator.geolocation) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
        } catch (e) {
          console.log('Location not available');
        }
      }

      const podData = {
        signature_data: signatureData,
        photo_data: photoData,
        recipient_name: recipientName,
        notes: notes || null,
        latitude,
        longitude
      };

      await driverPortalAPI.submitPod(delivery.id, podData);
      toast.success('Proof of Delivery submitted successfully!');
      onSuccess?.();
    } catch (err) {
      console.error('POD submission error:', err);
      toast.error(err.response?.data?.detail || 'Failed to submit POD');
    } finally {
      setSubmitting(false);
    }
  };

  const isValid = !requiresSignature || signatureData;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            Proof of Delivery
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Delivery Summary */}
          <div className="p-3 bg-slate-700/50 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm text-teal-400">{delivery?.order_number}</span>
              <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
                Completing
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <User className="w-4 h-4 text-slate-500" />
              <span>{delivery?.recipient?.name}</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-slate-400">
              <MapPin className="w-4 h-4 text-slate-500 mt-0.5" />
              <span>
                {delivery?.delivery_address?.street}, {delivery?.delivery_address?.city}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Package className="w-4 h-4 text-slate-500" />
              <span>{delivery?.packages?.length || 0} package(s)</span>
              {requiresSignature && (
                <Badge variant="outline" className="text-xs bg-blue-500/20 text-blue-400 border-blue-500/30">
                  <FileSignature className="w-3 h-3 mr-1" />
                  Signature Required
                </Badge>
              )}
            </div>
          </div>

          {/* Recipient Name */}
          <div className="space-y-2">
            <Label className="text-slate-300">Recipient Name</Label>
            <Input
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="Enter recipient name"
              className="bg-slate-700 border-slate-600 text-white"
              data-testid="recipient-name-input"
            />
          </div>

          {/* Signature and Photo Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full bg-slate-700">
              <TabsTrigger value="signature" className="flex-1 data-[state=active]:bg-teal-600">
                <FileSignature className="w-4 h-4 mr-2" />
                Signature
                {requiresSignature && <span className="text-red-400 ml-1">*</span>}
              </TabsTrigger>
              <TabsTrigger value="photo" className="flex-1 data-[state=active]:bg-teal-600">
                <Camera className="w-4 h-4 mr-2" />
                Photo
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signature" className="mt-4">
              <div className="space-y-2">
                <Label className="text-slate-300">
                  Customer Signature
                  {requiresSignature && <span className="text-red-400 ml-1">*</span>}
                </Label>
                <SignaturePad
                  onSave={(data) => setSignatureData(data)}
                  onClear={() => setSignatureData(null)}
                />
                {signatureData && (
                  <div className="flex items-center gap-2 text-green-400 text-sm">
                    <CheckCircle className="w-4 h-4" />
                    Signature captured
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="photo" className="mt-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Delivery Photo (Optional)</Label>
                <PhotoCapture
                  onCapture={(data) => setPhotoData(data)}
                  onClear={() => setPhotoData(null)}
                />
                {photoData && (
                  <div className="flex items-center gap-2 text-green-400 text-sm">
                    <CheckCircle className="w-4 h-4" />
                    Photo captured
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-slate-300">Delivery Notes (Optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any delivery notes..."
              className="bg-slate-700 border-slate-600 text-white resize-none"
              rows={2}
              data-testid="pod-notes-input"
            />
          </div>

          {/* Validation Warning */}
          {requiresSignature && !signatureData && (
            <div className="flex items-center gap-2 p-3 bg-amber-500/20 border border-amber-500/30 rounded-lg">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <p className="text-sm text-amber-400">
                This delivery requires a customer signature
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="border-slate-600"
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || submitting}
            className="bg-green-600 hover:bg-green-700"
            data-testid="submit-pod-btn"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Complete Delivery
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProofOfDeliveryModal;
