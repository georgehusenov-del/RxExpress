import React, { useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Modal,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import SignatureScreen, { SignatureViewRef } from 'react-native-signature-canvas';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';

interface Props {
  visible: boolean;
  recipientName?: string;
  onSave: (signature: string) => void;
  onCancel: () => void;
}

const { height } = Dimensions.get('window');

// Minimum base64 data length that indicates a real signature vs a blank/dot
const MIN_SIG_LENGTH = 2000;

const CANVAS_WEB_STYLE = `
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  body, html {
    margin: 0; padding: 0;
    background: #FFFFFF;
    height: 100%; width: 100%;
    overflow: hidden;
    user-select: none; -webkit-user-select: none;
  }
  .m-signature-pad {
    box-shadow: none; border: none; margin: 0;
    width: 100%; height: 100%;
    background: #FFFFFF;
    position: relative;
  }
  .m-signature-pad--body {
    border: none;
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
  }
  .m-signature-pad--body canvas {
    width: 100% !important;
    height: 100% !important;
    touch-action: none;
    cursor: crosshair;
  }
  .m-signature-pad--footer { display: none !important; }
`;

export function SignatureModal({ visible, recipientName, onSave, onCancel }: Props) {
  const sigRef = useRef<SignatureViewRef>(null);
  const [hasDrawn, setHasDrawn] = useState(false);

  function handleBegin() {
    setHasDrawn(true);
  }

  function handleSave() {
    if (!hasDrawn) {
      Alert.alert('Signature required', 'Please provide a valid recipient signature before saving.');
      return;
    }
    sigRef.current?.readSignature();
  }

  function handleClear() {
    sigRef.current?.clearSignature();
    setHasDrawn(false);
  }

  function handleOK(data: string) {
    // Validate signature is not just a dot or tiny mark
    if (!data || data.length < MIN_SIG_LENGTH) {
      Alert.alert(
        'Invalid signature',
        'Please provide a valid recipient signature. Draw a complete signature.',
      );
      sigRef.current?.clearSignature();
      setHasDrawn(false);
      return;
    }
    onSave(data);
    setHasDrawn(false);
  }

  function handleCancel() {
    sigRef.current?.clearSignature();
    setHasDrawn(false);
    onCancel();
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={styles.root}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleCancel} style={styles.cancelBtn} hitSlop={16}>
            <MaterialCommunityIcons name="close" size={22} color={colors.navy} />
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>

          <View style={styles.headerCenter}>
            <MaterialCommunityIcons name="draw" size={20} color={colors.primaryDark} />
            <Text style={styles.headerTitle}>Recipient Signature</Text>
          </View>

          <Pressable
            onPress={handleSave}
            style={[styles.saveHeaderBtn, hasDrawn && styles.saveHeaderBtnActive]}
            hitSlop={16}
          >
            <Text style={[styles.saveHeaderText, hasDrawn && styles.saveHeaderTextActive]}>
              Save
            </Text>
          </Pressable>
        </View>

        {/* Recipient label */}
        {recipientName ? (
          <View style={styles.recipientBanner}>
            <MaterialCommunityIcons name="account-outline" size={16} color={colors.primaryDark} />
            <Text style={styles.recipientText}>
              Signing for: <Text style={styles.recipientName}>{recipientName}</Text>
            </Text>
          </View>
        ) : null}

        {/* Instruction */}
        <View style={styles.instructionRow}>
          <MaterialCommunityIcons name="gesture-tap" size={16} color={colors.muted} />
          <Text style={styles.instructionText}>
            Ask the recipient to sign in the box below using their finger or stylus
          </Text>
        </View>

        {/* Canvas */}
        <View style={styles.canvasContainer}>
          <View style={styles.canvasFrame}>
            <SignatureScreen
              ref={sigRef}
              onOK={handleOK}
              onBegin={handleBegin}
              onEmpty={() => {}}
              descriptionText=""
              clearText=""
              confirmText=""
              webStyle={CANVAS_WEB_STYLE}
              scrollable={false}
            />
            {/* Sign here watermark */}
            {!hasDrawn && (
              <View style={styles.watermarkWrap} pointerEvents="none">
                <MaterialCommunityIcons name="fountain-pen-tip" size={32} color="rgba(0,76,85,0.12)" />
                <Text style={styles.watermarkText}>Sign here</Text>
              </View>
            )}
          </View>

          {/* Baseline */}
          <View style={styles.baseline} />
          <Text style={styles.baselineLabel}>Signature line</Text>
        </View>

        {/* Bottom controls */}
        <View style={styles.controls}>
          <Pressable style={styles.clearBtn} onPress={handleClear}>
            <MaterialCommunityIcons name="eraser-variant" size={20} color={colors.danger} />
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>

          <Pressable
            style={[styles.saveBtn, !hasDrawn && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!hasDrawn}
          >
            <MaterialCommunityIcons name="check-bold" size={20} color="#FFFFFF" />
            <Text style={styles.saveText}>Save Signature</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: '#FFFFFF',
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: 80,
  },
  cancelText: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '700',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    color: colors.navy,
    fontSize: 17,
    fontWeight: '900',
  },
  saveHeaderBtn: {
    width: 80,
    alignItems: 'flex-end',
  },
  saveHeaderBtnActive: {},
  saveHeaderText: {
    color: colors.disabled,
    fontSize: 15,
    fontWeight: '700',
  },
  saveHeaderTextActive: {
    color: colors.primary,
  },

  // Recipient
  recipientBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.bgSoft,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  recipientText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  recipientName: {
    color: colors.navy,
    fontWeight: '800',
  },

  // Instruction
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  instructionText: {
    flex: 1,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },

  // Canvas
  canvasContainer: {
    flex: 1,
    marginHorizontal: 12,
    marginBottom: 4,
  },
  canvasFrame: {
    flex: 1,
    borderWidth: 2,
    borderColor: colors.primaryDark,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  watermarkWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  watermarkText: {
    color: 'rgba(0,76,85,0.12)',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 2,
  },
  baseline: {
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: 16,
    marginTop: 6,
  },
  baselineLabel: {
    textAlign: 'center',
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 4,
  },

  // Controls
  controls: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: '#FFFFFF',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  clearText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '800',
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: colors.primaryDark,
  },
  saveBtnDisabled: {
    backgroundColor: colors.disabled,
  },
  saveText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
});
