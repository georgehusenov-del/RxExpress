import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  QrCode, Camera, Package, CheckCircle, AlertCircle,
  Truck, MapPin, Thermometer, FileSignature, X
} from 'lucide-react';
import { scanAPI } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export const QRScanner = ({ onScanSuccess, onClose, action = 'verify' }) => {
  const { user } = useAuth();
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const scannerRef = useRef(null);
  const html5QrcodeScannerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (html5QrcodeScannerRef.current) {
        html5QrcodeScannerRef.current.clear().catch(console.error);
      }
    };
  }, []);

  const startScanning = () => {
    setScanning(true);
    setError(null);
    setScanResult(null);

    setTimeout(() => {
      if (scannerRef.current) {
        html5QrcodeScannerRef.current = new Html5QrcodeScanner(
          "qr-reader",
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
          },
          false
        );

        html5QrcodeScannerRef.current.render(
          (decodedText) => {
            handleScan(decodedText);
            html5QrcodeScannerRef.current.clear().catch(console.error);
            setScanning(false);
          },
          (errorMessage) => {
            // Ignore continuous scanning errors
          }
        );
      }
    }, 100);
  };

  const stopScanning = () => {
    if (html5QrcodeScannerRef.current) {
      html5QrcodeScannerRef.current.clear().catch(console.error);
    }
    setScanning(false);
  };

  const handleScan = async (qrCode) => {
    if (!qrCode || loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Get current location if available
      let location = null;
      if (navigator.geolocation) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
        } catch (e) {
          console.log('Location not available');
        }
      }

      const response = await scanAPI.scanPackage(qrCode, user?.id, action, location);
      setScanResult(response.data);
      toast.success('Package scanned successfully!');
      
      if (onScanSuccess) {
        onScanSuccess(response.data);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to scan package';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleScan(manualCode.trim());
    }
  };

  const actionLabels = {
    pickup: 'Pickup',
    delivery: 'Delivery',
    verify: 'Verify',
    admin_verify: 'Admin Verify'
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-teal-400" />
            Scan Package QR Code
            <Badge variant="outline" className="ml-2 bg-teal-500/20 text-teal-400 border-teal-500/30">
              {actionLabels[action] || action}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Scanner Area */}
          {!scanResult && (
            <>
              {scanning ? (
                <div className="space-y-3">
                  <div 
                    id="qr-reader" 
                    ref={scannerRef}
                    className="w-full rounded-lg overflow-hidden bg-slate-900"
                  />
                  <Button
                    variant="outline"
                    onClick={stopScanning}
                    className="w-full border-slate-600"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Stop Scanning
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Button
                    onClick={startScanning}
                    className="w-full bg-teal-600 hover:bg-teal-700 h-24 flex-col"
                    data-testid="start-scan-btn"
                  >
                    <Camera className="w-8 h-8 mb-2" />
                    Open Camera Scanner
                  </Button>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-slate-700" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-slate-800 px-2 text-slate-500">Or enter manually</span>
                    </div>
                  </div>

                  <form onSubmit={handleManualSubmit} className="flex gap-2">
                    <Input
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      placeholder="Enter QR code (e.g., RX-PKG-XXXXXXXX)"
                      className="bg-slate-700 border-slate-600 text-white"
                      data-testid="manual-qr-input"
                    />
                    <Button 
                      type="submit" 
                      disabled={loading || !manualCode.trim()}
                      className="bg-teal-600 hover:bg-teal-700"
                      data-testid="manual-scan-btn"
                    >
                      {loading ? '...' : 'Scan'}
                    </Button>
                  </form>
                </div>
              )}
            </>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {/* Scan Result */}
          {scanResult && (
            <div className="space-y-4">
              <div className="p-4 bg-green-500/20 border border-green-500/30 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-green-400 font-medium">Package Verified!</span>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-400">Order:</span>
                    <span className="text-white font-mono">{scanResult.order_number}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-400">Status:</span>
                    <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                      {scanResult.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-400">Delivery:</span>
                    <span className="text-slate-300">{scanResult.delivery_address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Recipient:</span>
                    <span className="text-white">{scanResult.recipient_name}</span>
                  </div>
                </div>

                {/* Requirements */}
                <div className="flex gap-2 mt-3 pt-3 border-t border-slate-700">
                  {scanResult.requires_signature && (
                    <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                      <FileSignature className="w-3 h-3 mr-1" />
                      Signature Required
                    </Badge>
                  )}
                  {scanResult.requires_refrigeration && (
                    <Badge variant="outline" className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                      <Thermometer className="w-3 h-3 mr-1" />
                      Keep Cold
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setScanResult(null);
                    setManualCode('');
                  }}
                  className="flex-1 border-slate-600"
                >
                  Scan Another
                </Button>
                <Button
                  onClick={onClose}
                  className="flex-1 bg-teal-600 hover:bg-teal-700"
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QRScanner;
