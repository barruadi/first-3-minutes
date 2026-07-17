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

    // iOS 13+: sensor permissions MUST be requested from a user-gesture handler.
    // Calling requestPermission() here (button click) grants it; subsequent calls
    // inside useEffect/hooks will return 'granted' immediately without a dialog.
    const anyDOE = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<PermissionState> };
    if (typeof anyDOE.requestPermission === 'function') {
      try { await anyDOE.requestPermission(); } catch { /* ignore — degrade silently */ }
    }
    const anyDME = DeviceMotionEvent as unknown as { requestPermission?: () => Promise<PermissionState> };
    if (typeof anyDME.requestPermission === 'function') {
      try { await anyDME.requestPermission(); } catch { /* ignore — degrade silently */ }
    }

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
          <Icon>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-label="Warning">
              <path d="M24 4L44 42H4L24 4Z" fill="#F59E0B" />
              <rect x="22" y="18" width="4" height="14" rx="2" fill="#1a1a1a" />
              <rect x="22" y="35" width="4" height="4" rx="2" fill="#1a1a1a" />
            </svg>
          </Icon>
          <Text>Kode QR tidak berlaku.</Text>
          <Sub>Pindai ulang kode QR di lokasi, atau hubungi petugas gedung.</Sub>
        </Screen>
      );

    case 'api_error':
      return (
        <Screen>
          <Icon>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-label="Network error">
              <circle cx="24" cy="24" r="20" stroke="#60A5FA" strokeWidth="3" fill="none" />
              <path d="M16 32 Q24 16 32 32" stroke="#60A5FA" strokeWidth="2.5" fill="none" />
              <path d="M12 24 Q24 8 36 24" stroke="#60A5FA" strokeWidth="2.5" fill="none" />
              <circle cx="24" cy="36" r="2.5" fill="#60A5FA" />
            </svg>
          </Icon>
          <Text>{state.message}</Text>
          <Sub>Periksa koneksi Anda lalu muat ulang halaman.</Sub>
        </Screen>
      );

    case 'unsupported':
      return (
        <Screen>
          <Icon>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-label="Not supported">
              <rect x="6" y="10" width="36" height="26" rx="3" stroke="#60A5FA" strokeWidth="3" fill="none" />
              <line x1="16" y1="38" x2="32" y2="38" stroke="#60A5FA" strokeWidth="3" strokeLinecap="round" />
              <line x1="24" y1="36" x2="24" y2="42" stroke="#60A5FA" strokeWidth="3" strokeLinecap="round" />
              <line x1="10" y1="14" x2="38" y2="34" stroke="#F87171" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </Icon>
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
          <Icon>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-label="Camera denied">
              <circle cx="24" cy="24" r="20" stroke="#F87171" strokeWidth="3" fill="none" />
              <line x1="14" y1="14" x2="34" y2="34" stroke="#F87171" strokeWidth="3" strokeLinecap="round" />
              <line x1="34" y1="14" x2="14" y2="34" stroke="#F87171" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </Icon>
          <Text>Akses kamera ditolak.</Text>
          <Sub>Izinkan kamera pada pengaturan browser, lalu muat ulang halaman.</Sub>
        </Screen>
      );

    case 'awaiting_gesture':
    case 'requesting_camera': {
      const busy = state.status === 'requesting_camera';
      return (
        <Screen>
          <Icon>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-label="Camera">
              <rect x="4" y="14" width="32" height="24" rx="4" stroke="#F3E4C9" strokeWidth="3" fill="none" />
              <circle cx="20" cy="26" r="7" stroke="#F3E4C9" strokeWidth="2.5" fill="none" />
              <circle cx="20" cy="26" r="3" fill="#F3E4C9" />
              <path d="M36 20 L44 16 L44 36 L36 32" stroke="#F3E4C9" strokeWidth="2.5" strokeLinejoin="round" fill="none" />
              <rect x="10" y="10" width="8" height="5" rx="2" fill="#F3E4C9" />
            </svg>
          </Icon>
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
  return <div className="flex items-center justify-center">{children}</div>;
}

function Text({ children }: { children: React.ReactNode }) {
  return <div className="font-semibold text-lg text-center">{children}</div>;
}

function Sub({ children }: { children: React.ReactNode }) {
  return <div className="text-sm opacity-70 text-center max-w-xs">{children}</div>;
}
