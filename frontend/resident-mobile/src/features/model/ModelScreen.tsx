import React, { useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { MeshViewerView, reloadMeshViewer } from '../../../modules/lidar-scanner';
import { scanStore } from '../../store/scanStore';

const NAVY = '#0A2947';
const CREAM = '#F3E4C9';
const EARTH = '#8B5E3C';
const TEXT_SEC = 'rgba(243, 228, 201, 0.55)';
const BORDER = 'rgba(243, 228, 201, 0.15)';

export default function ModelScreen() {
  const viewerRef = useRef(null);
  const hasScan = Boolean(scanStore.get());

  const handleReload = useCallback(() => {
    reloadMeshViewer(viewerRef);
  }, []);

  if (!hasScan) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Text style={styles.emptyIconText}>3D</Text>
          </View>
          <Text style={styles.emptyTitle}>Belum ada pemindaian</Text>
          <Text style={styles.emptyBody}>
            Gunakan tab "Scan" untuk memindai ruangan dengan LiDAR terlebih dahulu.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <MeshViewerView ref={viewerRef} style={styles.viewer} />

      <View style={styles.hintBar}>
        <Text style={styles.hintText}>Geser: putar  •  Jepit: zoom  •  2 jari: geser</Text>
        <TouchableOpacity style={styles.reloadBtn} onPress={handleReload}>
          <Text style={styles.reloadText}>Muat Ulang</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },
  viewer: { flex: 1 },
  hintBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(10, 41, 71, 0.95)',
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  hintText: { color: TEXT_SEC, fontSize: 12 },
  reloadBtn: {
    backgroundColor: EARTH,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  reloadText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: BORDER,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyIconText: { color: CREAM, fontSize: 20, fontWeight: '700', letterSpacing: 1 },
  emptyTitle: { color: CREAM, fontSize: 22, fontWeight: '700', textAlign: 'center' },
  emptyBody: { color: TEXT_SEC, fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
