import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import type { DrillCompletionResponse } from '@3minutes/contracts';

interface Props {
  result: DrillCompletionResponse | null;
  reactionTimeMs: number | null;
  evacuationTimeMs: number | null;
  postureScorePercentage: number;
  onHome: () => void;
  onRetry: () => void;
}

export default function DrillResultScreen({
  result,
  reactionTimeMs,
  evacuationTimeMs,
  postureScorePercentage,
  onHome,
  onRetry,
}: Props) {
  const isSuccess = result?.accepted ?? false;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerIcon}>{isSuccess ? '🏆' : '📊'}</Text>
        <Text style={styles.headerTitle}>
          {isSuccess ? 'Latihan Selesai!' : 'Hasil Latihan'}
        </Text>
      </View>

      {/* Safety rating */}
      {result && (
        <View style={styles.ratingCard}>
          <Text style={styles.ratingLabel}>Safety Rating</Text>
          <Text style={styles.ratingValue}>{result.safetyRating.toFixed(0)}</Text>
          <Text style={styles.ratingMax}>/100</Text>
          <View style={[styles.tierBadge,
            result.tier === 'Platinum' && styles.tierPlatinum,
            result.tier === 'Gold' && styles.tierGold,
            result.tier === 'Silver' && styles.tierSilver,
          ]}>
            <Text style={styles.tierText}>{result.tier}</Text>
          </View>
        </View>
      )}

      {/* Metrics */}
      <View style={styles.metricsCard}>
        <Text style={styles.metricsTitle}>Ringkasan Latihan</Text>
        <MetricRow
          label="Waktu Reaksi"
          value={reactionTimeMs !== null ? `${(reactionTimeMs / 1000).toFixed(1)} detik` : '—'}
          hint="Waktu dari alarm hingga berlindung"
        />
        <MetricRow
          label="Waktu Evakuasi"
          value={evacuationTimeMs !== null ? `${(evacuationTimeMs / 1000).toFixed(1)} detik` : '—'}
          hint="Waktu dari fase evakuasi hingga keluar"
        />
        <MetricRow
          label="Skor Postur"
          value={`${postureScorePercentage}%`}
          hint="Persentase waktu postur benar saat evakuasi"
        />
      </View>

      {/* Reward status */}
      {result && (
        <View style={[styles.rewardCard, result.rewardEligible && styles.rewardCardActive]}>
          {result.rewardEligible ? (
            <>
              <Text style={styles.rewardIcon}>🎁</Text>
              <Text style={styles.rewardTitle}>Reward Tersedia!</Text>
              <Text style={styles.rewardDesc}>
                Anda memenuhi syarat untuk reward minggu ini. Lihat halaman Reward.
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.rewardIconInactive}>🎁</Text>
              <Text style={styles.rewardTitleInactive}>Belum Eligible</Text>
              <Text style={styles.rewardDesc}>
                Latihan tambahan dapat meningkatkan skor tetapi reward hanya diberikan satu kali per 7 hari.
              </Text>
            </>
          )}
        </View>
      )}

      {!result && (
        <View style={styles.offlineCard}>
          <Text style={styles.offlineText}>
            ⚠️ Hasil belum dikirim ke server. Data latihan tersimpan lokal.
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.homeButton}
        onPress={onHome}
        accessible
        accessibilityLabel="Kembali ke beranda"
        accessibilityRole="button"
      >
        <Text style={styles.homeButtonText}>Kembali ke Beranda</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.retryButton}
        onPress={onRetry}
        accessible
        accessibilityLabel="Ulangi latihan"
        accessibilityRole="button"
      >
        <Text style={styles.retryButtonText}>Ulangi Latihan</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function MetricRow({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <View style={mStyles.row}>
      <View style={mStyles.left}>
        <Text style={mStyles.label}>{label}</Text>
        <Text style={mStyles.hint}>{hint}</Text>
      </View>
      <Text style={mStyles.value}>{value}</Text>
    </View>
  );
}

const mStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(243,228,201,0.08)',
  },
  left: { flex: 1, gap: 2 },
  label: { color: '#F3E4C9', fontSize: 14, fontWeight: '500' },
  hint: { color: 'rgba(243,228,201,0.45)', fontSize: 11 },
  value: { color: '#F3E4C9', fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A2947' },
  content: { padding: 20, paddingTop: 40, gap: 16, paddingBottom: 40 },

  header: { alignItems: 'center', gap: 8 },
  headerIcon: { fontSize: 52 },
  headerTitle: { color: '#F3E4C9', fontSize: 26, fontWeight: '800', textAlign: 'center' },

  ratingCard: {
    backgroundColor: 'rgba(243,228,201,0.06)',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(243,228,201,0.15)',
  },
  ratingLabel: { color: 'rgba(243,228,201,0.6)', fontSize: 13 },
  ratingValue: { color: '#F3E4C9', fontSize: 72, fontWeight: '700', lineHeight: 80 },
  ratingMax: { color: 'rgba(243,228,201,0.5)', fontSize: 18, marginTop: -12 },
  tierBadge: {
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
    backgroundColor: 'rgba(243,228,201,0.1)',
  },
  tierPlatinum: { backgroundColor: 'rgba(180,200,220,0.3)' },
  tierGold: { backgroundColor: 'rgba(212,175,55,0.3)' },
  tierSilver: { backgroundColor: 'rgba(192,192,192,0.2)' },
  tierText: { color: '#F3E4C9', fontSize: 16, fontWeight: '700' },

  metricsCard: {
    backgroundColor: 'rgba(243,228,201,0.04)',
    borderRadius: 14,
    padding: 16,
    gap: 0,
    borderWidth: 1,
    borderColor: 'rgba(243,228,201,0.1)',
  },
  metricsTitle: {
    color: '#F3E4C9',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },

  rewardCard: {
    backgroundColor: 'rgba(139,94,60,0.1)',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(139,94,60,0.3)',
  },
  rewardCardActive: {
    backgroundColor: 'rgba(139,94,60,0.2)',
    borderColor: '#8B5E3C',
  },
  rewardIcon: { fontSize: 32 },
  rewardIconInactive: { fontSize: 32, opacity: 0.4 },
  rewardTitle: { color: '#8B5E3C', fontSize: 16, fontWeight: '700' },
  rewardTitleInactive: { color: 'rgba(243,228,201,0.5)', fontSize: 16, fontWeight: '700' },
  rewardDesc: {
    color: 'rgba(243,228,201,0.65)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },

  offlineCard: {
    backgroundColor: 'rgba(217,48,37,0.1)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(217,48,37,0.3)',
  },
  offlineText: { color: 'rgba(243,228,201,0.75)', fontSize: 12, lineHeight: 17 },

  homeButton: {
    backgroundColor: '#F3E4C9',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
    minHeight: 52,
  },
  homeButtonText: { color: '#0A2947', fontSize: 16, fontWeight: '800' },

  retryButton: {
    backgroundColor: 'transparent',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(243,228,201,0.3)',
  },
  retryButtonText: { color: 'rgba(243,228,201,0.7)', fontSize: 15, fontWeight: '500' },
});
