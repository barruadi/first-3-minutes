import React, { useCallback, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, SafeAreaView,
} from 'react-native';
import { ARScanView, stopAndGenerateFloorPlan, exportMeshOBJ } from '../../../modules/lidar-scanner';
import type { MeshStatsEvent } from '../../../modules/lidar-scanner';
import { buildingApi } from '../../services/apiClient';
import { scanStore } from '../../store/scanStore';

type Phase = 'scanning' | 'stopping' | 'uploading' | 'done' | 'error';

export default function ScanScreen() {
  const arRef = useRef(null);
  const [phase, setPhase] = useState<Phase>('scanning');
  const [stats, setStats] = useState<MeshStatsEvent>({ anchorCount: 0, vertexCount: 0 });
  const [errorMsg, setErrorMsg] = useState('');

  const handleMeshStats = useCallback((event: { nativeEvent: MeshStatsEvent }) => {
    setStats(event.nativeEvent);
  }, []);

  const handleStop = useCallback(async () => {
    if (phase !== 'scanning') return;
    if (stats.anchorCount === 0) {
      Alert.alert(
        'Belum Ada Data',
        'Arahkan kamera ke ruangan terlebih dahulu untuk memulai pemindaian.',
      );
      return;
    }

    try {
      setPhase('stopping');
      const [floorPlan, meshUri] = await Promise.all([
        stopAndGenerateFloorPlan(),
        exportMeshOBJ(),
      ]);

      setPhase('uploading');
      const result = await buildingApi.uploadScan(floorPlan.uri, meshUri);

      scanStore.set({
        scanId: result.id,
        floorPlanUrl: result.floorPlanUrl,
        floorPlanMeta: {
          scaleMetersPerPixel: floorPlan.scaleMetersPerPixel,
          originX: floorPlan.originX,
          originZ: floorPlan.originZ,
        },
      });

      setPhase('done');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Terjadi kesalahan tak dikenal.');
      setPhase('error');
    }
  }, [phase, stats.anchorCount]);

  const handleRetry = useCallback(() => {
    setPhase('scanning');
    setStats({ anchorCount: 0, vertexCount: 0 });
    setErrorMsg('');
  }, []);

  return (
    <SafeAreaView style={styles.root}>
      {/* AR camera + live wireframe mesh */}
      <ARScanView ref={arRef} style={styles.arView} onMeshStats={handleMeshStats} />

      {/* Stats HUD — top right */}
      {phase === 'scanning' && (
        <View style={styles.hud}>
          <Text style={styles.hudText}>Jangkar: {stats.anchorCount}</Text>
          <Text style={styles.hudText}>Vertex: {stats.vertexCount.toLocaleString()}</Text>
        </View>
      )}

      {/* Processing / done / error overlay */}
      {phase !== 'scanning' && (
        <View style={styles.overlay}>
          {(phase === 'stopping' || phase === 'uploading') && (
            <>
              <ActivityIndicator size="large" color="#39FF14" />
              <Text style={styles.overlayText}>
                {phase === 'stopping' ? 'Menghasilkan denah lantai...' : 'Mengunggah ke server...'}
              </Text>
            </>
          )}
          {phase === 'done' && (
            <>
              <Text style={styles.doneIcon}>✓</Text>
              <Text style={styles.overlayText}>Pemindaian tersimpan!</Text>
              <Text style={styles.overlaySubtext}>
                Buka tab "3D Model" untuk melihat hasil, atau tab "QR Codes" untuk menambahkan titik evakuasi.
              </Text>
            </>
          )}
          {phase === 'error' && (
            <>
              <Text style={styles.errorIcon}>✕</Text>
              <Text style={styles.overlayText}>Gagal menyimpan</Text>
              <Text style={styles.overlaySubtext}>{errorMsg}</Text>
              <TouchableOpacity style={styles.actionBtn} onPress={handleRetry}>
                <Text style={styles.actionBtnText}>Coba Lagi</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* Bottom controls — scanning phase only */}
      {phase === 'scanning' && (
        <View style={styles.controls}>
          <Text style={styles.instructions}>
            Arahkan kamera ke seluruh ruangan. Mesh hijau menunjukkan area yang sudah dipindai.
            Tidak ada batas waktu — pindai hingga selesai.
          </Text>
          <TouchableOpacity
            style={[styles.stopBtn, stats.anchorCount === 0 && styles.stopBtnDisabled]}
            onPress={() => void handleStop()}
          >
            <Text style={styles.stopBtnText}>Selesai & Simpan</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  arView: { ...StyleSheet.absoluteFillObject },
  hud: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    padding: 10,
    gap: 3,
  },
  hudText: { color: '#39FF14', fontSize: 12, fontFamily: 'monospace' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 18,
    padding: 32,
  },
  doneIcon: { fontSize: 72, color: '#39FF14' },
  errorIcon: { fontSize: 72, color: '#FF4444' },
  overlayText: { color: '#fff', fontSize: 22, fontWeight: '700', textAlign: 'center' },
  overlaySubtext: { color: 'rgba(255,255,255,0.7)', fontSize: 14, textAlign: 'center', lineHeight: 21 },
  actionBtn: {
    marginTop: 8,
    backgroundColor: '#39FF14',
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 10,
  },
  actionBtnText: { color: '#000', fontWeight: '700', fontSize: 16 },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    gap: 14,
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  instructions: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  stopBtn: {
    backgroundColor: '#39FF14',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  stopBtnDisabled: { backgroundColor: 'rgba(57,255,20,0.3)' },
  stopBtnText: { color: '#000', fontWeight: '700', fontSize: 17 },
});
