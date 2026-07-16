import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Accelerometer, Gyroscope, LightSensor } from 'expo-sensors';
import { checkSensorAvailability } from '../../services/permissions';

// Domain 2 test harness for probing sensor capability on device

interface SensorReading {
  x?: number;
  y?: number;
  z?: number;
  illuminance?: number;
  timestamp: number;
}

export default function SensorTestHarness() {
  const [availability, setAvailability] = useState<Awaited<ReturnType<typeof checkSensorAvailability>> | null>(null);
  const [accel, setAccel] = useState<SensorReading | null>(null);
  const [gyro, setGyro] = useState<SensorReading | null>(null);
  const [light, setLight] = useState<SensorReading | null>(null);

  useEffect(() => {
    void checkSensorAvailability().then(setAvailability);

    const accelSub = Accelerometer.addListener((d) => setAccel({ ...d, timestamp: Date.now() }));
    const gyroSub = Gyroscope.addListener((d) => setGyro({ ...d, timestamp: Date.now() }));
    let lightSub: { remove: () => void } | null = null;
    LightSensor.isAvailableAsync()
      .then((avail) => {
        if (avail) {
          lightSub = LightSensor.addListener((d) => setLight({ illuminance: d.illuminance, timestamp: Date.now() }));
        }
      })
      .catch(() => {});

    Accelerometer.setUpdateInterval(100);
    Gyroscope.setUpdateInterval(100);

    return () => {
      accelSub.remove();
      gyroSub.remove();
      lightSub?.remove();
    };
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Sensor Test Harness</Text>
      <Text style={styles.sub}>(Domain 2 diagnostic tool)</Text>

      {availability && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ketersediaan Sensor</Text>
          <Row label="Accelerometer" value={availability.accelerometer ? 'TERSEDIA' : 'TIDAK TERSEDIA'} ok={availability.accelerometer} />
          <Row label="Gyroscope" value={availability.gyroscope ? 'TERSEDIA' : 'TIDAK TERSEDIA'} ok={availability.gyroscope} />
          <Row label="Light Sensor" value={availability.lightSensor ? 'TERSEDIA' : 'TIDAK TERSEDIA'} ok={availability.lightSensor} />
        </View>
      )}

      {accel && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Accelerometer (m/s²)</Text>
          <Row label="X" value={accel.x?.toFixed(3) ?? '—'} />
          <Row label="Y" value={accel.y?.toFixed(3) ?? '—'} />
          <Row label="Z" value={accel.z?.toFixed(3) ?? '—'} />
        </View>
      )}

      {gyro && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Gyroscope (rad/s)</Text>
          <Row label="X" value={gyro.x?.toFixed(3) ?? '—'} />
          <Row label="Y" value={gyro.y?.toFixed(3) ?? '—'} />
          <Row label="Z" value={gyro.z?.toFixed(3) ?? '—'} />
        </View>
      )}

      {light && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Light Sensor (lux)</Text>
          <Row label="Illuminance" value={light.illuminance?.toFixed(1) ?? '—'} />
        </View>
      )}
    </ScrollView>
  );
}

function Row({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  const color = ok === undefined ? '#F3E4C9' : ok ? '#39ff14' : '#D93025';
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
      <Text style={{ color: 'rgba(243,228,201,0.7)', fontSize: 13 }}>{label}</Text>
      <Text style={{ color, fontSize: 13, fontWeight: '600' }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A2947' },
  content: { padding: 20, gap: 16 },
  title: { color: '#F3E4C9', fontSize: 20, fontWeight: '700' },
  sub: { color: 'rgba(243,228,201,0.5)', fontSize: 12 },
  card: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: 16, gap: 2 },
  cardTitle: { color: '#F3E4C9', fontSize: 13, fontWeight: '600', marginBottom: 8 },
});
