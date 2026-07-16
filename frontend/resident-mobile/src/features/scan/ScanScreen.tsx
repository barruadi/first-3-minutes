import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

// Domain 1 ownership: scan pipeline implementation
// Full 45-second recording, frame sampler, compression, upload: TODO Domain 1

export default function ScanScreen() {
  const [status, setStatus] = useState<'idle' | 'recording' | 'processing' | 'done'>('idle');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scan Ruangan</Text>
      <Text style={styles.description}>
        Rekam ruangan selama 45 detik untuk membuat peta spasial personal Anda.
      </Text>

      <View style={styles.placeholder}>
        <Text style={styles.placeholderIcon}>📷</Text>
        <Text style={styles.placeholderText}>Preview kamera akan muncul di sini</Text>
        <Text style={styles.placeholderSub}>[Implementasi Domain 1: video capture, frame sampler, compression]</Text>
      </View>

      {status === 'idle' && (
        <TouchableOpacity style={styles.button} onPress={() => setStatus('recording')}>
          <Text style={styles.buttonText}>Mulai Scan (45 detik)</Text>
        </TouchableOpacity>
      )}
      {status === 'recording' && (
        <View style={styles.recordingIndicator}>
          <Text style={styles.recordingText}>● Merekam...</Text>
        </View>
      )}
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
  button: {
    backgroundColor: '#F3E4C9',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  buttonText: { color: '#0A2947', fontSize: 16, fontWeight: '700' },
  recordingIndicator: { backgroundColor: 'rgba(217,48,37,0.15)', borderRadius: 12, padding: 16, alignItems: 'center' },
  recordingText: { color: '#D93025', fontSize: 16, fontWeight: '600' },
});
