import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import type { SpatialMap, SpatialObject } from '@3minutes/contracts';
import type { AccessibilityMode } from './types';
import { isMapSufficient } from './ar/SafeZoneSelector';
import AccessibilityModeSelector from './components/AccessibilityModeSelector';

interface Props {
  spatialMap: SpatialMap | null;
  onStart: (mode: AccessibilityMode) => void;
  onScanFirst: () => void;
}

export default function DrillReadyScreen({ spatialMap, onStart, onScanFirst }: Props) {
  const [mode, setMode] = useState<AccessibilityMode>('VISUAL_AND_AUDIO');

  const hasSufficientMap = spatialMap
    ? isMapSufficient(spatialMap.safeZones, spatialMap.exitPoints)
    : false;

  const safeZoneCount = spatialMap?.safeZones.length ?? 0;
  const hazardCount = spatialMap?.hazardZones.length ?? 0;
  const exitCount = spatialMap?.exitPoints.length ?? 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Latihan Evakuasi AR</Text>
      <Text style={styles.subtitle}>3 Menit — Drop · Cover · Hold · Evakuasi</Text>

      {/* Spatial map status */}
      <View style={[styles.mapCard, !hasSufficientMap && styles.mapCardWarning]}>
        {hasSufficientMap ? (
          <>
            <Text style={styles.mapTitle}>Peta Ruangan Siap</Text>
            <View style={styles.mapStats}>
              <MapStat icon="🛡️" value={safeZoneCount} label="Zona Aman" />
              <MapStat icon="⚠️" value={hazardCount} label="Bahaya" />
              <MapStat icon="🚪" value={exitCount} label="Pintu Keluar" />
            </View>
            <Text style={styles.mapSource}>
              Sumber: {spatialMap?.source === 'gemini' ? 'AI Gemini' : 'Peta Fallback'}
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.mapWarningTitle}>Peta Ruangan Belum Ada</Text>
            <Text style={styles.mapWarningText}>
              Scan ruangan terlebih dahulu untuk mendapatkan peta zona aman dan pintu keluar.
            </Text>
            <TouchableOpacity
              style={styles.scanButton}
              onPress={onScanFirst}
              accessible
              accessibilityLabel="Ke halaman scan ruangan"
              accessibilityRole="button"
            >
              <Text style={styles.scanButtonText}>Scan Ruangan Sekarang</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Drill description */}
      <View style={styles.descCard}>
        <View style={styles.phase}>
          <Text style={styles.phaseIcon}>🔽</Text>
          <View style={styles.phaseText}>
            <Text style={styles.phaseTitle}>Fase 1 — Drop, Cover, Hold (30 detik)</Text>
            <Text style={styles.phaseDesc}>
              Berlindung di bawah meja. Sensor memvalidasi kegelapan dan ketenangan selama 3 detik.
            </Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.phase}>
          <Text style={styles.phaseIcon}>🏃</Text>
          <View style={styles.phaseText}>
            <Text style={styles.phaseTitle}>Fase 2 — Evakuasi Berasap</Text>
            <Text style={styles.phaseDesc}>
              Ikuti panah menuju pintu keluar sambil tetap merunduk. Selesaikan QTE rintangan di jalan.
            </Text>
          </View>
        </View>
      </View>

      {/* Accessibility mode */}
      <View style={styles.sectionCard}>
        <AccessibilityModeSelector selected={mode} onChange={setMode} />
      </View>

      {/* Start requirements */}
      <View style={styles.requirementsCard}>
        <Text style={styles.reqTitle}>Sebelum Memulai:</Text>
        <Text style={styles.reqItem}>• Pastikan ada ruang bebas di sekitar Anda untuk bergerak</Text>
        <Text style={styles.reqItem}>• Akses kamera akan diminta untuk AR overlay</Text>
        <Text style={styles.reqItem}>• Jika ada meja, berlindung di bawahnya saat fase 1</Text>
      </View>

      {/* CTA */}
      <TouchableOpacity
        style={[styles.startButton, !hasSufficientMap && styles.startButtonDisabled]}
        onPress={() => hasSufficientMap && onStart(mode)}
        disabled={!hasSufficientMap}
        accessible
        accessibilityLabel="Mulai latihan evakuasi"
        accessibilityRole="button"
        accessibilityState={{ disabled: !hasSufficientMap }}
      >
        <Text style={styles.startButtonText}>
          {hasSufficientMap ? 'Mulai Latihan 3 Menit' : 'Scan Ruangan Dulu'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.disclaimer}>
        Demo latihan menggunakan peta spasial dari scan terakhir Anda.
      </Text>
    </ScrollView>
  );
}

function MapStat({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A2947' },
  content: { padding: 20, paddingTop: 16, gap: 14, paddingBottom: 40 },

  title: { color: '#F3E4C9', fontSize: 24, fontWeight: '800' },
  subtitle: { color: 'rgba(243,228,201,0.6)', fontSize: 13, marginTop: -6 },

  mapCard: {
    backgroundColor: 'rgba(57,255,20,0.08)',
    borderRadius: 14,
    padding: 18,
    gap: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(57,255,20,0.3)',
  },
  mapCardWarning: {
    backgroundColor: 'rgba(243,228,201,0.05)',
    borderColor: 'rgba(243,228,201,0.15)',
  },
  mapTitle: { color: '#39FF14', fontSize: 15, fontWeight: '700' },
  mapStats: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center', gap: 2 },
  statIcon: { fontSize: 22 },
  statValue: { color: '#F3E4C9', fontSize: 20, fontWeight: '800' },
  statLabel: { color: 'rgba(243,228,201,0.6)', fontSize: 11 },
  mapSource: { color: 'rgba(57,255,20,0.6)', fontSize: 11, textAlign: 'right' },

  mapWarningTitle: { color: '#F3E4C9', fontSize: 15, fontWeight: '700' },
  mapWarningText: { color: 'rgba(243,228,201,0.7)', fontSize: 13, lineHeight: 18 },
  scanButton: {
    backgroundColor: '#F3E4C9',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  scanButtonText: { color: '#0A2947', fontSize: 14, fontWeight: '700' },

  descCard: {
    backgroundColor: 'rgba(243,228,201,0.06)',
    borderRadius: 14,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(243,228,201,0.1)',
  },
  phase: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  phaseIcon: { fontSize: 22, marginTop: 2 },
  phaseText: { flex: 1, gap: 2 },
  phaseTitle: { color: '#F3E4C9', fontSize: 13, fontWeight: '700' },
  phaseDesc: { color: 'rgba(243,228,201,0.65)', fontSize: 12, lineHeight: 17 },
  divider: { height: 1, backgroundColor: 'rgba(243,228,201,0.1)' },

  sectionCard: {
    backgroundColor: 'rgba(243,228,201,0.04)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(243,228,201,0.1)',
  },

  requirementsCard: {
    backgroundColor: 'rgba(139,94,60,0.12)',
    borderRadius: 12,
    padding: 14,
    gap: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#8B5E3C',
  },
  reqTitle: { color: '#F3E4C9', fontSize: 13, fontWeight: '700', marginBottom: 4 },
  reqItem: { color: 'rgba(243,228,201,0.75)', fontSize: 12, lineHeight: 18 },

  startButton: {
    backgroundColor: '#F3E4C9',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginTop: 4,
    minHeight: 56,
  },
  startButtonDisabled: {
    backgroundColor: 'rgba(243,228,201,0.25)',
  },
  startButtonText: {
    color: '#0A2947',
    fontSize: 17,
    fontWeight: '800',
  },
  disclaimer: {
    color: 'rgba(243,228,201,0.35)',
    fontSize: 11,
    textAlign: 'center',
  },
});
