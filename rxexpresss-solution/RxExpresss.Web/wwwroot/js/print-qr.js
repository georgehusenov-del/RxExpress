// Generate and Print QR Code Label
async function printQrCode(qrCode, orderNumber, recipientName, address) {
    const printWindow = window.open('', '_blank', 'width=450,height=600');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Print QR - ${qrCode}</title>
            <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"><\/script>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: Arial, sans-serif; padding: 20px; display: flex; flex-direction: column; align-items: center; }
                .label { 
                    border: 2px solid #000; 
                    padding: 20px; 
                    width: 350px; 
                    text-align: center;
                    background: white;
                }
                .logo {
                    font-size: 20px;
                    font-weight: bold;
                    color: #0d9488;
                    margin-bottom: 15px;
                }
                .qr-container {
                    margin: 15px auto;
                    padding: 10px;
                    background: white;
                }
                .qr-code-text { 
                    font-size: 28px; 
                    font-weight: bold; 
                    letter-spacing: 2px;
                    margin-top: 10px;
                    color: #000;
                }
                .order-num { 
                    font-size: 14px; 
                    color: #666; 
                    margin: 8px 0;
                }
                .recipient { 
                    font-size: 16px; 
                    font-weight: bold;
                    margin-bottom: 4px;
                    color: #000;
                }
                .address { 
                    font-size: 13px; 
                    color: #333;
                }
                .print-btn {
                    margin-top: 20px;
                    padding: 12px 30px;
                    font-size: 16px;
                    cursor: pointer;
                    background: #0d9488;
                    color: white;
                    border: none;
                    border-radius: 8px;
                }
                .print-btn:hover {
                    background: #0f766e;
                }
                @@media print {
                    body { padding: 0; }
                    .no-print { display: none !important; }
                }
            </style>
        </head>
        <body>
            <div class="label">
                <div class="logo">RX Expresss</div>
                <div class="qr-container">
                    <canvas id="qr-canvas"></canvas>
                </div>
                <div class="qr-code-text">${qrCode}</div>
                <div class="order-num">${orderNumber}</div>
                <div class="recipient">${recipientName}</div>
                <div class="address">${address}</div>
            </div>
            <button class="print-btn no-print" onclick="window.print()">Print Label</button>
            <script>
                // Generate QR code
                QRCode.toCanvas(document.getElementById('qr-canvas'), '${qrCode}', {
                    width: 180,
                    margin: 1,
                    color: {
                        dark: '#000000',
                        light: '#ffffff'
                    }
                }, function(error) {
                    if (error) console.error(error);
                    // Auto-print after QR generated
                    setTimeout(() => window.print(), 800);
                });
            <\/script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// Generate QR code image URL (for displaying in modals)
async function generateQrCodeDataUrl(text, size = 150) {
    return new Promise((resolve, reject) => {
        if (typeof QRCode !== 'undefined' && QRCode.toDataURL) {
            QRCode.toDataURL(text, {
                width: size,
                margin: 1,
                color: { dark: '#000000', light: '#ffffff' }
            }, (err, url) => {
                if (err) reject(err);
                else resolve(url);
            });
        } else {
            // Fallback: use API-based QR code generator
            resolve(`https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`);
        }
    });
}
