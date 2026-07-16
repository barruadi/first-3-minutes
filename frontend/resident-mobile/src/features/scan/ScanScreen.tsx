import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Speech from 'expo-speech';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import Button from '../../components/Button';
import ErrorState from '../../components/ErrorState';
import { residentApi } from '../../services/apiClient';
import { getInstallationId } from '../../services/installationIdentity';
import { spatialSession } from '../../services/spatialSession';
import type { RootTabParamList } from '../../navigation/RootNavigator';
import { cleanupUris, extractAndCompressFrames, purgeScanCache, type PreparedFrame } from './scanFiles';
import { SCAN_DURATION_MS, transitionScan, validatePreparedFrames, type ScanEvent, type ScanState } from './scanMachine';
import { theme } from '../../theme';

type Nav = BottomTabNavigationProp<RootTabParamList, 'Scan'>;
const instructions = [
  [0, 'Mulai dari posisi utama. Arahkan kamera ke seluruh ruangan.'],
  [15_000, 'Berjalan perlahan menuju pintu keluar utama.'],
  [30_000, 'Gerakkan kamera ke kiri dan kanan untuk menangkap sudut ruangan.'],
] as const;

export default function ScanScreen() {
  const navigation = useNavigation<Nav>();
  const camera = useRef<CameraView>(null);
  const startedAt = useRef(0);
  const completionHandled = useRef(false);
  const frames = useRef<PreparedFrame[]>([]);
  const videoUri = useRef<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [state, setState] = useState<ScanState>('idle');
  const [remainingMs, setRemainingMs] = useState(SCAN_DURATION_MS);
  const [instruction, setInstruction] = useState<string>(instructions[0][1]);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ bytes: number; safe: number; hazards: number; exits: number } | null>(null);

  const send = useCallback((event: ScanEvent) => setState((current) => transitionScan(current, event)), []);
  const cleanup = useCallback(async () => {
    Speech.stop(); abort.current?.abort(); abort.current = null;
    if (frames.current.length) await cleanupUris(frames.current.map((frame) => frame.uri));
    if (videoUri.current) await cleanupUris([videoUri.current]);
    videoUri.current = null;
    frames.current = [];
  }, []);

  useEffect(() => () => { void cleanup(); }, [cleanup]);
  useEffect(() => {
    const listener = AppState.addEventListener('change', (next) => {
      if (next !== 'active' && (state === 'recording' || state === 'uploading')) {
        camera.current?.stopRecording();
        abort.current?.abort(); Speech.stop(); setError('Scan dihentikan karena aplikasi tidak aktif.');
        setState('interrupted');
      }
    });
    return () => listener.remove();
  }, [state]);

  useEffect(() => {
    if (state !== 'recording') return;
    const tick = setInterval(() => {
      const elapsed = performance.now() - startedAt.current;
      setRemainingMs(Math.max(0, SCAN_DURATION_MS - elapsed));
      const current = [...instructions].reverse().find(([at]) => elapsed >= at)?.[1] ?? instructions[0][1];
      setInstruction((previous) => {
        if (previous !== current) Speech.speak(current, { language: 'id-ID', rate: 0.92 });
        return current;
      });
    }, 100);
    return () => clearInterval(tick);
  }, [state]);

  async function prepare(): Promise<void> {
    setError(null); setSummary(null); spatialSession.clear(); send('REQUEST_PERMISSION');
    try {
      await purgeScanCache();
      const result = permission?.granted ? permission : await requestPermission();
      if (!result.granted) { setError('Izin kamera diperlukan. Aktifkan izin melalui pengaturan perangkat.'); send('PERMISSION_DENIED'); return; }
      send('PERMISSION_GRANTED');
    } catch (cause) { setError(messageOf(cause)); send('FAIL'); }
  }

  async function startRecording(): Promise<void> {
    if (!camera.current) return;
    completionHandled.current = false; setRemainingMs(SCAN_DURATION_MS); send('START');
    startedAt.current = performance.now();
    Speech.speak(instructions[0][1], { language: 'id-ID', rate: 0.92 });
    const cutoff = setTimeout(() => camera.current?.stopRecording(), SCAN_DURATION_MS);
    try {
      const video = await camera.current.recordAsync({ maxDuration: 45 });
      if (completionHandled.current) return;
      completionHandled.current = true; clearTimeout(cutoff); Speech.stop(); send('CAPTURE_ENDED');
      const captureDurationMs = performance.now() - startedAt.current;
      if (captureDurationMs < 44_500) throw new Error(`Perekaman berhenti terlalu cepat (${(captureDurationMs / 1000).toFixed(1)} detik).`);
      if (!video?.uri) throw new Error('File video tidak tersedia setelah perekaman.');
      videoUri.current = video.uri;
      send('VIDEO_READY');
      frames.current = await extractAndCompressFrames(video.uri);
      send('FRAMES_READY'); send('COMPRESSED');
      const bytes = validatePreparedFrames(frames.current); send('PAYLOAD_VALID');
      abort.current = new AbortController();
      const scanId = `scan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const form = new FormData();
      form.append('scanId', scanId); form.append('installationId', await getInstallationId());
      frames.current.forEach((frame, index) => form.append('images', { uri: frame.uri, name: `frame-${String(index + 1).padStart(2, '0')}.jpg`, type: 'image/jpeg' } as unknown as Blob));
      const map = await residentApi.uploadScan(form, abort.current.signal);
      spatialSession.set(map); setSummary({ bytes, safe: map.safeZones.length, hazards: map.hazardZones.length, exits: map.exitPoints.length });
      send('UPLOAD_SUCCESS'); await cleanupUris(frames.current.map((frame) => frame.uri)); frames.current = [];
      await cleanupUris([video.uri]); videoUri.current = null;
    } catch (cause) {
      clearTimeout(cutoff); if ((cause as Error)?.name === 'AbortError') return;
      setError(messageOf(cause)); setState('error');
    }
  }

  if (state === 'idle' || state === 'requesting_permission') return <Preparation loading={state === 'requesting_permission'} onStart={() => void prepare()} />;
  if (state === 'error' || state === 'interrupted') return <View style={styles.page}><ErrorState message={error ?? 'Scan terhenti.'} onRetry={() => { setError(null); setState('ready'); }} /><Button label="Kembali ke awal" variant="secondary" onPress={() => { void cleanup(); setState('idle'); }} /></View>;
  if (state === 'spatial_ready' && summary) return <View style={styles.page}><Text style={styles.title}>Peta ruangan siap</Text><View style={styles.result}><Text style={styles.resultText}>{summary.safe} safe zone</Text><Text style={styles.resultText}>{summary.hazards} hazard</Text><Text style={styles.resultText}>{summary.exits} titik keluar</Text><Text style={styles.caption}>15 frame • {(summary.bytes / 1024 / 1024).toFixed(2)} MB</Text></View><Button label="Lanjut ke latihan" onPress={() => navigation.navigate('Drill')} /><Button label="Scan ulang" variant="secondary" onPress={() => setState('idle')} /></View>;

  const active = state === 'recording';
  return <View style={styles.cameraPage}>
    <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" mode="video" mute />
    <View style={styles.overlay}><Text style={styles.timer}>{active ? formatTime(remainingMs) : '00:45'}</Text><Text style={styles.instruction}>{active ? instruction : 'Pastikan jalur berjalan aman dan ruangan cukup terang.'}</Text><Text style={styles.phase}>{phaseLabel(state)}</Text></View>
    <View style={styles.bottom}>{state === 'ready' && <Button label="Mulai scan 45 detik" onPress={() => void startRecording()} />}{active && <Text style={styles.recording}>● Merekam — tetap bergerak perlahan</Text>}</View>
  </View>;
}

function Preparation({ loading, onStart }: { loading: boolean; onStart: () => void }) { return <View style={styles.page}><Text style={styles.eyebrow}>PEMETAAN RUANGAN</Text><Text style={styles.title}>Kenali ruanganmu dalam 45 detik</Text><Text style={styles.body}>Mulai dari posisi utama, berjalan ke pintu keluar, lalu arahkan kamera perlahan ke kiri dan kanan.</Text><View style={styles.steps}><Text style={styles.step}>1  Pastikan jalur bebas hambatan</Text><Text style={styles.step}>2  Pegang ponsel setinggi dada</Text><Text style={styles.step}>3  Ikuti panduan suara dan teks</Text></View><Button label="Siapkan kamera" loading={loading} onPress={onStart} /></View>; }
function phaseLabel(state: ScanState): string { return ({ finalizing_recording: 'Menyelesaikan video', sampling: 'Menyiapkan 15 frame', compressing: 'Mengompresi gambar', validating_payload: 'Memeriksa ukuran payload', uploading: 'Menganalisis safe zone' } as Partial<Record<ScanState, string>>)[state] ?? ''; }
function formatTime(ms: number): string { const seconds = Math.ceil(ms / 1000); return `00:${String(seconds).padStart(2, '0')}`; }
function messageOf(value: unknown): string { return value instanceof Error ? value.message : 'Scan gagal. Silakan coba lagi.'; }

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.colors.surfaceWarm, padding: 24, justifyContent: 'center', gap: 20 },
  eyebrow: { color: theme.colors.accentEarth, fontWeight: '700', letterSpacing: 1.4, fontSize: 12 }, title: { color: theme.colors.primary900, fontSize: 32, fontWeight: '700', lineHeight: 38 }, body: { color: theme.colors.textSecondary, fontSize: 16, lineHeight: 24 },
  steps: { backgroundColor: theme.colors.surfaceWhite, borderRadius: 16, padding: 20, gap: 16 }, step: { color: theme.colors.primary900, fontSize: 15, lineHeight: 22 },
  cameraPage: { flex: 1, backgroundColor: theme.colors.primary900 }, overlay: { margin: 20, padding: 20, borderRadius: 16, backgroundColor: 'rgba(10,41,71,0.86)', alignItems: 'center', gap: 10 }, timer: { color: theme.colors.textOnPrimary, fontSize: 48, fontWeight: '700', fontVariant: ['tabular-nums'] }, instruction: { color: theme.colors.textOnPrimary, fontSize: 17, lineHeight: 24, textAlign: 'center', fontWeight: '600' }, phase: { color: theme.colors.surfaceWarm, fontSize: 14 }, bottom: { marginTop: 'auto', padding: 20, backgroundColor: 'rgba(10,41,71,0.82)' }, recording: { color: theme.colors.textOnPrimary, textAlign: 'center', fontWeight: '600', minHeight: 52, paddingTop: 16 },
  result: { backgroundColor: theme.colors.surfaceWhite, padding: 20, borderRadius: 16, gap: 10 }, resultText: { color: theme.colors.primary900, fontSize: 18, fontWeight: '600' }, caption: { color: theme.colors.textSecondary, marginTop: 8 },
});
