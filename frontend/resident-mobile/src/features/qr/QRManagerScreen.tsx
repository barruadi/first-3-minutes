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
import ScanSelectorScreen from './ScanSelectorScreen';
import { displayPointToWorld, worldToDisplayPoint } from './floorPlanCoordinates';

const { width: SCREEN_W } = Dimensions.get('window');
const MAP_SIZE = SCREEN_W - 32;

const NAVY = '#0A2947';
const CREAM = '#F3E4C9';
const EARTH = '#8B5E3C';
const TEXT_SEC = '#475665';
const BORDER = 'rgba(10, 41, 71, 0.22)';
const WHITE = '#FFFFFF';
const RED = '#D93025';

type AddModalState = { visible: false } | { visible: true; tapX: number; tapZ: number };
type QRModalState = { visible: false } | { visible: true; anchor: AnchorResult };

export default function QRManagerScreen() {
  const [anchors, setAnchors] = useState<AnchorResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [addModal, setAddModal] = useState<AddModalState>({ visible: false });
  const [qrModal, setQRModal] = useState<QRModalState>({ visible: false });
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [showSelector, setShowSelector] = useState(false);
  const nameInputRef = useRef<TextInput>(null);

  const scan = scanStore.get();

  const fetchAnchors = useCallback(async () => {
    if (!scan) return;
    setLoading(true);
    try {
      const list = await buildingApi.getAnchors(scan.scanId);
      setAnchors(list);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [scan]);

  useEffect(() => { void fetchAnchors(); }, [fetchAnchors]);

  const handleMapTap = useCallback((evt: { nativeEvent: { locationX: number; locationY: number } }) => {
    if (!scan) return;
    const { locationX, locationY } = evt.nativeEvent;
    const world = displayPointToWorld(
      { x: locationX, y: locationY },
      MAP_SIZE,
      scan.floorPlanMeta,
    );
    setAddModal({ visible: true, tapX: world.posX, tapZ: world.posZ });
    setNewName('');
    setTimeout(() => nameInputRef.current?.focus(), 150);
  }, [scan]);

  const handleAddAnchor = useCallback(async () => {
    if (!scan || !addModal.visible || !newName.trim()) return;
    setSaving(true);
    try {
      const anchor = await buildingApi.createAnchor(scan.scanId, newName.trim(), addModal.tapX, addModal.tapZ, false);
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
    // Optimistic update
    setAnchors(prev => prev.map(a => a.id === anchor.id ? { ...a, isExit: !a.isExit } : a));
    try {
      const result = await buildingApi.updateAnchor(scan.scanId, anchor.id, !anchor.isExit);
      setAnchors(prev => prev.map(a => a.id === anchor.id ? result : a));
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
        text: 'Hapus', style: 'destructive',
        onPress: async () => {
          setAnchors(prev => prev.filter(a => a.id !== anchor.id));
          await buildingApi.deleteAnchor(scan.scanId, anchor.id).catch(() => { void fetchAnchors(); });
        },
      },
    ]);
  }, [scan, fetchAnchors]);

  function anchorToPixel(anchor: AnchorResult): { x: number; y: number } {
    const meta = scan?.floorPlanMeta;
    if (!meta) return { x: 0, y: 0 };
    return worldToDisplayPoint(anchor, MAP_SIZE, meta);
  }

  if (!scan) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Text style={styles.emptyIconText}>QR</Text>
          </View>
          <Text style={styles.emptyTitle}>Belum ada pemindaian</Text>
          <Text style={styles.emptyBody}>
            Pindai ruangan terlebih dahulu dari tab "Scan", lalu kembali ke sini untuk menambahkan titik QR.
          </Text>
          <TouchableOpacity style={styles.loadBtn} onPress={() => setShowSelector(true)}>
            <Text style={styles.loadBtnText}>Muat Pemindaian Tersimpan</Text>
          </TouchableOpacity>
        </View>
        <Modal visible={showSelector} animationType="slide">
          <ScanSelectorScreen onClose={() => { setShowSelector(false); void fetchAnchors(); }} />
        </Modal>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity onPress={() => setShowSelector(true)}>
          <Text style={styles.switchBtn}>Ganti pemindaian</Text>
        </TouchableOpacity>
        {/* Floor plan */}
        <Text style={styles.sectionLabel}>Ketuk denah untuk menambah titik QR</Text>
        <View style={styles.mapWrapper}>
          <TouchableOpacity activeOpacity={0.9} onPress={handleMapTap}>
            <Image source={{ uri: scan.floorPlanUrl }} style={styles.mapImage} resizeMode="contain" />
            {anchors.map(anchor => {
              const { x, y } = anchorToPixel(anchor);
              return (
                <TouchableOpacity
                  key={anchor.id}
                  style={[styles.dot, { left: x - 10, top: y - 10 }, anchor.isExit && styles.dotExit]}
                  onPress={() => setQRModal({ visible: true, anchor })}
                >
                  <Text style={styles.dotLabel}>{anchor.isExit ? 'K' : '+'}</Text>
                </TouchableOpacity>
              );
            })}
          </TouchableOpacity>
        </View>

        {/* Anchor list */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Titik QR ({anchors.length})</Text>
            {loading && <ActivityIndicator size="small" color={NAVY} />}
          </View>

          {anchors.length === 0 && !loading && (
            <Text style={styles.emptyList}>Belum ada titik. Ketuk denah di atas untuk menambahkan.</Text>
          )}

          {anchors.map(anchor => (
            <View key={anchor.id} style={styles.anchorRow}>
              <TouchableOpacity style={styles.anchorInfo} onPress={() => setQRModal({ visible: true, anchor })}>
                <Text style={styles.anchorName}>
                  {anchor.isExit ? '[Keluar] ' : ''}{anchor.name}
                </Text>
                <Text style={styles.anchorId}>{anchor.id.slice(0, 8)}...</Text>
              </TouchableOpacity>
              <View style={styles.anchorActions}>
                <TouchableOpacity
                  style={[styles.exitBtn, anchor.isExit && styles.exitBtnActive]}
                  onPress={() => void handleToggleExit(anchor)}
                >
                  <Text style={[styles.exitBtnText, anchor.isExit && styles.exitBtnTextActive]}>
                    {anchor.isExit ? 'Pintu Keluar' : 'Set Keluar'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteAnchor(anchor)}>
                  <Text style={styles.deleteBtn}>X</Text>
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
              placeholderTextColor="rgba(10, 41, 71, 0.35)"
              value={newName}
              onChangeText={setNewName}
              onSubmitEditing={() => void handleAddAnchor()}
              returnKeyType="done"
            />
            <View style={styles.modalRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setAddModal({ visible: false })}>
                <Text style={styles.cancelBtnText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addBtn, (!newName.trim() || saving) && styles.addBtnDisabled]}
                onPress={() => void handleAddAnchor()}
                disabled={!newName.trim() || saving}
              >
                {saving
                  ? <ActivityIndicator size="small" color={WHITE} />
                  : <Text style={styles.addBtnText}>Tambah</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* QR display modal */}
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
                <QRCode value={`anchor:${qrModal.anchor.id}`} size={220} backgroundColor={WHITE} color={NAVY} />
              </View>
              <Text style={styles.qrHint}>Tempel QR ini di lokasi fisik agar tamu dapat memindainya.</Text>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setQRModal({ visible: false })}>
                <Text style={styles.closeBtnText}>Tutup</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Scan selector modal */}
      <Modal visible={showSelector} animationType="slide">
        <ScanSelectorScreen onClose={() => { setShowSelector(false); void fetchAnchors(); }} />
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CREAM },
  scroll: { padding: 16, gap: 16 },

  // Floor plan map
  mapWrapper: {
    width: MAP_SIZE,
    height: MAP_SIZE,
    alignSelf: 'center',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    position: 'relative',
  },
  mapImage: { width: MAP_SIZE, height: MAP_SIZE },
  dot: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(10, 41, 71, 0.25)',
    borderWidth: 2,
    borderColor: NAVY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotExit: {
    borderColor: EARTH,
    backgroundColor: 'rgba(139, 94, 60, 0.25)',
  },
  dotLabel: { fontSize: 9, fontWeight: '700', color: NAVY },

  // Section labels
  sectionLabel: { color: TEXT_SEC, fontSize: 13, fontWeight: '600' },
  section: { gap: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionTitle: { color: NAVY, fontSize: 15, fontWeight: '700' },
  emptyList: { color: TEXT_SEC, fontSize: 14, textAlign: 'center', paddingVertical: 16 },

  // Anchor rows
  anchorRow: {
    backgroundColor: WHITE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
    gap: 8,
  },
  anchorInfo: { flex: 1 },
  anchorName: { color: NAVY, fontSize: 15, fontWeight: '600' },
  anchorId: { color: TEXT_SEC, fontSize: 11, fontFamily: 'monospace' },
  anchorActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  exitBtn: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  exitBtnActive: { borderColor: EARTH, backgroundColor: 'rgba(139, 94, 60, 0.12)' },
  exitBtnText: { color: TEXT_SEC, fontSize: 12 },
  exitBtnTextActive: { color: EARTH, fontWeight: '700' },
  deleteBtn: { color: RED, fontSize: 16, fontWeight: '700', paddingHorizontal: 6 },

  // Modals
  modalBg: { flex: 1, backgroundColor: 'rgba(10, 41, 71, 0.55)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    gap: 16,
  },
  modalTitle: { color: NAVY, fontSize: 18, fontWeight: '700' },
  input: {
    backgroundColor: CREAM,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    color: NAVY,
    fontSize: 16,
  },
  modalRow: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  cancelBtnText: { color: TEXT_SEC, fontWeight: '600' },
  addBtn: {
    flex: 2,
    backgroundColor: NAVY,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  addBtnDisabled: { backgroundColor: 'rgba(10, 41, 71, 0.3)' },
  addBtnText: { color: WHITE, fontWeight: '700', fontSize: 16 },

  // QR modal
  qrCard: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 14,
  },
  qrTitle: { color: NAVY, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  exitBadge: {
    backgroundColor: EARTH,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  exitBadgeText: { color: WHITE, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  qrBox: {
    backgroundColor: WHITE,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    marginVertical: 4,
  },
  qrHint: { color: TEXT_SEC, fontSize: 13, textAlign: 'center' },
  closeBtn: { backgroundColor: NAVY, borderRadius: 12, paddingHorizontal: 40, paddingVertical: 13 },
  closeBtnText: { color: WHITE, fontWeight: '700', fontSize: 16 },

  // Empty state
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 16 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: BORDER,
    backgroundColor: WHITE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyIconText: { color: NAVY, fontSize: 18, fontWeight: '700', letterSpacing: 1 },
  emptyTitle: { color: NAVY, fontSize: 22, fontWeight: '700', textAlign: 'center' },
  emptyBody: { color: TEXT_SEC, fontSize: 15, textAlign: 'center', lineHeight: 22 },

  loadBtn: { backgroundColor: '#0A2947', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8 },
  loadBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  switchBtn: { color: '#475665', fontSize: 13, textDecorationLine: 'underline', textAlign: 'right', paddingVertical: 4 },
});
