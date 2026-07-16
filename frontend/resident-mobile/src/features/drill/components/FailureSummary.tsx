import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import type { FailureReason } from '../types';

const REASON_LABELS: Record<FailureReason, { title: string; detail: string }> = {
  countdown_expired: {
    title: 'Waktu Habis',
    detail: 'Kamu tidak berhasil berlindung dalam 30 detik. Coba temukan tempat berlindung lebih cepat saat gempa terjadi.',
  },
  sensor_unavailable: {
    title: 'Sensor Tidak Tersedia',
    detail: 'Perangkat ini tidak memiliki sensor yang dibutuhkan untuk memvalidasi latihan. Coba di perangkat lain.',
  },
  app_backgrounded: {
    title: 'Aplikasi Dibatalkan',
    detail: 'Latihan dibatalkan karena aplikasi berpindah ke latar belakang. Pastikan aplikasi tetap aktif selama latihan.',
  },
  internal_error: {
    title: 'Terjadi Kesalahan',
    detail: 'Latihan tidak dapat diselesaikan karena kesalahan internal. Silakan coba lagi.',
  },
};

interface Props {
  reason: FailureReason | null;
  onRetry: () => void;
  onClose: () => void;
}

export default function FailureSummary({ reason, onRetry, onClose }: Props) {
  const info = reason ? REASON_LABELS[reason] : REASON_LABELS.internal_error;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.icon}>💔</Text>
        <Text style={styles.title}>Latihan Tidak Berhasil</Text>
        <Text style={styles.reason}>{info.title}</Text>
        <Text style={styles.detail}>{info.detail}</Text>

        <View style={styles.tips}>
          <Text style={styles.tipsTitle}>Tips:</Text>
          <Text style={styles.tipItem}>• Cari meja atau tempat berlindung sebelum memulai</Text>
          <Text style={styles.tipItem}>• Pastikan ruangan cukup gelap saat berlindung</Text>
          <Text style={styles.tipItem}>• Tahan posisi setidaknya 3 detik</Text>
        </View>

        <TouchableOpacity
          style={styles.retryButton}
          onPress={onRetry}
          accessible
          accessibilityLabel="Coba latihan lagi"
          accessibilityRole="button"
        >
          <Text style={styles.retryText}>Coba Lagi</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          accessible
          accessibilityLabel="Kembali ke beranda"
          accessibilityRole="button"
        >
          <Text style={styles.closeText}>Kembali ke Beranda</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0A2947',
  },
  content: {
    padding: 28,
    alignItems: 'center',
    gap: 16,
    paddingTop: 60,
  },
  icon: { fontSize: 56 },
  title: {
    color: '#F3E4C9',
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
  },
  reason: {
    color: '#D93025',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  detail: {
    color: 'rgba(243,228,201,0.75)',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  tips: {
    backgroundColor: 'rgba(243,228,201,0.08)',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    gap: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#F3E4C9',
  },
  tipsTitle: {
    color: '#F3E4C9',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  tipItem: {
    color: 'rgba(243,228,201,0.8)',
    fontSize: 13,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#F3E4C9',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 40,
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
    minHeight: 52,
  },
  retryText: {
    color: '#0A2947',
    fontSize: 17,
    fontWeight: '700',
  },
  closeButton: {
    backgroundColor: 'transparent',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 40,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(243,228,201,0.3)',
  },
  closeText: {
    color: 'rgba(243,228,201,0.7)',
    fontSize: 15,
    fontWeight: '500',
  },
});
