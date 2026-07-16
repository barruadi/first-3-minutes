import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { GuestRoute } from '@3minutes/contracts';
import { resolveGuestToken } from '../services/guestApi.js';
import ArScene from '../scenes/ArScene.js';

type PageState =
  | { status: 'loading' }
  | { status: 'invalid_token' }
  | { status: 'network_error' }
  | { status: 'camera_required' }
  | { status: 'camera_denied' }
  | { status: 'unsupported_browser' }
  | { status: 'ready'; route: GuestRoute };

function checkBrowserSupport(): boolean {
  return !!(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function');
}

export default function RescuePage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<PageState>({ status: 'loading' });

  useEffect(() => {
    if (!checkBrowserSupport()) {
      setState({ status: 'unsupported_browser' });
      return;
    }

    async function init() {
      if (!token) { setState({ status: 'invalid_token' }); return; }

      let route: GuestRoute;
      try {
        route = await resolveGuestToken(token);
      } catch (e: unknown) {
        const code = (e as { code?: string }).code;
        if (code === 'INVALID_TOKEN') {
          setState({ status: 'invalid_token' });
        } else {
          setState({ status: 'network_error' });
        }
        return;
      }

      setState({ status: 'camera_required', ...({ _route: route } as unknown as object) });
      try {
        await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        setState({ status: 'ready', route });
      } catch {
        setState({ status: 'camera_denied' });
      }
    }

    void init();
  }, [token]);

  if (state.status === 'loading') return <Screen bg="#0A2947"><Spinner /><Text>Memuat panduan evakuasi...</Text></Screen>;
  if (state.status === 'invalid_token') return <Screen bg="#0A2947"><Icon>⚠️</Icon><Text>Token tidak valid atau sudah kedaluwarsa.</Text><Sub>Pindai ulang QR code atau minta token baru dari petugas.</Sub></Screen>;
  if (state.status === 'network_error') return <Screen bg="#0A2947"><Icon>📡</Icon><Text>Layanan tidak dapat dijangkau.</Text><Sub>Periksa koneksi internet Anda dan coba lagi.</Sub></Screen>;
  if (state.status === 'unsupported_browser') return <Screen bg="#0A2947"><Icon>🌐</Icon><Text>Browser tidak didukung.</Text><Sub>Gunakan Safari (iOS) atau Chrome terbaru.</Sub></Screen>;
  if (state.status === 'camera_required') return <Screen bg="#0A2947"><Icon>📷</Icon><Text>Meminta akses kamera...</Text></Screen>;
  if (state.status === 'camera_denied') return <Screen bg="#0A2947"><Icon>🚫</Icon><Text>Akses kamera ditolak.</Text><Sub>Izinkan akses kamera di pengaturan browser Anda, lalu muat ulang halaman.</Sub></Screen>;

  return <ArScene route={state.route} />;
}

function Screen({ bg, children }: { bg: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: bg, padding: 24, gap: 16, color: '#F3E4C9',
    }}>
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <div style={{
      width: 40, height: 40,
      border: '3px solid rgba(243,228,201,0.3)',
      borderTopColor: '#F3E4C9',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    }} />
  );
}

function Icon({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 48 }}>{children}</div>;
}

function Text({ children }: { children: React.ReactNode }) {
  return <div style={{ fontWeight: 600, fontSize: 18, textAlign: 'center' }}>{children}</div>;
}

function Sub({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 14, opacity: 0.7, textAlign: 'center', maxWidth: 320 }}>{children}</div>;
}
