import { QRCodeSVG } from 'qrcode.react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle, Package, QrCode, Download, Printer, Copy, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';

export const OrderSuccessModal = ({ order, onClose }) => {
  if (!order) return null;

  const handleCopyQR = () => {
    navigator.clipboard.writeText(order.qr_code);
    toast.success('QR code copied to clipboard');
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Order ${order.order_number} - QR Codes</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .qr-container { text-align: center; margin: 20px 0; page-break-inside: avoid; }
            .qr-code { margin: 10px auto; }
            .order-info { margin-bottom: 20px; }
            h1 { color: #0d9488; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>RX Expresss</h1>
            <h2>Order #${order.order_number}</h2>
          </div>
          <div class="order-info">
            <p><strong>Tracking Number:</strong> ${order.tracking_number}</p>
            <p><strong>Delivery Type:</strong> ${order.delivery_type}</p>
          </div>
          <div class="qr-container">
            <h3>Main Order QR Code</h3>
            <div class="qr-code">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(order.qr_code)}" alt="QR Code" />
            </div>
            <p><strong>${order.qr_code}</strong></p>
          </div>
          ${order.package_qr_codes?.map((qr, i) => `
            <div class="qr-container">
              <h3>Package ${i + 1} QR Code</h3>
              <div class="qr-code">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qr)}" alt="Package QR" />
              </div>
              <p>${qr}</p>
            </div>
          `).join('') || ''}
          <button class="no-print" onclick="window.print()" style="margin-top: 20px; padding: 10px 20px; background: #0d9488; color: white; border: none; cursor: pointer;">
            Print
          </button>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <DialogTitle className="text-green-700">Order Created Successfully!</DialogTitle>
              <DialogDescription>
                Order #{order.order_number}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Order Info */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Tracking Number:</span>
              <Badge variant="outline" className="font-mono">{order.tracking_number}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Delivery Type:</span>
              <Badge className="bg-teal-100 text-teal-700">
                {order.delivery_type?.replace('_', ' ')}
              </Badge>
            </div>
            {order.time_window && (
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Time Window:</span>
                <span className="font-medium">{order.time_window}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Total Cost:</span>
              <span className="font-bold text-lg text-teal-600">${order.total_amount?.toFixed(2)}</span>
            </div>
            {order.copay_amount > 0 && (
              <div className="flex justify-between items-center pt-2 mt-2 border-t border-slate-200">
                <span className="text-green-600 font-medium">Copay to Collect:</span>
                <span className="font-bold text-lg text-green-600">${order.copay_amount?.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Copay Alert */}
          {order.copay_amount > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-green-600 font-bold">$</span>
              </div>
              <div>
                <p className="font-medium text-green-800">Copay Collection Required</p>
                <p className="text-sm text-green-600">
                  Driver will collect <strong>${order.copay_amount?.toFixed(2)}</strong> from patient upon delivery
                </p>
              </div>
            </div>
          )}

          {/* Main QR Code */}
          <div className="border-2 border-dashed border-teal-200 rounded-xl p-6 text-center bg-white">
            <div className="flex items-center justify-center gap-2 mb-3">
              <QrCode className="w-5 h-5 text-teal-600" />
              <span className="font-semibold text-slate-700">Order QR Code</span>
            </div>
            
            <div className="inline-block p-4 bg-white rounded-lg shadow-sm border">
              <QRCodeSVG 
                value={order.qr_code} 
                size={180}
                level="H"
                includeMargin={true}
              />
            </div>
            
            <p className="mt-3 font-mono text-lg font-bold text-slate-800">{order.qr_code}</p>
            <p className="text-sm text-slate-500 mt-1">
              Driver will scan this QR code upon pickup
            </p>

            <div className="flex justify-center gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={handleCopyQR}>
                <Copy className="w-4 h-4 mr-1" /> Copy
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-1" /> Print
              </Button>
            </div>
          </div>

          {/* Package QR Codes */}
          {order.package_qr_codes?.length > 0 && (
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-4 h-4 text-slate-500" />
                <span className="font-medium text-slate-700">Package QR Codes ({order.package_qr_codes.length})</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {order.package_qr_codes.map((qr, index) => (
                  <div key={qr} className="bg-white p-3 rounded-lg border text-center">
                    <QRCodeSVG value={qr} size={80} level="M" />
                    <p className="text-xs font-mono mt-2 text-slate-600">PKG {index + 1}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
            <p className="font-medium text-amber-800 mb-1">Next Steps:</p>
            <ol className="list-decimal list-inside text-amber-700 space-y-1">
              <li>Print the QR code and attach to the package</li>
              <li>Package will be ready for driver pickup</li>
              <li>Driver scans QR code to confirm pickup</li>
              <li>Track delivery progress in your dashboard</li>
            </ol>
          </div>
        </div>

        <DialogFooter className="gap-2 mt-4">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" /> Print Labels
          </Button>
          <Button onClick={onClose} className="bg-teal-600 hover:bg-teal-700">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OrderSuccessModal;
