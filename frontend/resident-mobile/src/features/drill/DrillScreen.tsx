import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

// Domain 2 ownership: drill state machine, AR rendering, sensor adapters, shelter validation, QTE
// This is the integration surface for Domain 2.

export default function DrillScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Latihan Evakuasi AR</Text>
      <Text style={styles.description}>
        Latihan Drop–Cover–Hold dan evakuasi dalam ruangan nyata Anda menggunakan Augmented Reality.
      </Text>

      <View style={styles.placeholder}>
        <Text style={styles.placeholderIcon}>🛡️</Text>
        <Text style={styles.placeholderText}>AR Drill Scene</Text>
        <Text style={styles.placeholderSub}>
          [Domain 2: Drill state machine, ARKit sensor fusion, shelter validator, smoke overlay, posture monitor, QTE]
        </Text>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>Scan ruangan terlebih dahulu untuk mendapatkan SpatialMap sebelum memulai latihan.</Text>
      </View>

      <TouchableOpacity style={styles.button} disabled>
        <Text style={styles.buttonText}>Mulai Latihan (Belum tersedia)</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A2947', padding: 20, gap: 16 },
  title: { color: '#F3E4C9', fontSize: 22, fontWeight: '700', marginTop: 8 },
  description: { color: 'rgba(243,228,201,0.7)', fontSize: 14, lineHeight: 20 },
  placeholder: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(243,228,201,0.15)',
  },
  placeholderIcon: { fontSize: 48 },
  placeholderText: { color: 'rgba(243,228,201,0.6)', fontSize: 14 },
  placeholderSub: { color: 'rgba(243,228,201,0.4)', fontSize: 11, textAlign: 'center', paddingHorizontal: 20 },
  infoBox: {
    backgroundColor: 'rgba(243,228,201,0.1)',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#F3E4C9',
  },
  infoText: { color: 'rgba(243,228,201,0.8)', fontSize: 13 },
  button: {
    backgroundColor: 'rgba(243,228,201,0.3)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  buttonText: { color: 'rgba(243,228,201,0.5)', fontSize: 16, fontWeight: '700' },
});
