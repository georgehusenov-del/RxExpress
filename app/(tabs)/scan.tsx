import React, { useRef, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  Vibration,
  View,
  useWindowDimensions,
} from 'react-native';
import { Redirect, router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from '@/components/Card';
import { InputField } from '@/components/InputField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { SectionTitle } from '@/components/SectionTitle';
import { useAuth } from '@/context/AuthContext';
import { rxexApi } from '@/api/rxexApi';
import { colors } from '@/theme/colors';
import { getContentMaxWidth, getHorizontalPadding, isTabletWidth } from '@/utils/responsive';

type LastResult = {
  code: string;
  orderNumber: string;
  alreadyScanned: boolean;
  deliveryId?: number;
} | null;

const ALREADY_SCANNED_STATUSES = [
  'picked_up', 'in_transit', 'out_for_delivery', 'delivering_now', 'delivered', 'completed',
];
const SCAN_COOLDOWN = 1000; // 1 second between scans

export default function ScanScreen() {
  const { user, loading } = useAuth();
  const { width, height } = useWindowDimensions();
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [scanStatus, setScanStatus] = useState('Ready to scan');
  const [lastResult, setLastResult] = useState<LastResult>(null);
  const [scanCount, setScanCount] = useState(0);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const lastScanTime = useRef(0);
  const tablet = isTabletWidth(width);
  const horizontalPadding = getHorizontalPadding(width);
  const contentMaxWidth = getContentMaxWidth(width, 560);

  // Large frame — similar scale to the signature modal canvas
  const maxFrameByHeight = Math.round(height * 0.48);
  const frameSize = tablet
    ? Math.min(Math.round(width * 0.72), 480, maxFrameByHeight)
    : Math.min(Math.round(width * 0.85), maxFrameByHeight);

  if (loading) {
    return <Screen contentContainerStyle={styles.center}><Text>Loading...</Text></Screen>;
  }
  if (!user) return <Redirect href="/login" />;

  if (!permission) {
    return <Screen contentContainerStyle={styles.center}><Text>Checking camera permission...</Text></Screen>;
  }

  if (!permission.granted) {
    const denied = !permission.canAskAgain && permission.status === 'denied';
    return (
      <Screen contentContainerStyle={[styles.permissionWrap, { paddingHorizontal: horizontalPadding }]}>
        <Card style={[styles.permissionCard, { maxWidth: contentMaxWidth }]}>
          {denied ? (
            <>
              <SectionTitle title="Camera Access Disabled" subtitle="Enable camera in Settings to scan QR codes." />
              <PrimaryButton title="Open Settings" onPress={() => Linking.openSettings()} />
            </>
          ) : (
            <>
              <SectionTitle title="Scan Package QR Codes" subtitle="Camera access is needed to scan package QR codes." />
              <PrimaryButton title="Enable Camera" onPress={requestPermission} />
            </>
          )}
        </Card>
      </Screen>
    );
  }

  async function resolveCode(rawData: string) {
    const code = rawData.trim();
    if (!code || busy) return;
    setBusy(true);
    setScanStatus('Verifying…');

    try {
      try {
        // Step 1: global verify — identify which delivery this package belongs to
        const apiResult = await rxexApi.globalScan({ scanType: 'verify', scannedCode: code });

        if (!apiResult.package) {
          setScanStatus('Package not found');
          setTimeout(() => setScanStatus('Ready to scan'), 1500);
          return;
        }

        const pkg = apiResult.package as any;
        let wasAlreadyScanned = ALREADY_SCANNED_STATUSES.includes(pkg.status ?? '');
        const displayCode = apiResult.scannedCode ?? pkg.packageCode ?? code;
        const deliveryId: number | undefined = pkg.orderId ?? pkg.id;

        // Step 2: delivery-specific pickup scan so this package shows green
        // in the delivery details page (updates DeliveryPackage.status → 'scanned')
        if (deliveryId && !wasAlreadyScanned) {
          try {
            await rxexApi.scanCode(deliveryId, { scanType: 'pickup', scannedCode: code });
          } catch (scanErr: any) {
            const errMsg = String(scanErr?.message || '').toLowerCase();
            // If backend says already scanned/done, treat it as already picked up
            if (errMsg.includes('already') || errMsg.includes('scanned')) {
              wasAlreadyScanned = true;
            }
            // Any other error is non-fatal — verify already confirmed the package
          }
        }

        setLastResult({
          code: displayCode,
          orderNumber: String(pkg.orderNumber ?? pkg.orderId ?? ''),
          alreadyScanned: wasAlreadyScanned,
          deliveryId,
        });
        setScanStatus(wasAlreadyScanned ? 'Package already verified' : 'Package verified');
        setManualCode('');

        // Load delivery package list for accurate X/Y progress counter
        if (deliveryId) {
          rxexApi.getPackages(deliveryId).then(pkgResult => {
            const pkgs = pkgResult.packages ?? [];
            if (pkgs.length > 0) {
              const scannedCount = pkgs.filter((p: any) => p.status === 'scanned').length;
              setTotalCount(pkgs.length);
              setScanCount(scannedCount);
              if (scannedCount === pkgs.length) {
                setScanStatus('Order scan complete');
              }
            }
          }).catch(() => null);
        }
      } catch {
        // Fallback: identify from driver route when global endpoint fails
        const routeResult = await rxexApi.myRoute() as any;
        const stops: any[] = (routeResult.stops ?? routeResult.deliveries ?? []).map((s: any) => ({
          ...s, id: s.id ?? s.orderId,
        }));
        const lastSegment = code.includes('/') ? code.split('/').filter(Boolean).pop() ?? code : code;
        const match = stops.find((s: any) =>
          [s.qrCode, s.orderNumber, s.trackingNumber].includes(code) ||
          [s.qrCode, s.orderNumber, s.trackingNumber].includes(lastSegment)
        );

        if (!match) {
          setScanStatus('Package not found');
          Alert.alert('Scan failed', 'This code does not match any of your active deliveries.');
          setTimeout(() => setScanStatus('Ready to scan'), 1500);
          return;
        }

        const wasAlreadyScanned = ALREADY_SCANNED_STATUSES.includes(match.status);

        // Delivery-specific pickup scan to mark package green in details
        if (!wasAlreadyScanned) {
          await rxexApi.scanCode(match.id, { scanType: 'pickup', scannedCode: code }).catch(() => null);
        }

        setLastResult({
          code,
          orderNumber: match.orderNumber,
          alreadyScanned: wasAlreadyScanned,
          deliveryId: match.id,
        });
        setScanStatus(wasAlreadyScanned ? 'Package already verified' : 'Package verified');
        setManualCode('');

        // Load package count for progress
        rxexApi.getPackages(match.id).then(pkgResult => {
          const pkgs = pkgResult.packages ?? [];
          if (pkgs.length > 0) {
            const scannedCount = pkgs.filter((p: any) => p.status === 'scanned').length;
            setTotalCount(pkgs.length);
            setScanCount(scannedCount);
            if (scannedCount === pkgs.length) {
              setScanStatus('Order scan complete');
            }
          }
        }).catch(() => null);
      }

      // Auto-clear result after 2 seconds so scanner is ready again
      setTimeout(() => {
        setLastResult(null);
        setScanStatus('Ready to scan');
      }, 2000);
    } catch (e: any) {
      setScanStatus('Scan failed');
      setTimeout(() => setScanStatus('Ready to scan'), 1500);
    } finally {
      setBusy(false);
    }
  }

  function handleBarcode({ data }: { data: string }) {
    const now = Date.now();
    if (now - lastScanTime.current < SCAN_COOLDOWN) return; // 1s cooldown
    lastScanTime.current = now;
    Vibration.vibrate(80); // haptic vibration as beep feedback
    resolveCode(data);
  }

  const isSuccess = scanStatus.startsWith('✓');
  const isWarn = false; // already-picked-up is success, not a warning

  return (
    <View style={styles.page}>
      <CameraView
        style={StyleSheet.absoluteFill}
        barcodeScannerSettings={{ barcodeTypes: ['qr', 'code128', 'code39', 'ean13'] }}
        onBarcodeScanned={handleBarcode}
      />

      <View style={[styles.overlay, { paddingHorizontal: horizontalPadding, paddingTop: tablet ? 34 : 24 }]}>
        {/* Header */}
        <View style={styles.topCopy}>
          <Text style={styles.header}>Scan Package</Text>
          <Text style={styles.instructions}>Point the camera at the package QR code</Text>
        </View>

        {/* Large scan frame */}
        <View style={styles.scanFrameWrap}>
          <View style={[styles.scanFrame, { width: frameSize, height: frameSize }]}>
            {/* Corner markers */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>

          {/* Success flash overlay on scan */}
          {lastResult && !lastResult.alreadyScanned && (
            <View
              style={[styles.flashOverlay, { width: frameSize, height: frameSize }]}
              pointerEvents="none"
            >
              <MaterialCommunityIcons name="check-circle" size={64} color="#FFFFFF" />
            </View>
          )}

          {/* Already-picked-up overlay — green, not a warning */}
          {lastResult?.alreadyScanned && (
            <View
              style={[styles.flashOverlayWarn, { width: frameSize, height: frameSize }]}
              pointerEvents="none"
            >
              <MaterialCommunityIcons name="check-circle" size={52} color="#4ADE80" />
              <Text style={styles.flashWarnText}>Already Picked Up</Text>
            </View>
          )}

          {busy && !lastResult && (
            <View style={styles.scanBusyOverlay}>
              <Text style={styles.scanBusyText}>Verifying…</Text>
            </View>
          )}
        </View>

        {/* Compact bottom card */}
        <Card style={[styles.bottomCard, { maxWidth: contentMaxWidth }]}>
          {/* Status + gig progress */}
          <View style={styles.statusRow}>
            <View style={[
              styles.statusDot,
              isSuccess && styles.statusDotSuccess,
              isWarn && styles.statusDotWarn,
            ]} />
            <Text style={[
              styles.statusText,
              isSuccess && styles.statusTextSuccess,
              isWarn && styles.statusTextWarn,
            ]}>
              {scanStatus}
            </Text>
            {(scanCount > 0 || totalCount !== null) && (
              <View style={styles.progressPill}>
                <MaterialCommunityIcons name="package-check" size={13} color={colors.primaryDark} />
                <Text style={styles.progressText}>
                  {totalCount !== null
                    ? `${scanCount} of ${totalCount} verified`
                    : `${scanCount} verified`}
                </Text>
              </View>
            )}
          </View>

          {/* Brief last-scan result (auto-dismisses after 2s) */}
          {lastResult && (
            <View style={[styles.lastResultRow, lastResult.alreadyScanned && styles.lastResultRowWarn]}>
              <MaterialCommunityIcons
                name="check-circle-outline"
                size={15}
                color={colors.success}
              />
              <Text
                style={[styles.lastResultText, lastResult.alreadyScanned && styles.lastResultTextWarn]}
                numberOfLines={1}
              >
                {lastResult.alreadyScanned ? 'Package already verified' : 'Package verified'}: {lastResult.code}
              </Text>
              {lastResult.deliveryId != null && (
                <Pressable
                  onPress={() => {
                    if (lastResult?.deliveryId != null) {
                      router.push(`/delivery/${lastResult.deliveryId}`);
                    }
                  }}
                >
                  <Text style={styles.viewLink}>View →</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* Manual entry */}
          <InputField
            value={manualCode}
            onChangeText={setManualCode}
            placeholder="Enter QR or tracking code manually"
            icon="barcode-scan"
            containerStyle={styles.manualInputWrap}
          />
          <View style={styles.manualActions}>
            <PrimaryButton
              title="Verify Code"
              variant="outline"
              onPress={() => {
                if (manualCode.trim()) {
                  Vibration.vibrate(80);
                  resolveCode(manualCode);
                }
              }}
              disabled={!manualCode.trim() || busy}
              style={styles.manualButton}
            />
            {scanCount > 0 && (
              <Pressable onPress={() => { setScanCount(0); setTotalCount(null); }}>
                <Text style={styles.resetText}>Reset count</Text>
              </Pressable>
            )}
          </View>
        </Card>
      </View>
    </View>
  );
}

const CORNER_LEN = 22;
const CORNER_W = 4;
const CORNER_RADIUS = 8;
const CORNER_COLOR = '#C6FBFF';

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#04181C' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  permissionWrap: { justifyContent: 'center', alignItems: 'center' },
  permissionCard: { width: '100%' },

  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 20,
    backgroundColor: 'rgba(2,17,21,0.38)',
  },

  topCopy: { alignItems: 'center', paddingTop: 8 },
  header: { marginTop: 8, fontSize: 26, fontWeight: '900', color: '#FFFFFF' },
  instructions: { marginTop: 6, color: '#D8F3F7', fontSize: 14, textAlign: 'center' },

  // Scan frame
  scanFrameWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    position: 'relative',
  },
  scanFrame: {
    borderWidth: 3,
    borderColor: '#C6FBFF',
    borderRadius: 28,
    backgroundColor: 'transparent',
    shadowColor: '#80F5FF',
    shadowOpacity: 0.45,
    shadowRadius: 22,
    elevation: 6,
    position: 'relative',
  },

  // Corner markers inside the frame
  corner: {
    position: 'absolute',
    width: CORNER_LEN,
    height: CORNER_LEN,
  },
  cornerTL: {
    top: -2, left: -2,
    borderTopWidth: CORNER_W, borderLeftWidth: CORNER_W,
    borderColor: '#FFFFFF',
    borderTopLeftRadius: CORNER_RADIUS,
  },
  cornerTR: {
    top: -2, right: -2,
    borderTopWidth: CORNER_W, borderRightWidth: CORNER_W,
    borderColor: '#FFFFFF',
    borderTopRightRadius: CORNER_RADIUS,
  },
  cornerBL: {
    bottom: -2, left: -2,
    borderBottomWidth: CORNER_W, borderLeftWidth: CORNER_W,
    borderColor: '#FFFFFF',
    borderBottomLeftRadius: CORNER_RADIUS,
  },
  cornerBR: {
    bottom: -2, right: -2,
    borderBottomWidth: CORNER_W, borderRightWidth: CORNER_W,
    borderColor: '#FFFFFF',
    borderBottomRightRadius: CORNER_RADIUS,
  },

  // Flash overlays
  flashOverlay: {
    position: 'absolute',
    borderRadius: 28,
    backgroundColor: 'rgba(0, 200, 100, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flashOverlayWarn: {
    position: 'absolute',
    borderRadius: 28,
    backgroundColor: 'rgba(74, 222, 128, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  flashWarnText: {
    color: '#4ADE80',
    fontSize: 16,
    fontWeight: '900',
  },

  scanBusyOverlay: {
    position: 'absolute',
    backgroundColor: 'rgba(0,76,85,0.85)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  scanBusyText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },

  // Bottom card
  bottomCard: {
    backgroundColor: 'rgba(255,255,255,0.97)',
    width: '100%',
    alignSelf: 'center',
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#80C8D0',
  },
  statusDotSuccess: { backgroundColor: colors.success },
  statusDotWarn: { backgroundColor: colors.warning },
  statusText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: colors.navy,
  },
  statusTextSuccess: { color: colors.success },
  statusTextWarn: { color: '#92400E' },

  progressPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.bgSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.primaryDark,
  },

  lastResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 10,
  },
  lastResultRowWarn: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  lastResultText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colors.success,
  },
  lastResultTextWarn: { color: '#15803D' },
  viewLink: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.primaryDark,
  },

  manualInputWrap: { marginTop: 4 },
  manualActions: { marginTop: 8, gap: 8 },
  manualButton: { backgroundColor: '#FFFFFF' },
  resetText: {
    textAlign: 'center',
    fontWeight: '700',
    color: colors.muted,
    paddingVertical: 4,
    fontSize: 13,
  },
});
