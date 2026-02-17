// QR Scanner Patch - Fixes the "Cannot stop, scanner is not running" error
// This patch overrides the problematic stopQrScanner function

(function() {
    // Wait for page to fully load and html5QrCode to be defined
    const originalVerifyQrCode = window.verifyQrCode;
    const originalCloseScanModal = window.closeScanModal;
    const originalStopQrScanner = window.stopQrScanner;
    
    // Patched stopQrScanner that handles non-running scanner gracefully
    window.stopQrScanner = function() {
        if (window.html5QrCode) {
            try {
                // Check if scanner is actually running before stopping
                const state = window.html5QrCode.getState ? window.html5QrCode.getState() : null;
                // State 2 = SCANNING, State 3 = PAUSED
                if (state === 2 || state === 3) {
                    window.html5QrCode.stop().catch(function() {});
                }
            } catch (e) {
                // Silently ignore - scanner wasn't in stoppable state
                console.log('Scanner cleanup (no action needed)');
            }
            window.html5QrCode = null;
        }
    };
    
    // Patched closeScanModal that handles errors gracefully
    window.closeScanModal = function() {
        try {
            window.stopQrScanner();
        } catch (e) {
            // Ignore scanner stop errors
        }
        document.getElementById('scan-modal').classList.remove('active');
    };
    
    console.log('QR Scanner patch loaded');
})();
