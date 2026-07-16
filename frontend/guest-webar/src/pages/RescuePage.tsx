import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { AccessibilityMode, GuestRoute } from '@3minutes/contracts';
import { resolveGuestToken, GuestApiError } from '../services/guestApi.js';
import { markSceneOperational, MARK_LANDING } from '../services/performance.js';
import ArScene from '../scenes/ArScene.js';

/**
 * State machine Guest (D4-GUEST-STATE-MACHINE).
 * Invalid token TIDAK PERNAH masuk scene aktif.
 */
type GuestState =
  | { status: 'resolving_token' }
  | { status: 'invalid_token' }
  | { status: 'api_error'; message: string }
  | { status: 'unsupported' }
  | { status: 'awaiting_gesture'; route: GuestRoute }
  | { status: 'requesting_camera'; route: GuestRoute }
  | { status: 'camera_denied' }
  | { status: 'active'; route: GuestRoute; stream: MediaStream };

/** Kamera hanya tersedia pada secure context (HTTPS atau localhost). */
function isSupported(): boolean {
  if (typeof navigator === 'undefined') return false;
  if (!window.isSecureContext) return false;
  return typeof navigator.mediaDevices?.getUserMedia === 'function';
}

export default function RescuePage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<GuestState>({ status: 'resolving_token' });
  const [mode, setMode] = useState<AccessibilityMode>('VISUAL_AND_AUDIO');
  const abortRef = useRef<AbortController | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Resolve token lebih dulu; jangan meminta kamera untuk token yang invalid.
  useEffect(() => {
    if (!isSupported()) {
      setState({ status: 'unsupported' });
      return;
    }
    if (!token) {
      setState({ status: 'invalid_token' });
      return;
    }

    performance.mark(MARK_LANDING);
    const controller = new AbortController();
    abortRef.current = controller;

    void (async () => {
      try {
        const route = await resolveGuestToken(token, controller.signal);
        if (controller.signal.aborted) return;
        setState({ status: 'awaiting_gesture', route });
      } catch (e) {
        if (controller.signal.aborted) return;
        if (e instanceof GuestApiError && e.code === 'QR_TOKEN_INVALID') {
          setState({ status: 'invalid_token' });
        } else {
          setState({
            status: 'api_error',
            message: e instanceof Error ? e.message : 'Layanan tidak tersedia.',
          });
        }
      }
    })();

    return () => controller.abort();
  }, [token]);

  // Stream dilepas saat unmount — indikator kamera akan tetap menyala tanpa ini.
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  /**
   * getUserMedia HARUS dipicu gesture pengguna. iOS Safari menolak permintaan
   * kamera yang dijalankan langsung dari useEffect saat load.
   */
  const requestCamera = useCallback(async () => {
    if (state.status !== 'awaiting_gesture') return;
    const { route } = state;
    setState({ status: 'requesting_camera', route });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      setState({ status: 'active', route, stream });
    } catch {
      setState({ status: 'camera_denied' });
    }
  }, [state]);

  switch (state.status) {
    case 'resolving_token':
      return (
        <Screen>
          <Spinner />
          <Text>Memuat panduan evakuasi...</Text>
        </Screen>
      );

    case 'invalid_token':
      return (
        <Screen>
          <Icon>⚠️</Icon>
          <Text>Kode QR tidak berlaku.</Text>
          <Sub>Pindai ulang kode QR di lokasi, atau hubungi petugas gedung.</Sub>
        </Screen>
      );

    case 'api_error':
      return (
        <Screen>
          <Icon>📡</Icon>
          <Text>{state.message}</Text>
          <Sub>Periksa koneksi Anda lalu muat ulang halaman.</Sub>
        </Screen>
      );

    case 'unsupported':
      return (
        <Screen>
          <Icon>🌐</Icon>
          <Text>Browser tidak didukung.</Text>
          <Sub>
            Panduan kamera membutuhkan koneksi aman (HTTPS). Gunakan Safari (iOS) atau Chrome
            terbaru.
          </Sub>
        </Screen>
      );

    case 'camera_denied':
      return (
        <Screen>
          <Icon>🚫</Icon>
          <Text>Akses kamera ditolak.</Text>
          <Sub>Izinkan kamera pada pengaturan browser, lalu muat ulang halaman.</Sub>
        </Screen>
      );

    case 'awaiting_gesture':
    case 'requesting_camera': {
      const busy = state.status === 'requesting_camera';
      return (
        <Screen>
          <Icon>📷</Icon>
          <Text>Panduan evakuasi siap</Text>
          <Sub>Arahkan kamera ke sekeliling Anda untuk melihat rute menuju pintu keluar.</Sub>

          <ModeSelector mode={mode} onChange={setMode} />

          <button
            onClick={() => void requestCamera()}
            disabled={busy}
            style={{
              marginTop: 8,
              padding: '14px 28px',
              background: '#F3E4C9',
              color: '#0A2947',
              border: 'none',
              borderRadius: 999,
              fontSize: 16,
              fontWeight: 700,
              cursor: busy ? 'wait' : 'pointer',
              minHeight: 48,
            }}
          >
            {busy ? 'Meminta akses kamera...' : 'Mulai panduan'}
          </button>
        </Screen>
      );
    }

    case 'active':
      return (
        <ArScene
          route={state.route}
          stream={state.stream}
          mode={mode}
          onModeChange={setMode}
          onSceneReady={markSceneOperational}
        />
      );
  }
}

function ModeSelector({
  mode,
  onChange,
}: {
  mode: AccessibilityMode;
  onChange: (m: AccessibilityMode) => void;
}) {
  const options: { value: AccessibilityMode; label: string }[] = [
    { value: 'VISUAL_ONLY', label: 'Visual saja' },
    { value: 'VISUAL_AND_AUDIO', label: 'Visual + suara' },
    { value: 'AUDIO_PRIMARY', label: 'Suara utama' },
  ];
  return (
    <fieldset style={{ border: 'none', padding: 0, margin: '8px 0' }}>
      <legend style={{ fontSize: 13, opacity: 0.8, marginBottom: 8, textAlign: 'center' }}>
        Mode panduan
      </legend>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        {options.map((o) => (
          <label
            key={o.value}
            style={{
              padding: '8px 14px',
              borderRadius: 999,
              border: `1px solid ${mode === o.value ? '#F3E4C9' : 'rgba(243,228,201,0.4)'}`,
              background: mode === o.value ? 'rgba(243,228,201,0.18)' : 'transparent',
              fontSize: 13,
              cursor: 'pointer',
              minHeight: 36,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <input
              type="radio"
              name="accessibility-mode"
              value={o.value}
              checked={mode === o.value}
              onChange={() => onChange(o.value)}
              style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#0A2947',
        padding: 24,
        gap: 16,
        color: '#F3E4C9',
      }}
    >
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <div
      style={{
        width: 40,
        height: 40,
        border: '3px solid rgba(243,228,201,0.3)',
        borderTopColor: '#F3E4C9',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }}
    />
  );
}

function Icon({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 48 }}>{children}</div>;
}

function Text({ children }: { children: React.ReactNode }) {
  return <div style={{ fontWeight: 600, fontSize: 18, textAlign: 'center' }}>{children}</div>;
}

function Sub({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 14, opacity: 0.7, textAlign: 'center', maxWidth: 320 }}>{children}</div>
  );
}
