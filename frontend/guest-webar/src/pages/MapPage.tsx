import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AnchorData, AnchorSummary } from '../services/anchorApi.js';

// Canvas constants
const CANVAS_SIZE = 512;
const PADDING_FRACTION = 0.1;
const DOT_RADIUS = 10;
const LABEL_FONT = '700 12px system-ui, sans-serif';

// Safety colors (canvas is safety context)
const COLOR_CURRENT = '#39FF14';
const COLOR_EXIT = '#00E5FF';
const COLOR_OTHER = '#888';
const COLOR_LINE = '#FF3B30';
const COLOR_CANVAS_BG = '#0A2947';

// Brand colors for UI chrome
const C = {
  navy: '#0A2947',
  navyLight: '#0E3560',
  cream: '#F3E4C9',
  earth: '#8B5E3C',
  textSec: 'rgba(243, 228, 201, 0.6)',
  safetyGreen: '#39FF14',
  white: '#FFFFFF',
};

type Screen = 'map' | 'ar';

interface AnchorPixel extends AnchorSummary {
  px: number;
  py: number;
}

function buildPixelCoords(anchors: AnchorSummary[]): AnchorPixel[] {
  if (anchors.length === 0) return [];
  const xs = anchors.map((a) => a.posX);
  const zs = anchors.map((a) => a.posZ);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);
  const rangeX = maxX - minX || 1;
  const rangeZ = maxZ - minZ || 1;
  const innerSize = CANVAS_SIZE * (1 - 2 * PADDING_FRACTION);
  const offsetX = CANVAS_SIZE * PADDING_FRACTION;
  const offsetZ = CANVAS_SIZE * PADDING_FRACTION;
  return anchors.map((a) => ({
    ...a,
    px: offsetX + ((a.posX - minX) / rangeX) * innerSize,
    py: offsetZ + ((a.posZ - minZ) / rangeZ) * innerSize,
  }));
}

function drawMap(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement | null,
  pixelAnchors: AnchorPixel[],
  currentId: string,
  timerText: string
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = COLOR_CANVAS_BG;
  ctx.fillRect(0, 0, w, h);

  if (image) {
    ctx.globalAlpha = 0.85;
    ctx.drawImage(image, 0, 0, w, h);
    ctx.globalAlpha = 1;
  }

  const exitAnchor = pixelAnchors.find((a) => a.isExit);
  const currentAnchor = pixelAnchors.find((a) => a.id === currentId);

  if (currentAnchor && exitAnchor) {
    ctx.save();
    ctx.setLineDash([10, 6]);
    ctx.strokeStyle = COLOR_LINE;
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(currentAnchor.px, currentAnchor.py);
    ctx.lineTo(exitAnchor.px, exitAnchor.py);
    ctx.stroke();
    ctx.restore();
  }

  for (const a of pixelAnchors) {
    const isCurrent = a.id === currentId;
    const isExit = a.isExit;
    let color: string;
    let label: string;
    if (isCurrent) { color = COLOR_CURRENT; label = a.name; }
    else if (isExit) { color = COLOR_EXIT; label = 'EXIT'; }
    else { color = COLOR_OTHER; label = a.name; }

    if (isCurrent || isExit) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(a.px, a.py, DOT_RADIUS + 5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.2;
      ctx.fill();
      ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(a.px, a.py, DOT_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    if (isCurrent) {
      ctx.beginPath();
      ctx.arc(a.px, a.py, DOT_RADIUS + 3, 0, Math.PI * 2);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.font = LABEL_FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const textY = a.py + DOT_RADIUS + 5;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillText(label, a.px + 1, textY + 1);
    ctx.fillStyle = color;
    ctx.fillText(label, a.px, textY);
  }

  ctx.font = '700 18px "Courier New", monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillText(timerText, w - 11, 13);
  ctx.fillStyle = COLOR_CURRENT;
  ctx.fillText(timerText, w - 12, 12);
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function MapPage() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [anchorData, setAnchorData] = useState<AnchorData | null>(null);
  const [pixelAnchors, setPixelAnchors] = useState<AnchorPixel[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [screen, setScreen] = useState<Screen>('map');
  const [startTs] = useState(() => Date.now());

  useEffect(() => {
    const raw = sessionStorage.getItem('anchorData');
    if (!raw) { navigate('/', { replace: true }); return; }
    try {
      const data = JSON.parse(raw) as AnchorData;
      setAnchorData(data);
      const px = buildPixelCoords(data.anchors);
      setPixelAnchors(px);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => { imageRef.current = img; };
      const floorPlanSrc = data.floorPlanUrl ? data.floorPlanUrl.replace(/^https?:\/\/[^/]+/, '') : '';
      img.src = floorPlanSrc;
    } catch {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    timerRef.current = setInterval(() => { setElapsed((e) => e + 1); }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !anchorData) return;
    drawMap(canvas, imageRef.current, pixelAnchors, anchorData.id, formatTime(elapsed));
  }, [anchorData, pixelAnchors, elapsed]);

  useEffect(() => { redraw(); }, [redraw]);

  const handleReachedExit = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const durationSeconds = Math.floor((Date.now() - startTs) / 1000);
    if (anchorData) {
      sessionStorage.setItem('drillResult', JSON.stringify({ anchorId: anchorData.id, durationSeconds, completed: true }));
    }
    navigate('/complete', { replace: true });
  }, [anchorData, navigate, startTs]);

  if (!anchorData) {
    return (
      <div style={{
        minHeight: '100dvh',
        background: C.navy,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: C.cream,
        fontFamily: 'system-ui, sans-serif',
      }}>
        Loading map...
      </div>
    );
  }

  if (screen === 'ar') {
    return (
      <ArOverlay
        anchorData={anchorData}
        pixelAnchors={pixelAnchors}
        elapsed={elapsed}
        onBack={() => setScreen('map')}
        onReachedExit={handleReachedExit}
      />
    );
  }

  const exitAnchor = pixelAnchors.find((a) => a.isExit);
  const currentAnchor = pixelAnchors.find((a) => a.id === anchorData.id);
  let distanceM: number | null = null;
  if (currentAnchor && exitAnchor) {
    const dx = currentAnchor.posX - exitAnchor.posX;
    const dz = currentAnchor.posZ - exitAnchor.posZ;
    distanceM = Math.sqrt(dx * dx + dz * dz);
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: C.navy,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 16px',
        borderBottom: `1px solid rgba(243, 228, 201, 0.12)`,
        flexShrink: 0,
      }}>
        <button onClick={() => navigate('/')} style={navBtnStyle}>
          ← Home
        </button>
        <div style={{ fontSize: 15, fontWeight: 600, color: C.cream }}>Evacuation Map</div>
        <div style={{
          fontFamily: '"Courier New", monospace',
          fontSize: 22,
          fontWeight: 700,
          color: C.safetyGreen,
          letterSpacing: 1,
          minWidth: 64,
          textAlign: 'right',
        }}>
          {formatTime(elapsed)}
        </div>
      </div>

      {/* Location info */}
      <div style={{
        padding: '10px 16px',
        background: C.navyLight,
        borderBottom: `1px solid rgba(243, 228, 201, 0.08)`,
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 13, color: C.textSec }}>Your location</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.cream }}>{anchorData.name}</div>
        {distanceM !== null && (
          <div style={{ fontSize: 12, color: C.textSec, marginTop: 2 }}>
            {distanceM.toFixed(1)} m to exit
          </div>
        )}
      </div>

      {/* Canvas map */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12, minHeight: 0 }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          style={{
            width: '100%',
            maxWidth: 480,
            aspectRatio: '1 / 1',
            borderRadius: 12,
            border: `1px solid rgba(243, 228, 201, 0.15)`,
            display: 'block',
          }}
        />
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, padding: '8px 16px', justifyContent: 'center', flexShrink: 0 }}>
        <LegendItem color={COLOR_CURRENT} label="You" />
        <LegendItem color={COLOR_EXIT} label="Exit" />
        <LegendItem color={COLOR_OTHER} label="Others" />
        <LegendItem color={COLOR_LINE} label="Route" dashed />
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 12, padding: '12px 16px 28px', flexShrink: 0 }}>
        <button
          onClick={() => setScreen('ar')}
          style={{
            flex: 1,
            background: 'transparent',
            border: `1.5px solid rgba(243, 228, 201, 0.5)`,
            borderRadius: 14,
            color: C.cream,
            fontSize: 15,
            fontWeight: 700,
            minHeight: 52,
            cursor: 'pointer',
          }}
        >
          View AR
        </button>
        <button
          onClick={handleReachedExit}
          style={{
            flex: 2,
            background: C.safetyGreen,
            border: 'none',
            borderRadius: 14,
            color: '#0A1A0E',
            fontSize: 15,
            fontWeight: 700,
            minHeight: 52,
            cursor: 'pointer',
          }}
        >
          Reached Exit!
        </button>
      </div>
    </div>
  );
}

function LegendItem({ color, label, dashed = false }: { color: string; label: string; dashed?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      {dashed ? (
        <div style={{ width: 20, height: 3, borderTop: `2px dashed ${color}` }} />
      ) : (
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
      )}
      <span style={{ fontSize: 11, color: 'rgba(243, 228, 201, 0.65)' }}>{label}</span>
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'rgba(243, 228, 201, 0.7)',
  fontSize: 14,
  cursor: 'pointer',
  padding: '4px 0',
};

// ---------- AR Overlay ----------
interface ArOverlayProps {
  anchorData: AnchorData;
  pixelAnchors: AnchorPixel[];
  elapsed: number;
  onBack: () => void;
  onReachedExit: () => void;
}

function ArOverlay({ anchorData, pixelAnchors, elapsed, onBack, onReachedExit }: ArOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const headingRef = useRef(0);
  const [arState, setArState] = useState<'requesting' | 'active' | 'unavailable'>('requesting');
  const [arrowAngle, setArrowAngle] = useState<number | null>(null);
  const [distanceM, setDistanceM] = useState<number | null>(null);

  useEffect(() => {
    const current = pixelAnchors.find((a) => a.id === anchorData.id);
    const exit = pixelAnchors.find((a) => a.isExit);
    if (current && exit) {
      const dx = current.posX - exit.posX;
      const dz = current.posZ - exit.posZ;
      setDistanceM(Math.sqrt(dx * dx + dz * dz));
    }
  }, [anchorData.id, pixelAnchors]);

  useEffect(() => {
    let cancelled = false;
    async function startAr() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) { video.srcObject = stream; await video.play(); }
        setArState('active');
      } catch {
        if (!cancelled) setArState('unavailable');
      }
    }
    void startAr();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    function handleOrientation(e: DeviceOrientationEvent) {
      const webkit = (e as unknown as { webkitCompassHeading?: number }).webkitCompassHeading;
      if (typeof webkit === 'number') headingRef.current = webkit;
      else if (typeof e.alpha === 'number') headingRef.current = 360 - e.alpha;
      const current = pixelAnchors.find((a) => a.id === anchorData.id);
      const exit = pixelAnchors.find((a) => a.isExit);
      if (current && exit) {
        const bearing = Math.atan2(exit.posX - current.posX, -(exit.posZ - current.posZ)) * (180 / Math.PI);
        let rel = bearing - headingRef.current;
        while (rel > 180) rel -= 360;
        while (rel < -180) rel += 360;
        setArrowAngle(rel);
      }
    }
    async function setupOrientation() {
      const doe = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<PermissionState> };
      if (typeof doe.requestPermission === 'function') {
        try {
          const res = await doe.requestPermission();
          if (cancelled || res !== 'granted') return;
        } catch { return; }
      }
      if (!cancelled) window.addEventListener('deviceorientation', handleOrientation, true);
    }
    void setupOrientation();
    return () => { cancelled = true; window.removeEventListener('deviceorientation', handleOrientation, true); };
  }, [anchorData.id, pixelAnchors]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif' }}>
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover', opacity: arState === 'active' ? 1 : 0.3,
        }}
      />

      <button
        onClick={onBack}
        style={{
          position: 'absolute', top: 20, left: 16,
          background: 'rgba(255,255,255,0.15)',
          border: '1px solid rgba(255,255,255,0.35)',
          backdropFilter: 'blur(8px)',
          borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 600,
          padding: '8px 16px', cursor: 'pointer', zIndex: 10,
        }}
      >
        ← Map
      </button>

      <div style={{
        position: 'absolute', top: 20, right: 16,
        fontFamily: '"Courier New", monospace', fontSize: 22, fontWeight: 700,
        color: C.safetyGreen, zIndex: 10, textShadow: '0 0 10px rgba(57,255,20,0.6)',
      }}>
        {formatTime(elapsed)}
      </div>

      {arState === 'unavailable' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5 }}>
          <div style={{
            background: 'rgba(10, 41, 71, 0.92)',
            backdropFilter: 'blur(12px)',
            borderRadius: 20, padding: '28px 24px', textAlign: 'center', maxWidth: 280,
          }}>
            <div style={{ fontWeight: 700, marginBottom: 8, color: C.cream, fontSize: 16 }}>AR not available</div>
            <div style={{ fontSize: 13, color: 'rgba(243, 228, 201, 0.65)' }}>
              Camera access or device orientation is not available on this device.
            </div>
          </div>
        </div>
      )}

      {arState === 'active' && (
        <>
          <div style={{
            position: 'absolute', top: '35%', left: '50%',
            transform: 'translate(-50%, -50%)', zIndex: 5,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          }}>
            {arrowAngle !== null ? (
              <div style={{
                fontSize: 80,
                transform: `rotate(${arrowAngle}deg)`,
                transition: 'transform 0.2s ease',
                filter: 'drop-shadow(0 0 12px rgba(57,255,20,0.8))',
                lineHeight: 1,
                color: C.safetyGreen,
              }}>
                ↑
              </div>
            ) : (
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Compass not available</div>
            )}
          </div>

          {distanceM !== null && (
            <div style={{
              position: 'absolute', top: '58%', left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.65)', borderRadius: 20, padding: '8px 20px',
              color: '#fff', fontSize: 18, fontWeight: 700, zIndex: 5, whiteSpace: 'nowrap',
            }}>
              {distanceM.toFixed(1)} m to exit
            </div>
          )}
        </>
      )}

      <div style={{ position: 'absolute', bottom: 36, left: 16, right: 16, zIndex: 10 }}>
        <button
          onClick={onReachedExit}
          style={{
            width: '100%', background: C.safetyGreen, border: 'none', borderRadius: 14,
            color: '#0A1A0E', fontSize: 17, fontWeight: 700, minHeight: 52, cursor: 'pointer',
          }}
        >
          Reached Exit!
        </button>
      </div>
    </div>
  );
}
