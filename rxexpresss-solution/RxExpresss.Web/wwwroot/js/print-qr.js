// Generate and Print QR Code Label using inline QR code image
function printQrCode(qrCode, orderNumber, recipientName, address) {
    // Use qrserver.com API to generate QR code image URL
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCode)}&format=png`;
    
    const printWindow = window.open('', '_blank', 'width=450,height=650');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Print QR - ${qrCode}</title>
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
                    font-size: 22px;
                    font-weight: bold;
                    color: #0d9488;
                    margin-bottom: 15px;
                }
                .qr-container {
                    margin: 15px auto;
                    padding: 10px;
                    background: white;
                }
                .qr-container img {
                    width: 180px;
                    height: 180px;
                    display: block;
                    margin: 0 auto;
                }
                .qr-code-text { 
                    font-size: 32px; 
                    font-weight: bold; 
                    letter-spacing: 3px;
                    margin-top: 15px;
                    color: #000;
                }
                .order-num { 
                    font-size: 14px; 
                    color: #666; 
                    margin: 8px 0;
                }
                .recipient { 
                    font-size: 18px; 
                    font-weight: bold;
                    margin-bottom: 4px;
                    color: #000;
                }
                .address { 
                    font-size: 14px; 
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
                @media print {
                    body { padding: 0; margin: 0; }
                    .no-print { display: none !important; }
                    .label { border: 2px solid #000 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            </style>
        </head>
        <body>
            <div class="label">
                <div class="logo">RX Expresss</div>
                <div class="qr-container">
                    <img src="${qrImageUrl}" alt="QR Code" id="qr-img"/>
                </div>
                <div class="qr-code-text">${qrCode}</div>
                <div class="order-num">${orderNumber}</div>
                <div class="recipient">${recipientName}</div>
                <div class="address">${address}</div>
            </div>
            <button class="print-btn no-print" onclick="doPrint()">Print Label</button>
            <script>
                function doPrint() {
                    window.focus();
                    window.print();
                }
                
                // Wait for QR image to load then auto-print
                var qrImg = document.getElementById('qr-img');
                if (qrImg.complete) {
                    setTimeout(doPrint, 300);
                } else {
                    qrImg.onload = function() {
                        setTimeout(doPrint, 300);
                    };
                    qrImg.onerror = function() {
                        // Print anyway even if image fails
                        setTimeout(doPrint, 500);
                    };
                }
            <\/script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// Generate QR code image URL (for displaying in modals)
function getQrCodeImageUrl(text, size) {
    size = size || 150;
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&format=png`;
}
