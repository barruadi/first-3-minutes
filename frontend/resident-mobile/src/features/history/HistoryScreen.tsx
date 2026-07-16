import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import LoadingState from '../../components/LoadingState';
import { residentApi } from '../../services/apiClient';

export default function HistoryScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        await residentApi.getHistory('resident-demo-001');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Gagal memuat riwayat');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <LoadingState message="Memuat riwayat..." />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Riwayat Latihan</Text>
      {error && <Text style={styles.error}>{error}</Text>}
      <View style={styles.placeholder}>
        <Text style={styles.icon}>📋</Text>
        <Text style={styles.text}>Riwayat latihan Anda akan muncul di sini</Text>
        <Text style={styles.sub}>[Domain 1: Drill history list, safety rating progression]</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3E4C9' },
  content: { padding: 20, gap: 16 },
  title: { color: '#0A2947', fontSize: 22, fontWeight: '700' },
  error: { color: '#C62828', fontSize: 13 },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, minHeight: 300 },
  icon: { fontSize: 48 },
  text: { color: '#475665', fontSize: 14 },
  sub: { color: '#475665', fontSize: 11, opacity: 0.7, textAlign: 'center' },
});
