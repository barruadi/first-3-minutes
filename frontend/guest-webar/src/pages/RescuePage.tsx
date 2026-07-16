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
            className={`mt-2 px-7 py-3.5 bg-warm-beige text-navy rounded-full text-base font-bold min-h-[48px] ${busy ? 'cursor-wait opacity-70' : 'cursor-pointer'}`}
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
    <fieldset className="border-0 p-0 my-2">
      <legend className="text-[13px] opacity-80 mb-2 text-center w-full">Mode panduan</legend>
      <div className="flex gap-2 flex-wrap justify-center">
        {options.map((o) => (
          <label
            key={o.value}
            className={`px-3.5 py-2 rounded-full border text-[13px] cursor-pointer min-h-[36px] flex items-center ${
              mode === o.value
                ? 'border-warm-beige bg-warm-beige/20'
                : 'border-warm-beige/40 bg-transparent'
            }`}
          >
            <input
              type="radio"
              name="accessibility-mode"
              value={o.value}
              checked={mode === o.value}
              onChange={() => onChange(o.value)}
              className="absolute opacity-0 w-0 h-0"
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-navy p-6 gap-4 text-warm-beige">
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <div className="w-10 h-10 rounded-full border-[3px] border-warm-beige/30 border-t-warm-beige animate-spin" />
  );
}

function Icon({ children }: { children: React.ReactNode }) {
  return <div className="text-5xl">{children}</div>;
}

function Text({ children }: { children: React.ReactNode }) {
  return <div className="font-semibold text-lg text-center">{children}</div>;
}

function Sub({ children }: { children: React.ReactNode }) {
  return <div className="text-sm opacity-70 text-center max-w-xs">{children}</div>;
}
