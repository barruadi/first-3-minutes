import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { ResidentProfile } from '@3minutes/contracts';
import LoadingState from '../../components/LoadingState';
import { residentApi } from '../../services/apiClient';
import type { RootTabParamList } from '../../navigation/RootNavigator';

type Nav = BottomTabNavigationProp<RootTabParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const [profile, setProfile] = useState<ResidentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const data = await residentApi.getHome('resident-demo-001');
        setProfile(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Gagal memuat profil');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <LoadingState message="Memuat beranda..." />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.scoreCard}>
        <Text style={styles.scoreLabel}>Safety Score</Text>
        <Text style={styles.scoreValue}>{profile?.safetyRating.score ?? '—'}</Text>
        <Text style={styles.tierBadge}>{profile?.safetyRating.tier ?? '—'}</Text>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>Status Lokasi</Text>
        <Text style={styles.statusValue}>{profile?.locationStatus ?? 'Belum ditentukan'}</Text>
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('Scan')}>
        <Text style={styles.primaryButtonText}>Mulai Scan Ruangan</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('Drill')}>
        <Text style={styles.secondaryButtonText}>Mulai Latihan Evakuasi</Text>
      </TouchableOpacity>

      <View style={styles.rewardCard}>
        <Text style={styles.rewardLabel}>Status Reward</Text>
        <Text style={styles.rewardValue}>
          {profile?.rewardEligibility.eligible ? 'Eligible untuk reward' : 'Belum eligible'}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3E4C9' },
  content: { padding: 20, gap: 16 },
  scoreCard: {
    backgroundColor: '#0A2947',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  scoreLabel: { color: 'rgba(243,228,201,0.7)', fontSize: 13 },
  scoreValue: { color: '#F3E4C9', fontSize: 56, fontWeight: '700' },
  tierBadge: {
    color: '#F3E4C9',
    backgroundColor: 'rgba(243,228,201,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 14,
    fontWeight: '600',
    overflow: 'hidden',
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(10,41,71,0.1)',
  },
  statusLabel: { color: '#475665', fontSize: 12 },
  statusValue: { color: '#0A2947', fontSize: 15, fontWeight: '500' },
  primaryButton: {
    backgroundColor: '#0A2947',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#F3E4C9', fontSize: 16, fontWeight: '700' },
  secondaryButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0A2947',
  },
  secondaryButtonText: { color: '#0A2947', fontSize: 16, fontWeight: '600' },
  rewardCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(10,41,71,0.1)',
  },
  rewardLabel: { color: '#475665', fontSize: 12 },
  rewardValue: { color: '#8B5E3C', fontSize: 15, fontWeight: '500' },
  errorText: { color: '#C62828', fontSize: 13, textAlign: 'center' },
});
