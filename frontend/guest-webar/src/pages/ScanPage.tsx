import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import jsQR from 'jsqr';
import { fetchAnchor, AnchorApiError } from '../services/anchorApi.js';
import type { AnchorData } from '../services/anchorApi.js';

const C = {
  navy: '#0A2947',
  cream: '#F3E4C9',
  white: '#FFFFFF',
  safetyGreen: '#39FF14',
  overlayBg: 'rgba(10, 41, 71, 0.90)',
  textMuted: 'rgba(243, 228, 201, 0.65)',
};

type ScanState =
  | { status: 'requesting_camera' }
  | { status: 'camera_denied' }
  | { status: 'scanning' }
  | { status: 'fetching'; anchorId: string }
  | { status: 'error'; message: string }
  | { status: 'done'; data: AnchorData };

const ANCHOR_QR_PATTERN = /^anchor:(.+)$/;

export default function ScanPage() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const [state, setState] = useState<ScanState>({ status: 'requesting_camera' });

  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) { video.srcObject = stream; await video.play(); }
        setState({ status: 'scanning' });
      } catch {
        if (!cancelled) setState({ status: 'camera_denied' });
      }
    }

    void startCamera();
    return () => { cancelled = true; stopCamera(); };
  }, []);

  function stopCamera() {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  const scanLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(scanLoop);
      return;
    }
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (w === 0 || h === 0) { rafRef.current = requestAnimationFrame(scanLoop); return; }
    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(video, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);
    const result = jsQR(imageData.data, w, h, { inversionAttempts: 'dontInvert' });
    if (result) {
      const match = ANCHOR_QR_PATTERN.exec(result.data);
      if (match && match[1]) {
        cancelAnimationFrame(rafRef.current);
        stopCamera();
        setState({ status: 'fetching', anchorId: match[1] });
        return;
      }
    }
    rafRef.current = requestAnimationFrame(scanLoop);
  }, []);

  useEffect(() => {
    if (state.status === 'scanning') {
      rafRef.current = requestAnimationFrame(scanLoop);
      return () => cancelAnimationFrame(rafRef.current);
    }
  }, [state.status, scanLoop]);

  useEffect(() => {
    if (state.status !== 'fetching') return;
    const controller = new AbortController();
    void (async () => {
      try {
        const data = await fetchAnchor(state.anchorId, controller.signal);
        if (controller.signal.aborted) return;
        setState({ status: 'done', data });
      } catch (e) {
        if (controller.signal.aborted) return;
        setState({ status: 'error', message: e instanceof AnchorApiError ? e.message : 'Failed to load anchor data.' });
      }
    })();
    return () => controller.abort();
  }, [state]);

  useEffect(() => {
    if (state.status === 'done') {
      sessionStorage.setItem('anchorData', JSON.stringify(state.data));
      navigate('/map', { replace: true });
    }
  }, [state, navigate]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: state.status === 'scanning' ? 1 : 0.25,
        }}
      />

      {/* Back button */}
      <button
        onClick={() => { stopCamera(); navigate('/'); }}
        style={{
          position: 'absolute',
          top: 20,
          left: 16,
          background: 'rgba(255,255,255,0.15)',
          border: '1px solid rgba(255,255,255,0.35)',
          backdropFilter: 'blur(8px)',
          borderRadius: 10,
          color: C.white,
          fontSize: 14,
          fontWeight: 600,
          padding: '8px 16px',
          cursor: 'pointer',
          zIndex: 10,
        }}
      >
        ← Back
      </button>

      {state.status === 'requesting_camera' && (
        <Overlay>
          <Spinner />
          <p style={labelStyle}>Requesting camera access...</p>
        </Overlay>
      )}

      {state.status === 'camera_denied' && (
        <Overlay>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            border: `2px solid ${C.cream}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, color: C.cream, flexShrink: 0,
          }}>
            X
          </div>
          <p style={labelStyle}>Camera access denied</p>
          <p style={subStyle}>Enable camera in your browser settings, then reload the page.</p>
          <ActionButton onClick={() => navigate('/')}>Go Back</ActionButton>
        </Overlay>
      )}

      {state.status === 'scanning' && (
        <>
          <div style={{ position: 'relative', width: 240, height: 240, zIndex: 5 }}>
            <CornerBracket top left />
            <CornerBracket top left={false} />
            <CornerBracket top={false} left />
            <CornerBracket top={false} left={false} />
          </div>
          <div style={{ position: 'absolute', bottom: 80, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
            <div style={{
              background: 'rgba(0,0,0,0.65)',
              borderRadius: 20,
              padding: '10px 20px',
              color: C.white,
              fontSize: 14,
              textAlign: 'center',
            }}>
              Point camera at the QR code
            </div>
          </div>
        </>
      )}

      {state.status === 'fetching' && (
        <Overlay>
          <Spinner />
          <p style={labelStyle}>Loading evacuation route...</p>
        </Overlay>
      )}

      {state.status === 'error' && (
        <Overlay>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            border: `2px solid #F3A020`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, color: '#F3A020', flexShrink: 0, fontWeight: 700,
          }}>
            !
          </div>
          <p style={labelStyle}>Error</p>
          <p style={subStyle}>{state.message}</p>
          <ActionButton onClick={() => { stopCamera(); navigate('/scan', { replace: true }); }}>
            Try Again
          </ActionButton>
          <ActionButton onClick={() => navigate('/')}>Go Home</ActionButton>
        </Overlay>
      )}
    </div>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      position: 'relative',
      zIndex: 10,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 16,
      background: C.overlayBg,
      borderRadius: 20,
      padding: '32px 28px',
      maxWidth: 300,
      textAlign: 'center',
      backdropFilter: 'blur(12px)',
    }}>
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <div style={{
      width: 40,
      height: 40,
      borderRadius: '50%',
      border: `3px solid rgba(57,255,20,0.25)`,
      borderTop: `3px solid ${C.safetyGreen}`,
      animation: 'spin 0.8s linear infinite',
    }} />
  );
}

function ActionButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'transparent',
        border: `1px solid rgba(255,255,255,0.5)`,
        borderRadius: 10,
        color: C.white,
        fontSize: 14,
        fontWeight: 600,
        padding: '10px 20px',
        cursor: 'pointer',
        minHeight: 44,
      }}
    >
      {children}
    </button>
  );
}

const labelStyle: React.CSSProperties = {
  margin: 0,
  color: C.cream,
  fontSize: 16,
  fontWeight: 600,
};

const subStyle: React.CSSProperties = {
  margin: 0,
  color: C.textMuted,
  fontSize: 13,
  lineHeight: 1.5,
};

function CornerBracket({ top, left }: { top: boolean; left: boolean }) {
  const size = 24;
  const thickness = 3;
  const color = C.safetyGreen;
  return (
    <div style={{
      position: 'absolute',
      top: top ? 0 : undefined,
      bottom: top ? undefined : 0,
      left: left ? 0 : undefined,
      right: left ? undefined : 0,
      width: size,
      height: size,
      borderTop: top ? `${thickness}px solid ${color}` : 'none',
      borderBottom: top ? 'none' : `${thickness}px solid ${color}`,
      borderLeft: left ? `${thickness}px solid ${color}` : 'none',
      borderRight: left ? 'none' : `${thickness}px solid ${color}`,
      borderTopLeftRadius: top && left ? 4 : 0,
      borderTopRightRadius: top && !left ? 4 : 0,
      borderBottomLeftRadius: !top && left ? 4 : 0,
      borderBottomRightRadius: !top && !left ? 4 : 0,
    }} />
  );
}
