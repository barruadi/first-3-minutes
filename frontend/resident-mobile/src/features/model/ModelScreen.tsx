import React, { useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { MeshViewerView, reloadMeshViewer } from '../../../modules/lidar-scanner';
import { scanStore } from '../../store/scanStore';

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
          <Text style={styles.emptyIcon}>⬡</Text>
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
      {/* 3D orbit viewer */}
      <MeshViewerView ref={viewerRef} style={styles.viewer} />

      {/* Gesture hint */}
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
  root: { flex: 1, backgroundColor: '#080F09' },
  viewer: { flex: 1 },
  hintBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  hintText: { color: 'rgba(255,255,255,0.55)', fontSize: 12 },
  reloadBtn: {
    backgroundColor: '#39FF14',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  reloadText: { color: '#000', fontWeight: '700', fontSize: 13 },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  emptyIcon: { fontSize: 72, color: '#39FF14' },
  emptyTitle: { color: '#fff', fontSize: 22, fontWeight: '700', textAlign: 'center' },
  emptyBody: { color: 'rgba(255,255,255,0.6)', fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
