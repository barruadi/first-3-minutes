import React, { useCallback, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, SafeAreaView,
} from 'react-native';
import { ARScanView, stopAndGenerateFloorPlan, exportMeshOBJ } from '../../../modules/lidar-scanner';
import type { MeshStatsEvent } from '../../../modules/lidar-scanner';
import { buildingApi } from '../../services/apiClient';
import { scanStore } from '../../store/scanStore';

const NAVY = '#0A2947';
const CREAM = '#F3E4C9';
const EARTH = '#8B5E3C';
const SAFETY_GREEN = '#39FF14';
const SAFETY_RED = '#D93025';

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
      Alert.alert('Belum Ada Data', 'Arahkan kamera ke ruangan terlebih dahulu untuk memulai pemindaian.');
      return;
    }
    try {
      setPhase('stopping');
      const [floorPlan, meshUri] = await Promise.all([stopAndGenerateFloorPlan(), exportMeshOBJ()]);
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
      {/* AR camera + live wireframe mesh (safety/AR context — dark bg + green mesh is correct) */}
      <ARScanView ref={arRef} style={styles.arView} onMeshStats={handleMeshStats} />

      {/* Stats HUD — safety/AR context, green text on dark */}
      {phase === 'scanning' && (
        <View style={styles.hud}>
          <Text style={styles.hudText}>Jangkar: {stats.anchorCount}</Text>
          <Text style={styles.hudText}>Vertex: {stats.vertexCount.toLocaleString()}</Text>
        </View>
      )}

      {/* Post-scan overlay — brand palette */}
      {phase !== 'scanning' && (
        <View style={styles.overlay}>
          {(phase === 'stopping' || phase === 'uploading') && (
            <>
              <ActivityIndicator size="large" color={SAFETY_GREEN} />
              <Text style={styles.overlayText}>
                {phase === 'stopping' ? 'Menghasilkan denah lantai...' : 'Mengunggah ke server...'}
              </Text>
            </>
          )}
          {phase === 'done' && (
            <>
              <View style={styles.doneCircle}>
                <Text style={styles.doneCheck}>✓</Text>
              </View>
              <Text style={styles.overlayText}>Pemindaian tersimpan!</Text>
              <Text style={styles.overlaySubtext}>
                Buka tab "3D Model" untuk melihat hasil, atau tab "QR Codes" untuk menambahkan titik evakuasi.
              </Text>
            </>
          )}
          {phase === 'error' && (
            <>
              <View style={styles.errorCircle}>
                <Text style={styles.errorCheck}>X</Text>
              </View>
              <Text style={styles.overlayText}>Gagal menyimpan</Text>
              <Text style={styles.overlaySubtext}>{errorMsg}</Text>
              <TouchableOpacity style={styles.actionBtn} onPress={handleRetry}>
                <Text style={styles.actionBtnText}>Coba Lagi</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* Bottom controls — scanning phase */}
      {phase === 'scanning' && (
        <View style={styles.controls}>
          <Text style={styles.instructions}>
            Arahkan kamera ke seluruh ruangan. Mesh hijau menunjukkan area yang sudah dipindai.
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
  // HUD in safety/AR context — green text OK
  hud: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    padding: 10,
    gap: 3,
  },
  hudText: { color: SAFETY_GREEN, fontSize: 12, fontFamily: 'monospace' },
  // Post-scan overlay — brand colors
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 41, 71, 0.90)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 18,
    padding: 32,
  },
  doneCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2.5,
    borderColor: EARTH,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneCheck: { fontSize: 40, color: EARTH },
  errorCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2.5,
    borderColor: SAFETY_RED,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorCheck: { fontSize: 36, color: SAFETY_RED, fontWeight: '700' },
  overlayText: { color: CREAM, fontSize: 22, fontWeight: '700', textAlign: 'center' },
  overlaySubtext: { color: 'rgba(243, 228, 201, 0.65)', fontSize: 14, textAlign: 'center', lineHeight: 21 },
  actionBtn: {
    marginTop: 8,
    backgroundColor: EARTH,
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 16,
  },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  // Bottom controls
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    gap: 14,
    backgroundColor: 'rgba(10, 41, 71, 0.85)',
  },
  instructions: {
    color: 'rgba(243, 228, 201, 0.8)',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  // Stop button: safety green (AR scanning action)
  stopBtn: {
    backgroundColor: SAFETY_GREEN,
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
  },
  stopBtnDisabled: { backgroundColor: 'rgba(57, 255, 20, 0.25)' },
  stopBtnText: { color: '#000', fontWeight: '700', fontSize: 17 },
});
