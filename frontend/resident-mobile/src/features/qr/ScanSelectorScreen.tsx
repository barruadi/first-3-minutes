import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Image, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { buildingApi } from '../../services/apiClient';
import type { BuildingScanResult } from '../../services/apiClient';
import { scanStore } from '../../store/scanStore';

const NAVY = '#0A2947';
const CREAM = '#F3E4C9';
const EARTH = '#8B5E3C';
const WHITE = '#FFFFFF';
const TEXT_SEC = '#475665';
const BORDER = 'rgba(10, 41, 71, 0.22)';

interface Props {
  onClose: () => void;
}

function formatDate(iso: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function ScanSelectorScreen({ onClose }: Props) {
  const [scans, setScans] = useState<BuildingScanResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await buildingApi.listScans();
      setScans(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat daftar pemindaian.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleSelect = useCallback((scan: BuildingScanResult) => {
    scanStore.set({
      scanId: scan.id,
      floorPlanUrl: scan.floorPlanUrl,
      floorPlanMeta: {
        scaleMetersPerPixel: scan.scaleMetersPerPixel,
        originX: scan.originX,
        originZ: scan.originZ,
      },
    });
    onClose();
  }, [onClose]);

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pilih Pemindaian</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.closeBtnText}>X</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={NAVY} />
          <Text style={styles.loadingText}>Memuat pemindaian...</Text>
        </View>
      )}

      {!loading && error !== '' && (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => void load()}>
            <Text style={styles.retryBtnText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && error === '' && scans.length === 0 && (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Belum ada pemindaian tersimpan.</Text>
        </View>
      )}

      {!loading && error === '' && scans.length > 0 && (
        <ScrollView contentContainerStyle={styles.list}>
          {scans.map(scan => (
            <View key={scan.id} style={styles.card}>
              <Image
                source={{ uri: scan.floorPlanUrl }}
                style={styles.thumbnail}
                resizeMode="cover"
              />
              <View style={styles.cardBody}>
                <Text style={styles.cardId} numberOfLines={1}>{scan.id.slice(0, 16)}...</Text>
                <Text style={styles.cardDate}>{formatDate(scan.createdAt)}</Text>
              </View>
              <TouchableOpacity style={styles.useBtn} onPress={() => handleSelect(scan)}>
                <Text style={styles.useBtnText}>Gunakan</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CREAM },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: WHITE,
  },
  headerTitle: { color: NAVY, fontSize: 18, fontWeight: '700' },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(10, 41, 71, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: { color: NAVY, fontSize: 14, fontWeight: '700' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 16 },
  loadingText: { color: TEXT_SEC, fontSize: 14, marginTop: 8 },
  errorText: { color: '#D93025', fontSize: 15, textAlign: 'center' },
  emptyText: { color: TEXT_SEC, fontSize: 15, textAlign: 'center' },

  retryBtn: { backgroundColor: NAVY, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  retryBtnText: { color: WHITE, fontWeight: '700', fontSize: 15 },

  list: { padding: 16, gap: 12 },

  card: {
    backgroundColor: WHITE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: 160,
    backgroundColor: 'rgba(10, 41, 71, 0.06)',
  },
  cardBody: { padding: 12, gap: 4 },
  cardId: { color: NAVY, fontSize: 12, fontFamily: 'monospace', fontWeight: '600' },
  cardDate: { color: TEXT_SEC, fontSize: 13 },

  useBtn: {
    backgroundColor: NAVY,
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  useBtnText: { color: WHITE, fontWeight: '700', fontSize: 15 },
});
