import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { ResidentProfile } from '@3minutes/contracts';
import Button from '../../components/Button'; import Card from '../../components/Card'; import ErrorState from '../../components/ErrorState'; import LoadingState from '../../components/LoadingState';
import { residentApi } from '../../services/apiClient'; import { getInstallationId } from '../../services/installationIdentity'; import type { RootTabParamList } from '../../navigation/RootNavigator'; import { theme } from '../../theme';

type Nav = BottomTabNavigationProp<RootTabParamList, 'Home'>;
export default function HomeScreen() {
  const navigation = useNavigation<Nav>(); const [profile, setProfile] = useState<ResidentProfile | null>(null); const [loading, setLoading] = useState(true); const [refreshing, setRefreshing] = useState(false); const [error, setError] = useState<string | null>(null);
  const load = useCallback(async (refresh = false) => { refresh ? setRefreshing(true) : setLoading(true); setError(null); try { setProfile(await residentApi.getHome(await getInstallationId())); } catch (e) { setError(e instanceof Error ? e.message : 'Gagal memuat profil.'); } finally { setLoading(false); setRefreshing(false); } }, []);
  useEffect(() => { void load(); }, [load]); useFocusEffect(useCallback(() => { if (profile) void load(true); }, [load, profile?.safetyRating.lastDrillAt]));
  if (loading) return <LoadingState message="Memuat status keselamatan..." />; if (error && !profile) return <View style={styles.page}><ErrorState message={error} onRetry={() => void load()} /></View>;
  return <ScrollView style={styles.page} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}>
    <View><Text style={styles.eyebrow}>RUANGAN UTAMA</Text><Text style={styles.title}>Siap lebih cepat, tetap tenang.</Text></View>{error && <ErrorState message={error} />}
    <View style={styles.score}><Text style={styles.scoreLabel}>SAFETY SCORE</Text><View style={styles.scoreRow}><Text style={styles.scoreValue}>{profile?.safetyRating.score ?? '—'}</Text><Text style={styles.outOf}>/100</Text></View><Text style={styles.tier}>{profile?.safetyRating.tier ?? 'Belum dinilai'}</Text></View>
    <Card><Text style={styles.cardLabel}>STATUS LOKASI</Text><Text style={styles.cardValue}>{profile?.locationStatus ?? 'Ruangan belum dipetakan'}</Text><Text style={styles.cardBody}>{profile?.safetyRating.lastDrillAt ? `Latihan terakhir ${new Date(profile.safetyRating.lastDrillAt).toLocaleDateString('id-ID')}` : 'Mulai dengan scan 45 detik untuk membuat peta keselamatan.'}</Text></Card>
    <Button label={profile?.locationStatus ? 'Mulai latihan 180 detik' : 'Scan ruangan 45 detik'} onPress={() => navigation.navigate(profile?.locationStatus ? 'Drill' : 'Scan')} />
    <Button label="Perbarui peta ruangan" variant="secondary" onPress={() => navigation.navigate('Scan')} />
    <Card><Text style={styles.cardLabel}>REWARD</Text><Text style={styles.cardValue}>{profile?.rewardEligibility.eligible ? 'Reward tersedia' : 'Tetap konsisten berlatih'}</Text><Text style={styles.cardBody}>Eligibility dan Safety Rating dihitung aman oleh server.</Text></Card>
  </ScrollView>;
}
const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: theme.colors.surfaceWarm }, content: { padding: 20, gap: 16 }, eyebrow: { color: theme.colors.accentEarth, fontWeight: '700', letterSpacing: 1.3, fontSize: 12 }, title: { color: theme.colors.primary900, fontSize: 31, lineHeight: 38, fontWeight: '700', marginTop: 6 }, score: { backgroundColor: theme.colors.primary900, borderRadius: 16, padding: 24 }, scoreLabel: { color: theme.colors.surfaceWarm, opacity: 0.72, fontSize: 12, fontWeight: '700', letterSpacing: 1 }, scoreRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 8 }, scoreValue: { color: theme.colors.textOnPrimary, fontSize: 56, fontWeight: '700' }, outOf: { color: theme.colors.surfaceWarm, fontSize: 16, marginLeft: 6 }, tier: { color: theme.colors.surfaceWarm, fontSize: 16, fontWeight: '600' }, cardLabel: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '700', letterSpacing: 0.8 }, cardValue: { color: theme.colors.primary900, fontSize: 19, fontWeight: '700', marginTop: 7 }, cardBody: { color: theme.colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 5 } });
