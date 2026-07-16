import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Image, Modal, TextInput, Alert, SafeAreaView,
  ActivityIndicator, Dimensions,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { buildingApi } from '../../services/apiClient';
import type { AnchorResult } from '../../services/apiClient';
import { scanStore } from '../../store/scanStore';

const { width: SCREEN_W } = Dimensions.get('window');
const MAP_SIZE = SCREEN_W - 32;

type AddModalState = { visible: false } | { visible: true; tapX: number; tapZ: number };
type QRModalState = { visible: false } | { visible: true; anchor: AnchorResult };

export default function QRManagerScreen() {
  const [anchors, setAnchors] = useState<AnchorResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [addModal, setAddModal] = useState<AddModalState>({ visible: false });
  const [qrModal, setQRModal] = useState<QRModalState>({ visible: false });
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const nameInputRef = useRef<TextInput>(null);

  const scan = scanStore.get();

  const fetchAnchors = useCallback(async () => {
    if (!scan) return;
    setLoading(true);
    try {
      const list = await buildingApi.getAnchors(scan.scanId);
      setAnchors(list);
    } catch {
      /* ignore — will show empty state */
    } finally {
      setLoading(false);
    }
  }, [scan]);

  useEffect(() => { void fetchAnchors(); }, [fetchAnchors]);

  // Convert normalized tap position (0-1) to world pos_x / pos_z
  const handleMapTap = useCallback((evt: { nativeEvent: { locationX: number; locationY: number } }) => {
    if (!scan) return;
    const { locationX, locationY } = evt.nativeEvent;
    const meta = scan.floorPlanMeta;
    // Convert pixel → meters using floor plan metadata
    const pos_x = meta.originX + (locationX / MAP_SIZE) * (MAP_SIZE * meta.scaleMetersPerPixel);
    const pos_z = meta.originZ + (1 - locationY / MAP_SIZE) * (MAP_SIZE * meta.scaleMetersPerPixel);
    setAddModal({ visible: true, tapX: pos_x, tapZ: pos_z });
    setNewName('');
    setTimeout(() => nameInputRef.current?.focus(), 150);
  }, [scan]);

  const handleAddAnchor = useCallback(async () => {
    if (!scan || !addModal.visible || !newName.trim()) return;
    setSaving(true);
    try {
      const anchor = await buildingApi.createAnchor(
        scan.scanId,
        newName.trim(),
        addModal.tapX,
        addModal.tapZ,
        false,
      );
      setAnchors(prev => [...prev, anchor]);
      setAddModal({ visible: false });
    } catch (e) {
      Alert.alert('Gagal', e instanceof Error ? e.message : 'Coba lagi.');
    } finally {
      setSaving(false);
    }
  }, [scan, addModal, newName]);

  const handleToggleExit = useCallback(async (anchor: AnchorResult) => {
    if (!scan) return;
    const updated: AnchorResult = { ...anchor, isExit: !anchor.isExit };
    // Optimistic update
    setAnchors(prev => prev.map(a => a.id === anchor.id ? updated : a));
    try {
      await buildingApi.deleteAnchor(scan.scanId, anchor.id);
      const recreated = await buildingApi.createAnchor(
        scan.scanId, anchor.name, anchor.posX, anchor.posZ, updated.isExit,
      );
      setAnchors(prev => prev.map(a => a.id === anchor.id ? recreated : a));
    } catch {
      // Revert on failure
      setAnchors(prev => prev.map(a => a.id === anchor.id ? anchor : a));
    }
  }, [scan]);

  const handleDeleteAnchor = useCallback((anchor: AnchorResult) => {
    if (!scan) return;
    Alert.alert('Hapus Titik', `Hapus "${anchor.name}"?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          setAnchors(prev => prev.filter(a => a.id !== anchor.id));
          await buildingApi.deleteAnchor(scan.scanId, anchor.id).catch(() => {
            void fetchAnchors(); // Re-sync on failure
          });
        },
      },
    ]);
  }, [scan, fetchAnchors]);

  // Convert pos_x / pos_z back to pixel position on the displayed map
  function anchorToPixel(anchor: AnchorResult): { x: number; y: number } {
    const meta = scan?.floorPlanMeta;
    if (!meta) return { x: 0, y: 0 };
    const pxPerMeter = MAP_SIZE / (MAP_SIZE * meta.scaleMetersPerPixel);
    const x = (anchor.posX - meta.originX) * pxPerMeter;
    const y = (1 - (anchor.posZ - meta.originZ) / (MAP_SIZE * meta.scaleMetersPerPixel)) * MAP_SIZE;
    return { x: Math.max(0, Math.min(MAP_SIZE, x)), y: Math.max(0, Math.min(MAP_SIZE, y)) };
  }

  if (!scan) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📍</Text>
          <Text style={styles.emptyTitle}>Belum ada pemindaian</Text>
          <Text style={styles.emptyBody}>
            Pindai ruangan terlebih dahulu dari tab "Scan", lalu kembali ke sini untuk menambahkan titik QR.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Floor plan with tap-to-place */}
        <Text style={styles.sectionTitle}>Ketuk denah untuk menambah titik QR</Text>
        <View style={styles.mapWrapper}>
          <TouchableOpacity activeOpacity={0.9} onPress={handleMapTap}>
            <Image
              source={{ uri: scan.floorPlanUrl }}
              style={styles.mapImage}
              resizeMode="contain"
            />
            {/* Anchor dots overlaid on floor plan */}
            {anchors.map(anchor => {
              const { x, y } = anchorToPixel(anchor);
              return (
                <TouchableOpacity
                  key={anchor.id}
                  style={[styles.dot, { left: x - 10, top: y - 10 }, anchor.isExit && styles.dotExit]}
                  onPress={() => setQRModal({ visible: true, anchor })}
                >
                  <Text style={styles.dotLabel}>{anchor.isExit ? '🚪' : '📍'}</Text>
                </TouchableOpacity>
              );
            })}
          </TouchableOpacity>
        </View>

        {/* Anchor list */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Titik QR ({anchors.length})</Text>
            {loading && <ActivityIndicator size="small" color="#39FF14" />}
          </View>

          {anchors.length === 0 && !loading && (
            <Text style={styles.emptyList}>Belum ada titik. Ketuk denah di atas untuk menambahkan.</Text>
          )}

          {anchors.map(anchor => (
            <View key={anchor.id} style={styles.anchorRow}>
              <TouchableOpacity
                style={styles.anchorInfo}
                onPress={() => setQRModal({ visible: true, anchor })}
              >
                <Text style={styles.anchorName}>{anchor.isExit ? '🚪 ' : '📍 '}{anchor.name}</Text>
                <Text style={styles.anchorId}>{anchor.id.slice(0, 8)}…</Text>
              </TouchableOpacity>
              <View style={styles.anchorActions}>
                <TouchableOpacity
                  style={[styles.exitBtn, anchor.isExit && styles.exitBtnActive]}
                  onPress={() => void handleToggleExit(anchor)}
                >
                  <Text style={[styles.exitBtnText, anchor.isExit && styles.exitBtnTextActive]}>
                    {anchor.isExit ? 'Pintu Keluar ✓' : 'Jadikan Keluar'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteAnchor(anchor)}>
                  <Text style={styles.deleteBtn}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Add anchor modal */}
      <Modal visible={addModal.visible} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nama Titik QR</Text>
            <TextInput
              ref={nameInputRef}
              style={styles.input}
              placeholder="cth: Pintu Utama, Tangga B3"
              placeholderTextColor="rgba(255,255,255,0.35)"
              value={newName}
              onChangeText={setNewName}
              onSubmitEditing={() => void handleAddAnchor()}
              returnKeyType="done"
            />
            <View style={styles.modalRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setAddModal({ visible: false })}
              >
                <Text style={styles.cancelBtnText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addBtn, (!newName.trim() || saving) && styles.addBtnDisabled]}
                onPress={() => void handleAddAnchor()}
                disabled={!newName.trim() || saving}
              >
                {saving
                  ? <ActivityIndicator size="small" color="#000" />
                  : <Text style={styles.addBtnText}>Tambah</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* QR code display modal */}
      {qrModal.visible && (
        <Modal visible transparent animationType="fade">
          <View style={styles.modalBg}>
            <View style={styles.qrCard}>
              <Text style={styles.qrTitle}>{qrModal.anchor.name}</Text>
              {qrModal.anchor.isExit && (
                <View style={styles.exitBadge}>
                  <Text style={styles.exitBadgeText}>PINTU KELUAR</Text>
                </View>
              )}
              <View style={styles.qrBox}>
                <QRCode
                  value={`anchor:${qrModal.anchor.id}`}
                  size={220}
                  backgroundColor="#fff"
                  color="#000"
                />
              </View>
              <Text style={styles.qrHint}>Tempel QR ini di lokasi fisik agar tamu dapat memindainya.</Text>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setQRModal({ visible: false })}
              >
                <Text style={styles.closeBtnText}>Tutup</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A1A0E' },
  scroll: { padding: 16, gap: 16 },
  mapWrapper: {
    width: MAP_SIZE,
    height: MAP_SIZE,
    alignSelf: 'center',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1A2A1A',
    position: 'relative',
  },
  mapImage: { width: MAP_SIZE, height: MAP_SIZE },
  dot: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(57,255,20,0.3)',
    borderWidth: 2,
    borderColor: '#39FF14',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotExit: { borderColor: '#00E5FF', backgroundColor: 'rgba(0,229,255,0.3)' },
  dotLabel: { fontSize: 10 },
  section: { gap: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  emptyList: { color: 'rgba(255,255,255,0.45)', fontSize: 14, textAlign: 'center', paddingVertical: 16 },
  anchorRow: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  anchorInfo: { flex: 1 },
  anchorName: { color: '#fff', fontSize: 15, fontWeight: '600' },
  anchorId: { color: 'rgba(255,255,255,0.35)', fontSize: 11, fontFamily: 'monospace' },
  anchorActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  exitBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  exitBtnActive: { borderColor: '#00E5FF', backgroundColor: 'rgba(0,229,255,0.15)' },
  exitBtnText: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  exitBtnTextActive: { color: '#00E5FF', fontWeight: '700' },
  deleteBtn: { color: '#FF4444', fontSize: 18, paddingHorizontal: 6 },

  // Add modal
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#1A2A1A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    gap: 16,
  },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 14,
    color: '#fff',
    fontSize: 16,
  },
  modalRow: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  cancelBtnText: { color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  addBtn: {
    flex: 2,
    backgroundColor: '#39FF14',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  addBtnDisabled: { backgroundColor: 'rgba(57,255,20,0.3)' },
  addBtnText: { color: '#000', fontWeight: '700', fontSize: 16 },

  // QR modal
  qrCard: {
    backgroundColor: '#1A2A1A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 14,
  },
  qrTitle: { color: '#fff', fontSize: 20, fontWeight: '700', textAlign: 'center' },
  exitBadge: {
    backgroundColor: 'rgba(0,229,255,0.15)',
    borderWidth: 1,
    borderColor: '#00E5FF',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  exitBadgeText: { color: '#00E5FF', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  qrBox: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginVertical: 4,
  },
  qrHint: { color: 'rgba(255,255,255,0.55)', fontSize: 13, textAlign: 'center' },
  closeBtn: {
    backgroundColor: '#39FF14',
    borderRadius: 10,
    paddingHorizontal: 40,
    paddingVertical: 13,
  },
  closeBtnText: { color: '#000', fontWeight: '700', fontSize: 16 },

  // Empty state
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 16 },
  emptyIcon: { fontSize: 64 },
  emptyTitle: { color: '#fff', fontSize: 22, fontWeight: '700', textAlign: 'center' },
  emptyBody: { color: 'rgba(255,255,255,0.6)', fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
