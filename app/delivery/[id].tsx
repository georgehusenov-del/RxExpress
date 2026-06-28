import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from '@/components/Card';
import { InputField } from '@/components/InputField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { StatusBadge } from '@/components/StatusBadge';
import { SignatureModal } from '@/components/SignatureModal';
import { rxexApi } from '@/api/rxexApi';
import type { Delivery } from '@/types/api';
import { colors } from '@/theme/colors';
import { captureBase64Photo } from '@/utils/image';
import { getCurrentCoordinates } from '@/utils/location';
import { openNavigationForDelivery, sanitizePhone } from '@/utils/navigation';
import { getContentMaxWidth, getHorizontalPadding } from '@/utils/responsive';

const isDev = typeof __DEV__ !== 'undefined' && __DEV__;

type CopayDecision = 'collected' | 'not_collected' | null;

export default function DeliveryDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const deliveryId = Number(id);
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [podBusy, setPodBusy] = useState(false);
  const [attemptBusy, setAttemptBusy] = useState(false);
  const [notes, setNotes] = useState('');
  const [recipient, setRecipient] = useState('');
  const [failureReason, setFailureReason] = useState('recipient_not_home');
  const [signature, setSignature] = useState<string | undefined>();
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [photoHome, setPhotoHome] = useState<string | undefined>();
  const [photoAddr, setPhotoAddr] = useState<string | undefined>();
  const [photoPkg, setPhotoPkg] = useState<string | undefined>();
  const [copayDecision, setCopayDecision] = useState<CopayDecision>(null);
  const podRunning = useRef(false);
  const attemptRunning = useRef(false);
  const lastPodStart = useRef(0);
  const lastAttemptStart = useRef(0);
  const horizontalPadding = getHorizontalPadding(width);
  const contentMaxWidth = getContentMaxWidth(width, 920);

  async function load() {
    try {
      // Try route first, fall back to deliveries
      let found: Delivery | undefined;
      try {
        const r = await rxexApi.myRoute();
        const raw = r as any;
        const stops: any[] = (raw.stops ?? raw.deliveries ?? []).map((s: any) => ({
          ...s,
          id: s.id ?? s.orderId,
        }));
        found = stops.find((d: any) => d.id === deliveryId);
      } catch {}
      if (!found) {
        const r = await rxexApi.deliveries();
        found = r.deliveries.find(d => d.id === deliveryId);
      }
      setDelivery(found || null);
    } catch (e: any) {
      Alert.alert('Load failed', e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [deliveryId]);

  const address = useMemo(() =>
    delivery
      ? `${delivery.street}${delivery.aptUnit ? ', ' + delivery.aptUnit : ''}, ${delivery.city}, ${delivery.state} ${delivery.postalCode}`
      : '',
    [delivery]
  );

  // Copay logic
  const copayRequired = !!(delivery && delivery.copayAmount > 0 && !delivery.copayCollected);
  const podUnlocked = !copayRequired || copayDecision === 'collected';

  async function capturePhoto(label: string, setter: (v: string) => void) {
    try {
      const data = await captureBase64Photo(label);
      setter(data);
    } catch (e: any) {
      Alert.alert('Photo failed', e.message);
    }
  }

  async function setStatus(status: string) {
    try {
      setPodBusy(true);
      await rxexApi.updateDeliveryStatus(deliveryId, status);
      await load();
    } catch (e: any) {
      Alert.alert('Status failed', e.message);
    } finally {
      setPodBusy(false);
    }
  }

  async function handleCopayDecision(decision: 'collected' | 'not_collected') {
    setCopayDecision(decision);
    if (decision === 'collected') {
      try {
        await rxexApi.collectCopay(deliveryId);
        await load();
      } catch (e: any) {
        // Non-blocking: local state is still set.
        if (isDev) console.log('[Copay]', e.message);
      }
    }
  }

  async function completeWithoutPodFallback() {
    for (const status of ['delivered', 'completed']) {
      try {
        await rxexApi.updateDeliveryStatus(deliveryId, status);
        Alert.alert('Completed', 'Delivery marked complete without POD upload.');
        router.replace('/deliveries');
        return;
      } catch {}
    }
    Alert.alert('Fallback failed', 'Unable to mark delivery complete.');
  }

  async function completePod() {
    const now = Date.now();
    if (podRunning.current || now - lastPodStart.current < 2500) return;
    if (!photoHome || !photoAddr || !photoPkg) {
      Alert.alert('Photos required', 'Please capture all 3 required photos before completing.');
      return;
    }
    if (delivery?.requiresSignature && !signature) {
      Alert.alert('Signature required', 'Please capture the recipient signature before completing.');
      return;
    }
    lastPodStart.current = now;
    podRunning.current = true;
    try {
      setPodBusy(true);
      const coords = await getCurrentCoordinates().catch(() => undefined);
      await rxexApi.submitPod(deliveryId, {
        photoHomeBase64: photoHome,
        photoAddressBase64: photoAddr,
        photoPackageBase64: photoPkg,
        signatureBase64: signature,
        recipientName: recipient || delivery?.recipientName,
        notes,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
      });
      Alert.alert('Completed', 'Delivery completed with proof of delivery.');
      router.replace('/deliveries');
    } catch (e: any) {
      const message = e.message || 'POD upload failed.';
      if (String(message).toLowerCase().includes('failed to save photos')) {
        Alert.alert(
          'POD save failed',
          'Photo upload failed. Mark delivery complete without POD?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Mark Complete', onPress: () => completeWithoutPodFallback() },
          ]
        );
      } else {
        Alert.alert('POD failed', message);
      }
    } finally {
      podRunning.current = false;
      setPodBusy(false);
    }
  }

  async function failedAttempt() {
    const now = Date.now();
    if (attemptRunning.current || now - lastAttemptStart.current < 2500) return;
    lastAttemptStart.current = now;
    attemptRunning.current = true;
    try {
      setAttemptBusy(true);
      const r = await rxexApi.logAttempt(deliveryId, { status: 'failed', failureReason, notes });
      Alert.alert('Attempt logged', r.message);
      router.replace('/deliveries');
    } catch (e: any) {
      Alert.alert('Failed attempt error', e.message);
    } finally {
      attemptRunning.current = false;
      setAttemptBusy(false);
    }
  }

  if (loading || !delivery) {
    return (
      <Screen contentContainerStyle={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.loadingText}>Loading delivery...</Text>
      </Screen>
    );
  }

  const allPhotosCaptured = !!photoHome && !!photoAddr && !!photoPkg;
  const canComplete = allPhotosCaptured && (!delivery.requiresSignature || !!signature) && podUnlocked;
  const phoneNumber = sanitizePhone(delivery.recipientPhone);

  async function callPatient() {
    if (!phoneNumber) return;

    try {
      await Linking.openURL(`tel:${phoneNumber}`);
    } catch {
      Alert.alert('Call failed', 'Unable to open the phone dialer on this device.');
    }
  }

  async function navigateToPatient() {
    if (!delivery) return;

    try {
      await openNavigationForDelivery(delivery);
    } catch {
      Alert.alert('Navigation failed', 'Unable to open maps for this delivery address.');
    }
  }

  return (
    <>
      <SignatureModal
        visible={showSignatureModal}
        recipientName={recipient || delivery.recipientName}
        onSave={(sig) => {
          setSignature(sig);
          setShowSignatureModal(false);
        }}
        onCancel={() => setShowSignatureModal(false)}
      />

      <Screen scroll keyboard contentContainerStyle={[styles.pad, { paddingHorizontal: horizontalPadding }]}>
        <View style={[styles.contentWrap, { maxWidth: contentMaxWidth }]}>

          {/* Header */}
          <View style={styles.backRow}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <MaterialCommunityIcons name="arrow-left" size={22} color={colors.primaryDark} />
              <Text style={styles.backText}>Back</Text>
            </Pressable>
            <StatusBadge status={delivery.status} />
          </View>

          {/* Hero card */}
          <Card style={[styles.heroCard, delivery.isRefrigerated && styles.heroCardCold]}>
            {delivery.isRefrigerated && (
              <View style={styles.coldBannerFull}>
                <MaterialCommunityIcons name="snowflake" size={16} color="#075985" />
                <Text style={styles.coldBannerText}>REFRIGERATED - Cold Chain Required</Text>
              </View>
            )}
            <View style={styles.heroTop}>
              <View style={styles.heroTextWrap}>
                <Text style={styles.heroEyebrow}>Current stop</Text>
                <Text style={styles.heroPatient}>{delivery.recipientName}</Text>
                <Text style={styles.heroAddress}>{address}</Text>
              </View>
              <View style={styles.heroRight}>
                <StatusBadge status={delivery.status} />
                {delivery.copayAmount > 0 && (
                  <View style={[styles.copayPill, delivery.copayCollected && styles.copayPillDone]}>
                    <MaterialCommunityIcons
                      name="cash"
                      size={14}
                      color={delivery.copayCollected ? colors.success : '#92400E'}
                    />
                    <Text style={[styles.copayPillText, delivery.copayCollected && styles.copayPillTextDone]}>
                      ${Number(delivery.copayAmount).toFixed(2)} {delivery.copayCollected ? 'collected' : 'due'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.metaWrap}>
              <MetaPill icon="storefront-outline" text={delivery.pharmacyName} />
              <MetaPill icon="phone-outline" text={delivery.recipientPhone || 'No phone'} onPress={phoneNumber ? callPatient : undefined} />
              {delivery.timeWindow ? <MetaPill icon="clock-outline" text={delivery.timeWindow} /> : null}
            </View>
            <View style={styles.heroActions}>
              <Pressable style={styles.navigateButton} onPress={navigateToPatient}>
                <MaterialCommunityIcons name="navigation-variant" size={18} color="#FFFFFF" />
                <Text style={styles.navigateButtonText}>Navigate</Text>
              </Pressable>
            </View>
          </Card>

          {/* Requirements */}
          <Card style={styles.mt}>
            <Text style={styles.sectionTitle}>Delivery requirements</Text>
            <RequirementRow label="Delivery type" value={delivery.deliveryType || 'Standard'} />
            <RequirementRow label="Signature" value={delivery.requiresSignature ? 'Required' : 'Not required'} />
            <RequirementRow label="Cold chain" value={delivery.isRefrigerated ? 'Cold-chain handling required' : 'Standard handling'} />
            {delivery.deliveryInstructions ? (
              <RequirementRow label="Instructions" value={delivery.deliveryInstructions} />
            ) : null}
          </Card>

          {/* Status workflow */}
          <Card style={styles.mt}>
            <Text style={styles.sectionTitle}>Workflow actions</Text>
            <Text style={styles.sectionSub}>Advance the stop through each stage in order.</Text>
            <View style={styles.buttons}>
              <StatusAction
                label="Mark Picked Up"
                icon="package-up"
                active={delivery.status === 'picked_up'}
                onPress={() => setStatus('picked_up')}
                busy={podBusy}
                done={['out_for_delivery','delivering_now','delivered','completed'].includes(delivery.status)}
              />
              <StatusAction
                label="Out for Delivery"
                icon="truck-fast-outline"
                active={delivery.status === 'out_for_delivery'}
                onPress={() => setStatus('out_for_delivery')}
                busy={podBusy}
                done={['delivering_now','delivered','completed'].includes(delivery.status)}
              />
              <StatusAction
                label="Arrived / Delivering Now"
                icon="map-marker-check-outline"
                active={delivery.status === 'delivering_now'}
                onPress={() => setStatus('delivering_now')}
                busy={podBusy}
                done={['delivered','completed'].includes(delivery.status)}
              />
            </View>
          </Card>

          {/* Copay gate */}
          {copayRequired && (
            <Card style={styles.mt}>
              <View style={styles.copayHeader}>
                <MaterialCommunityIcons name="cash-multiple" size={22} color="#92400E" />
                <Text style={styles.copayTitle}>Copay Required</Text>
              </View>
              <Text style={styles.copayAmount}>Amount Due: ${Number(delivery.copayAmount).toFixed(2)}</Text>
              <Text style={styles.copaySub}>
                Select copay status before completing proof of delivery.
              </Text>

              <View style={styles.copayOptions}>
                <Pressable
                  style={[styles.copayOption, copayDecision === 'collected' && styles.copayOptionSelected]}
                  onPress={() => handleCopayDecision('collected')}
                >
                  <View style={[styles.radio, copayDecision === 'collected' && styles.radioSelected]}>
                    {copayDecision === 'collected' && <View style={styles.radioDot} />}
                  </View>
                  <MaterialCommunityIcons name="check-circle-outline" size={20} color={copayDecision === 'collected' ? colors.success : colors.muted} />
                  <Text style={[styles.copayOptionText, copayDecision === 'collected' && styles.copayOptionTextSelected]}>
                    Copay Collected
                  </Text>
                </Pressable>

                <Pressable
                  style={[styles.copayOption, copayDecision === 'not_collected' && styles.copayOptionWarning]}
                  onPress={() => setCopayDecision('not_collected')}
                >
                  <View style={[styles.radio, copayDecision === 'not_collected' && styles.radioWarning]}>
                    {copayDecision === 'not_collected' && <View style={styles.radioDotWarning} />}
                  </View>
                  <MaterialCommunityIcons name="close-circle-outline" size={20} color={copayDecision === 'not_collected' ? colors.danger : colors.muted} />
                  <Text style={[styles.copayOptionText, copayDecision === 'not_collected' && styles.copayOptionTextWarning]}>
                    Copay Not Collected
                  </Text>
                </Pressable>
              </View>

              {copayDecision === 'collected' && (
                <View style={styles.copayConfirmBanner}>
                  <MaterialCommunityIcons name="check-decagram" size={18} color={colors.success} />
                  <Text style={styles.copayConfirmText}>
                    Copay of ${Number(delivery.copayAmount).toFixed(2)} confirmed collected.
                  </Text>
                </View>
              )}

              {copayDecision === 'not_collected' && (
                <View style={styles.copayWarningBanner}>
                  <MaterialCommunityIcons name="alert" size={18} color={colors.danger} />
                  <Text style={styles.copayWarningText}>
                    Please collect the copay before completing the delivery.
                  </Text>
                </View>
              )}
            </Card>
          )}

          {/* Proof of delivery */}
          {podUnlocked ? (
            <Card style={styles.mt}>
              <Text style={styles.sectionTitle}>Proof of Delivery</Text>
              <Text style={styles.sectionSub}>Capture all required evidence before completing the delivery.</Text>

              <InputField
                label="Recipient name"
                icon="account-outline"
                placeholder="Who accepted the delivery?"
                value={recipient}
                onChangeText={setRecipient}
                containerStyle={styles.fieldSpacing}
              />
              <InputField
                label="Delivery notes"
                icon="text-box-outline"
                placeholder="Optional delivery notes"
                value={notes}
                onChangeText={setNotes}
                multiline
                containerStyle={styles.fieldSpacing}
                style={styles.notesInput}
              />

              <Text style={styles.fieldLabel}>Required photos</Text>
              <PhotoButton label="Home / building exterior" done={!!photoHome} onPress={() => capturePhoto('Home/building', setPhotoHome)} />
              <PhotoButton label="Address plaque / number" done={!!photoAddr} onPress={() => capturePhoto('Address', setPhotoAddr)} />
              <PhotoButton label="Package at door / handoff" done={!!photoPkg} onPress={() => capturePhoto('Package', setPhotoPkg)} />

              {delivery.requiresSignature && (
                <View style={styles.sigSection}>
                  <Text style={styles.fieldLabel}>Recipient signature</Text>
                  {signature ? (
                    <View style={styles.sigDone}>
                      <MaterialCommunityIcons name="check-decagram" size={24} color={colors.success} />
                      <View style={styles.sigDoneText}>
                        <Text style={styles.sigDoneTitle}>Signature saved</Text>
                        <Text style={styles.sigDoneSub}>Recipient has signed for this delivery.</Text>
                      </View>
                      <Pressable
                        onPress={() => { setSignature(undefined); setShowSignatureModal(true); }}
                        style={styles.sigRedoBtn}
                      >
                        <Text style={styles.sigRedoText}>Redo</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable style={styles.sigCaptureBtn} onPress={() => setShowSignatureModal(true)}>
                      <MaterialCommunityIcons name="draw" size={24} color={colors.primaryDark} />
                      <View style={styles.sigCaptureBtnText}>
                        <Text style={styles.sigCaptureBtnTitle}>Capture Signature</Text>
                        <Text style={styles.sigCaptureBtnSub}>Opens full-screen signature pad</Text>
                      </View>
                      <MaterialCommunityIcons name="chevron-right" size={20} color={colors.muted} />
                    </Pressable>
                  )}
                </View>
              )}

              <PrimaryButton
                title="Complete Delivery"
                onPress={completePod}
                loading={podBusy}
                disabled={!canComplete || podBusy}
                style={styles.completeButton}
              />

              {!allPhotosCaptured && (
                <Text style={styles.warn}>Capture all 3 photos to enable completion.</Text>
              )}
              {allPhotosCaptured && delivery.requiresSignature && !signature && (
                <Text style={styles.warn}>Capture recipient signature to enable completion.</Text>
              )}
            </Card>
          ) : copayDecision === 'not_collected' ? (
            <Card style={[styles.mt, styles.podLockedCard]}>
              <MaterialCommunityIcons name="lock" size={32} color={colors.danger} />
              <Text style={styles.podLockedTitle}>Proof of Delivery Locked</Text>
              <Text style={styles.podLockedSub}>
                Collect the ${Number(delivery.copayAmount).toFixed(2)} copay from the patient, then select "Copay Collected" above to unlock proof of delivery.
              </Text>
            </Card>
          ) : null}

          {/* Failed attempt */}
          <Card style={styles.mt}>
            <Text style={styles.sectionTitle}>Failed attempt</Text>
            <Text style={styles.sectionSub}>Use only when delivery could not be completed at this stop.</Text>
            <InputField
              label="Failure reason"
              icon="alert-circle-outline"
              placeholder="recipient_not_home"
              value={failureReason}
              onChangeText={setFailureReason}
              containerStyle={styles.fieldSpacing}
            />
            <PrimaryButton title="Log Failed Attempt" variant="danger" onPress={failedAttempt} loading={attemptBusy} />
          </Card>

        </View>
      </Screen>
    </>
  );
}

// Sub-components

function StatusAction({
  label, icon, active, done, onPress, busy,
}: {
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  active: boolean;
  done: boolean;
  onPress: () => void;
  busy: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy || done}
      style={[styles.statusAction, active && styles.statusActionActive, done && styles.statusActionDone]}
    >
      <MaterialCommunityIcons
        name={done ? 'check-circle' : icon}
        size={20}
        color={done ? colors.success : active ? '#FFFFFF' : colors.primaryDark}
      />
      <Text style={[styles.statusActionText, active && styles.statusActionTextActive, done && styles.statusActionTextDone]}>
        {label}
      </Text>
      {done && (
        <MaterialCommunityIcons name="check" size={16} color={colors.success} />
      )}
    </Pressable>
  );
}

function PhotoButton({ label, done, onPress }: { label: string; done: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.photoBtn, done && styles.photoBtnDone]}>
      <MaterialCommunityIcons name={done ? 'check-decagram' : 'camera-outline'} size={22} color={done ? colors.success : colors.primaryDark} />
      <View style={styles.photoTextWrap}>
        <Text style={[styles.photoBtnLabel, done && styles.photoBtnLabelDone]}>{label}</Text>
        <Text style={styles.photoBtnHint}>{done ? 'Captured' : 'Tap to capture'}</Text>
      </View>
    </Pressable>
  );
}

function MetaPill({
  icon,
  text,
  onPress,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  text: string;
  onPress?: () => void;
}) {
  const content = (
    <>
      <MaterialCommunityIcons name={icon} size={15} color={onPress ? colors.primary : colors.primaryDark} />
      <Text style={[styles.metaText, onPress && styles.metaTextLink]}>{text}</Text>
      {onPress ? <MaterialCommunityIcons name="phone-forward-outline" size={14} color={colors.primary} /> : null}
    </>
  );

  return (
    onPress ? (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.metaPill, styles.metaPillLink, pressed && styles.metaPillPressed]}>
        {content}
      </Pressable>
    ) : (
      <View style={[styles.metaPill, styles.metaPillDisabled]}>
        {content}
      </View>
    )
  );
}

function RequirementRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.requirementRow}>
      <Text style={styles.requirementLabel}>{label}</Text>
      <Text style={styles.requirementValue}>{value}</Text>
    </View>
  );
}

// Styles

const styles = StyleSheet.create({
  pad: { padding: 16, paddingBottom: 60 },
  contentWrap: { width: '100%', alignSelf: 'center' },
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { marginTop: 12, color: colors.muted, fontSize: 15, fontWeight: '700' },
  mt: { marginTop: 12 },

  backRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backText: { color: colors.primaryDark, fontWeight: '700', fontSize: 15 },

  // Hero
  heroCard: { borderRadius: 20, overflow: 'hidden' },
  heroCardCold: { borderWidth: 2, borderColor: '#93C5FD', backgroundColor: '#F0F9FF' },
  coldBannerFull: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#DBEAFE', paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#BFDBFE',
  },
  coldBannerText: { color: '#075985', fontSize: 13, fontWeight: '900', letterSpacing: 0.3 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, padding: 16, paddingBottom: 8 },
  heroTextWrap: { flex: 1 },
  heroEyebrow: { color: colors.primaryDark, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  heroPatient: { marginTop: 6, fontSize: 24, fontWeight: '900', color: colors.navy },
  heroAddress: { marginTop: 4, color: colors.muted, fontSize: 13, lineHeight: 19 },
  heroRight: { alignItems: 'flex-end', gap: 8 },
  copayPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
    backgroundColor: '#FEF9C3', borderWidth: 1, borderColor: '#FCD34D',
  },
  copayPillDone: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  copayPillText: { color: '#92400E', fontSize: 12, fontWeight: '800' },
  copayPillTextDone: { color: colors.success },
  metaWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 16 },
  metaPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.bgSoft },
  metaPillLink: { borderWidth: 1, borderColor: 'rgba(0, 151, 167, 0.25)', backgroundColor: '#E8FAFC' },
  metaPillDisabled: { opacity: 0.95 },
  metaPillPressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  metaText: { color: colors.primaryDark, fontSize: 12, fontWeight: '700' },
  metaTextLink: { color: colors.primary },
  heroActions: { paddingHorizontal: 16, paddingBottom: 16 },
  navigateButton: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    backgroundColor: colors.primaryDark,
  },
  navigateButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },

  sectionTitle: { fontSize: 17, fontWeight: '900', color: colors.navy, marginBottom: 6 },
  sectionSub: { color: colors.muted, fontSize: 13, lineHeight: 19, marginBottom: 14 },
  requirementRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  requirementLabel: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  requirementValue: { marginTop: 3, color: colors.text, fontSize: 14, fontWeight: '700' },

  // Status actions
  buttons: { gap: 8 },
  statusAction: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 14,
    borderRadius: 14, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: '#FFFFFF',
  },
  statusActionActive: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  statusActionDone: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  statusActionText: { flex: 1, color: colors.primaryDark, fontSize: 15, fontWeight: '700' },
  statusActionTextActive: { color: '#FFFFFF' },
  statusActionTextDone: { color: colors.success },

  // Copay gate
  copayHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  copayTitle: { fontSize: 17, fontWeight: '900', color: '#92400E' },
  copayAmount: { fontSize: 22, fontWeight: '900', color: colors.navy, marginBottom: 6 },
  copaySub: { color: colors.muted, fontSize: 13, marginBottom: 16 },
  copayOptions: { gap: 10 },
  copayOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: '#FFFFFF',
  },
  copayOptionSelected: { borderColor: colors.success, backgroundColor: '#F0FDF4' },
  copayOptionWarning: { borderColor: colors.danger, backgroundColor: '#FEF2F2' },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioSelected: { borderColor: colors.success },
  radioWarning: { borderColor: colors.danger },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success },
  radioDotWarning: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.danger },
  copayOptionText: { flex: 1, color: colors.muted, fontSize: 15, fontWeight: '700' },
  copayOptionTextSelected: { color: colors.success },
  copayOptionTextWarning: { color: colors.danger },
  copayConfirmBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 14, padding: 12, borderRadius: 12,
    backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0',
  },
  copayConfirmText: { flex: 1, color: '#15803D', fontSize: 13, fontWeight: '700' },
  copayWarningBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 14, padding: 12, borderRadius: 12,
    backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
  },
  copayWarningText: { flex: 1, color: colors.danger, fontSize: 13, fontWeight: '700' },

  // POD locked
  podLockedCard: { alignItems: 'center', paddingVertical: 28, gap: 10 },
  podLockedTitle: { fontSize: 18, fontWeight: '900', color: colors.danger },
  podLockedSub: { color: colors.muted, fontSize: 14, lineHeight: 20, textAlign: 'center' },

  // POD fields
  fieldSpacing: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '800', color: colors.navy, marginBottom: 10, marginTop: 4 },
  notesInput: { minHeight: 80, textAlignVertical: 'top', paddingTop: 12, paddingBottom: 12 },

  // Photos
  photoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 16, padding: 14, marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  photoBtnDone: { borderColor: colors.success, backgroundColor: '#F0FFF4' },
  photoTextWrap: { flex: 1 },
  photoBtnLabel: { color: colors.text, fontWeight: '700', fontSize: 14 },
  photoBtnLabelDone: { color: colors.success },
  photoBtnHint: { marginTop: 3, color: colors.muted, fontSize: 12 },

  // Signature
  sigSection: { marginTop: 4, marginBottom: 14 },
  sigCaptureBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 18, borderRadius: 16,
    borderWidth: 2, borderColor: colors.primaryDark,
    borderStyle: 'dashed', backgroundColor: colors.bgSoft,
  },
  sigCaptureBtnText: { flex: 1 },
  sigCaptureBtnTitle: { color: colors.primaryDark, fontSize: 16, fontWeight: '900' },
  sigCaptureBtnSub: { color: colors.muted, fontSize: 12, marginTop: 3 },
  sigDone: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderRadius: 16,
    backgroundColor: '#F0FDF4', borderWidth: 1.5, borderColor: '#BBF7D0',
  },
  sigDoneText: { flex: 1 },
  sigDoneTitle: { color: '#15803D', fontSize: 15, fontWeight: '900' },
  sigDoneSub: { color: '#4ADE80', fontSize: 12, marginTop: 2 },
  sigRedoBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: '#FFFFFF' },
  sigRedoText: { color: colors.muted, fontSize: 13, fontWeight: '700' },

  completeButton: { marginTop: 14 },
  warn: { color: colors.warning, fontSize: 12, marginTop: 8, textAlign: 'center', fontWeight: '600' },
});
