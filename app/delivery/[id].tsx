import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SignatureScreen, { SignatureViewRef } from 'react-native-signature-canvas';
import { Card } from '@/components/Card';
import { InputField } from '@/components/InputField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { SectionTitle } from '@/components/SectionTitle';
import { StatusBadge } from '@/components/StatusBadge';
import { rxexApi } from '@/api/rxexApi';
import type { Delivery } from '@/types/api';
import { colors } from '@/theme/colors';
import { captureBase64Photo } from '@/utils/image';
import { getCurrentCoordinates } from '@/utils/location';

export default function DeliveryDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const deliveryId = Number(id);
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [podBusy, setPodBusy] = useState(false);
  const [attemptBusy, setAttemptBusy] = useState(false);
  const [notes, setNotes] = useState('');
  const [recipient, setRecipient] = useState('');
  const [failureReason, setFailureReason] = useState('recipient_not_home');
  const [signature, setSignature] = useState<string | undefined>();
  const [photoHome, setPhotoHome] = useState<string | undefined>();
  const [photoAddr, setPhotoAddr] = useState<string | undefined>();
  const [photoPkg, setPhotoPkg] = useState<string | undefined>();
  const sigRef = useRef<SignatureViewRef>(null);
  const podRunning = useRef(false);
  const attemptRunning = useRef(false);
  const lastPodStart = useRef(0);
  const lastAttemptStart = useRef(0);

  async function load() {
    const r = await rxexApi.deliveries();
    setDelivery(r.deliveries.find(d => d.id === deliveryId) || null);
  }
  useEffect(() => { load().catch((e: any) => Alert.alert('Load failed', e.message)); }, [deliveryId]);

  const address = useMemo(() =>
    delivery ? `${delivery.street}${delivery.aptUnit ? ', ' + delivery.aptUnit : ''}, ${delivery.city}, ${delivery.state} ${delivery.postalCode}` : '',
    [delivery]
  );

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
      Alert.alert('Updated', `Status set to ${status}`);
    } catch (e: any) {
      Alert.alert('Status failed', e.message);
    } finally {
      setPodBusy(false);
    }
  }

  async function completeWithoutPodFallback() {
    const fallbackStatuses = ['delivered', 'completed'];

    for (const status of fallbackStatuses) {
      try {
        await rxexApi.updateDeliveryStatus(deliveryId, status);
        Alert.alert('Completed', `Delivery was marked as ${status} without POD upload.`);
        router.replace('/deliveries');
        return;
      } catch (error) {
        console.log(`[POD] fallback status ${status} failed`, error);
      }
    }

    Alert.alert('Fallback failed', 'The backend rejected both POD upload and delivery completion fallback.');
  }

  async function completePod() {
    const now = Date.now();
    if (podRunning.current || now - lastPodStart.current < 2500) return;
    if (!photoHome || !photoAddr || !photoPkg) {
      Alert.alert('Photos required', 'Please capture all 3 photos before completing the delivery.');
      return;
    }
    if (delivery?.requiresSignature && !signature) {
      Alert.alert('Signature required', 'Please draw a signature and tap "Save Signature" before completing.');
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
          'Photo upload is failing on the backend. Do you want to try marking this delivery complete without POD photos?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Mark Complete',
              onPress: () => {
                completeWithoutPodFallback().catch((fallbackError: any) => {
                  Alert.alert('Fallback failed', fallbackError.message || 'Unable to mark delivery complete.');
                });
              },
            },
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

  async function collectCopay() {
    try {
      setPodBusy(true);
      const r = await rxexApi.collectCopay(deliveryId);
      Alert.alert('Copay', r.message);
      await load();
    } catch (e: any) {
      Alert.alert('Copay failed', e.message);
    } finally {
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
      console.log(`[LogAttempt] deliveryId=${deliveryId}, reason=${failureReason}`);
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

  if (!delivery) {
    return (
      <Screen contentContainerStyle={styles.center}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.notFoundTitle}>Loading delivery...</Text>
        <Text style={styles.notFoundSubtitle}>If this stop is no longer active, it may already be closed.</Text>
      </Screen>
    );
  }

  const allPhotosCaptured = !!photoHome && !!photoAddr && !!photoPkg;
  const canComplete = allPhotosCaptured && (!delivery.requiresSignature || !!signature);

  return (
    <Screen scroll keyboard contentContainerStyle={styles.pad}>
      <SectionTitle title={`Delivery ${delivery.orderNumber}`} subtitle={`Time window: ${delivery.timeWindow}`} />

      <Card style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.heroTextWrap}>
            <Text style={styles.heroEyebrow}>Current stop</Text>
            <Text style={styles.order}>{delivery.recipientName}</Text>
            <Text style={styles.addressText}>{address}</Text>
          </View>
          <StatusBadge status={delivery.status} />
        </View>

        <View style={styles.metaWrap}>
          <MetaPill icon="storefront-outline" text={delivery.pharmacyName} />
          <MetaPill icon="phone-outline" text={delivery.recipientPhone} />
          <MetaPill icon="clock-outline" text={delivery.timeWindow} />
          <MetaPill icon="cash-multiple" text={`$${Number(delivery.copayAmount || 0).toFixed(2)} ${delivery.copayCollected ? 'collected' : 'due'}`} />
        </View>
      </Card>

      <Card style={styles.mt}>
        <Text style={styles.title}>Delivery requirements</Text>
        <RequirementRow label="Delivery type" value={delivery.deliveryType} />
        <RequirementRow label="Signature" value={delivery.requiresSignature ? 'Required' : 'Not required'} />
        <RequirementRow label="Refrigerated" value={delivery.isRefrigerated ? 'Cold-chain handling required' : 'Standard handling'} />
        <RequirementRow label="Instructions" value={delivery.deliveryInstructions || 'No special instructions'} />
      </Card>

      <Card style={styles.mt}>
        <Text style={styles.title}>Progress actions</Text>
        <View style={styles.buttons}>
          <PrimaryButton title="Mark Picked Up" onPress={() => setStatus('picked_up')} loading={podBusy} />
          <PrimaryButton title="Out for Delivery" variant="secondary" onPress={() => setStatus('out_for_delivery')} loading={podBusy} />
          <PrimaryButton title="Arrived / Delivering Now" variant="outline" onPress={() => setStatus('delivering_now')} loading={podBusy} />
        </View>
      </Card>

      <Card style={styles.mt}>
        <Text style={styles.title}>Proof of delivery</Text>
        <Text style={styles.sectionSubtext}>Capture the required evidence before final completion. The backend upload fallback remains intact if photo storage fails server-side.</Text>

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

        <Text style={styles.sectionLabel}>Required photos</Text>
        <PhotoButton label="Home / building exterior" done={!!photoHome} onPress={() => capturePhoto('Home/building', setPhotoHome)} />
        <PhotoButton label="Address plaque / number" done={!!photoAddr} onPress={() => capturePhoto('Address', setPhotoAddr)} />
        <PhotoButton label="Package at door / handoff" done={!!photoPkg} onPress={() => capturePhoto('Package', setPhotoPkg)} />

        {delivery.requiresSignature && (
          <View style={styles.sigSection}>
            <View style={styles.signatureHeader}>
              <Text style={styles.sectionLabel}>Recipient signature</Text>
              {signature ? <Text style={styles.signatureSaved}>Saved</Text> : null}
            </View>
            <View style={styles.sigBox}>
              <SignatureScreen
                ref={sigRef}
                onOK={(data: string) => {
                  setSignature(data);
                  Alert.alert('Saved', 'Signature has been saved.');
                }}
                onEmpty={() => Alert.alert('Empty', 'Please draw the signature before saving.')}
                descriptionText=""
                clearText="Clear"
                confirmText="Save Signature"
                webStyle={`
                  body, html { margin:0; padding:0; background:#fff; }
                  .m-signature-pad {
                    box-shadow: none; border: none; margin: 0;
                    width: 100%; height: 100%;
                  }
                  .m-signature-pad--body {
                    border: none; position: absolute; top: 0; left: 0; right: 0; bottom: 56px;
                  }
                  canvas { width: 100% !important; height: 100% !important; }
                  .m-signature-pad--footer {
                    position: absolute; bottom: 0; left: 0; right: 0; height: 56px;
                    display: flex; flex-direction: row; align-items: center;
                    justify-content: space-between; padding: 0 12px;
                    background: #f0f4f8; border-top: 1px solid #d0dce8;
                  }
                  .m-signature-pad--footer .button {
                    padding: 10px 20px; border-radius: 8px; border: none;
                    font-size: 14px; font-weight: 700; cursor: pointer;
                  }
                  .m-signature-pad--footer .button.clear {
                    background: #e74c3c; color: #fff;
                  }
                  .m-signature-pad--footer .button:not(.clear) {
                    background: #0097A7; color: #fff;
                  }
                `}
              />
            </View>
            {signature ? (
              <Pressable onPress={() => { setSignature(undefined); sigRef.current?.clearSignature(); }}>
                <Text style={styles.clearSigText}>Clear and redo signature</Text>
              </Pressable>
            ) : null}
          </View>
        )}

        <PrimaryButton title="Complete Delivery" onPress={completePod} loading={podBusy} disabled={!canComplete || podBusy} style={styles.completeButton} />
        {!allPhotosCaptured ? <Text style={styles.warn}>Capture all 3 photos to enable completion.</Text> : null}
        {allPhotosCaptured && delivery.requiresSignature && !signature ? <Text style={styles.warn}>Save signature to enable completion.</Text> : null}
      </Card>

      {delivery.copayAmount > 0 && !delivery.copayCollected ? (
        <Card style={styles.mt}>
          <Text style={styles.title}>Copay collection</Text>
          <Text style={styles.sectionSubtext}>Mark copay collected only after the payment is confirmed.</Text>
          <PrimaryButton title="Mark Copay Collected" variant="secondary" onPress={collectCopay} loading={podBusy} />
        </Card>
      ) : null}

      <Card style={styles.mt}>
        <Text style={styles.title}>Failed attempt</Text>
        <Text style={styles.sectionSubtext}>Use this only when the delivery could not be completed at the stop.</Text>
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
    </Screen>
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

function MetaPill({ icon, text }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; text: string }) {
  return (
    <View style={styles.metaPill}>
      <MaterialCommunityIcons name={icon} size={16} color={colors.primaryDark} />
      <Text style={styles.metaText}>{text}</Text>
    </View>
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

const styles = StyleSheet.create({
  pad: { padding: 16, paddingBottom: 56 },
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  notFoundTitle: { marginTop: 14, color: colors.navy, fontSize: 18, fontWeight: '900' },
  notFoundSubtitle: { marginTop: 8, color: colors.muted, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  heroCard: { backgroundColor: '#FFFFFF', borderRadius: 26 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  heroTextWrap: { flex: 1 },
  heroEyebrow: { color: colors.primaryDark, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  mt: { marginTop: 12 },
  order: { marginTop: 8, fontSize: 28, lineHeight: 34, fontWeight: '900', color: colors.navy },
  addressText: { marginTop: 8, color: colors.muted, fontSize: 14, lineHeight: 21 },
  metaWrap: { marginTop: 18, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metaPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999, backgroundColor: colors.bgSoft },
  metaText: { color: colors.primaryDark, fontSize: 12, fontWeight: '700' },
  title: { fontSize: 18, fontWeight: '900', color: colors.navy, marginBottom: 8 },
  requirementRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  requirementLabel: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  requirementValue: { marginTop: 4, color: colors.text, fontSize: 15, lineHeight: 21, fontWeight: '700' },
  buttons: { gap: 10, marginTop: 14 },
  sectionSubtext: { marginBottom: 16, color: colors.muted, fontSize: 14, lineHeight: 21 },
  fieldSpacing: { marginBottom: 14 },
  notesInput: { minHeight: 84, textAlignVertical: 'top', paddingTop: 16, paddingBottom: 16 },
  sectionLabel: { fontSize: 13, fontWeight: '800', color: colors.navy, marginBottom: 8, marginTop: 4 },
  photoBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: colors.border, borderRadius: 18, padding: 14, marginBottom: 10, backgroundColor: '#fff', gap: 12 },
  photoBtnDone: { borderColor: colors.success, backgroundColor: '#F0FFF4' },
  photoTextWrap: { flex: 1 },
  photoBtnLabel: { color: colors.text, fontWeight: '700', fontSize: 14 },
  photoBtnHint: { marginTop: 4, color: colors.muted, fontSize: 12, fontWeight: '600' },
  photoBtnLabelDone: { color: colors.success, fontWeight: '700' },
  sigSection: { marginTop: 8 },
  signatureHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  signatureSaved: { color: colors.success, fontSize: 13, fontWeight: '800' },
  sigBox: { height: 300, borderWidth: 1.5, borderColor: colors.border, borderRadius: 18, overflow: 'hidden', marginBottom: 8, backgroundColor: '#fff' },
  clearSigText: { color: colors.danger, fontWeight: '700', fontSize: 13 },
  completeButton: { marginTop: 14 },
  warn: { color: colors.warning, fontSize: 12, marginTop: 6, textAlign: 'center' },
});

