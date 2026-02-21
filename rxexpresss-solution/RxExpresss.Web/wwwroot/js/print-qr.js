// Shared Print QR Code Label Function
function printQrCode(qrCode, orderNumber, recipientName, address) {
    const printWindow = window.open('', '_blank', 'width=400,height=500');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Print QR - ${qrCode}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: Arial, sans-serif; padding: 20px; }
                .label { 
                    border: 2px solid #000; 
                    padding: 15px; 
                    width: 300px; 
                    text-align: center;
                }
                .qr-code { 
                    font-size: 48px; 
                    font-weight: bold; 
                    letter-spacing: 2px;
                    padding: 20px 0;
                    border-bottom: 1px solid #ccc;
                    margin-bottom: 10px;
                }
                .order-num { 
                    font-size: 14px; 
                    color: #666; 
                    margin-bottom: 8px;
                }
                .recipient { 
                    font-size: 16px; 
                    font-weight: bold;
                    margin-bottom: 4px;
                }
                .address { 
                    font-size: 12px; 
                    color: #444;
                }
                .logo {
                    font-size: 18px;
                    font-weight: bold;
                    color: #0d9488;
                    margin-bottom: 10px;
                }
                .barcode {
                    margin-top: 15px;
                    font-family: 'Libre Barcode 39', monospace;
                    font-size: 36px;
                }
                @media print {
                    body { padding: 0; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="label">
                <div class="logo">RX Expresss</div>
                <div class="qr-code">${qrCode}</div>
                <div class="order-num">${orderNumber}</div>
                <div class="recipient">${recipientName}</div>
                <div class="address">${address}</div>
                <div class="barcode">*${qrCode}*</div>
            </div>
            <div class="no-print" style="margin-top:20px;text-align:center">
                <button onclick="window.print()" style="padding:10px 20px;font-size:16px;cursor:pointer">Print Label</button>
            </div>
            <script>
                // Auto-print after small delay
                setTimeout(() => window.print(), 500);
            <\/script>
        </body>
        </html>
    `);
    printWindow.document.close();
}
