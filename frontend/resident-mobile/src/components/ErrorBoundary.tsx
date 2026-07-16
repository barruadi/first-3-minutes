import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error?: Error; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.icon}>⚠️</Text>
          <Text style={styles.title}>Terjadi kesalahan</Text>
          <Text style={styles.message}>{this.state.error?.message ?? 'Unknown error'}</Text>
          <TouchableOpacity style={styles.button} onPress={() => this.setState({ hasError: false })}>
            <Text style={styles.buttonText}>Coba lagi</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A2947', padding: 24, gap: 16 },
  icon: { fontSize: 48 },
  title: { color: '#F3E4C9', fontSize: 18, fontWeight: '700' },
  message: { color: 'rgba(243,228,201,0.7)', fontSize: 13, textAlign: 'center' },
  button: { backgroundColor: '#F3E4C9', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8, marginTop: 8 },
  buttonText: { color: '#0A2947', fontWeight: '600' },
});
