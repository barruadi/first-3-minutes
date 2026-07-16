import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AnchorData, AnchorSummary } from '../services/anchorApi.js';

// Canvas constants
const CANVAS_SIZE = 512;
const PADDING_FRACTION = 0.1; // 10% padding on each side so dots aren't at edges
const DOT_RADIUS = 10;
const LABEL_FONT = '700 12px system-ui, sans-serif';

// Colors
const COLOR_BG = '#0A1A0E';
const COLOR_CURRENT = '#39FF14'; // neon green
const COLOR_EXIT = '#00E5FF';    // cyan
const COLOR_OTHER = '#888';
const COLOR_LINE = '#FF3B30';

type Screen = 'map' | 'ar';

interface AnchorPixel extends AnchorSummary {
  px: number; // pixel x on 512×512 canvas
  py: number; // pixel y on 512×512 canvas
}

function buildPixelCoords(anchors: AnchorSummary[]): AnchorPixel[] {
  if (anchors.length === 0) return [];

  const xs = anchors.map((a) => a.pos_x);
  const zs = anchors.map((a) => a.pos_z);
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
    px: offsetX + ((a.pos_x - minX) / rangeX) * innerSize,
    py: offsetZ + ((a.pos_z - minZ) / rangeZ) * innerSize,
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

  // Background
  ctx.fillStyle = COLOR_BG;
  ctx.fillRect(0, 0, w, h);

  // Floor plan image
  if (image) {
    ctx.globalAlpha = 0.85;
    ctx.drawImage(image, 0, 0, w, h);
    ctx.globalAlpha = 1;
  }

  const exitAnchor = pixelAnchors.find((a) => a.is_exit);
  const currentAnchor = pixelAnchors.find((a) => a.id === currentId);

  // Draw route line first (below dots)
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

  // Draw anchors
  for (const a of pixelAnchors) {
    const isCurrent = a.id === currentId;
    const isExit = a.is_exit;

    let color: string;
    let label: string;
    if (isCurrent) {
      color = COLOR_CURRENT;
      label = a.name;
    } else if (isExit) {
      color = COLOR_EXIT;
      label = 'EXIT';
    } else {
      color = COLOR_OTHER;
      label = a.name;
    }

    // Outer glow for important anchors
    if (isCurrent || isExit) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(a.px, a.py, DOT_RADIUS + 5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.2;
      ctx.fill();
      ctx.restore();
    }

    // Dot
    ctx.beginPath();
    ctx.arc(a.px, a.py, DOT_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // White ring for current
    if (isCurrent) {
      ctx.beginPath();
      ctx.arc(a.px, a.py, DOT_RADIUS + 3, 0, Math.PI * 2);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Label
    ctx.font = LABEL_FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const textY = a.py + DOT_RADIUS + 5;
    // Text shadow
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillText(label, a.px + 1, textY + 1);
    ctx.fillStyle = color;
    ctx.fillText(label, a.px, textY);
  }

  // Timer overlay (top right)
  ctx.font = '700 18px "Courier New", monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillText(timerText, w - 11, 13);
  ctx.fillStyle = '#39FF14';
  ctx.fillText(timerText, w - 12, 12);
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60)
    .toString()
    .padStart(2, '0');
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

  // Load data from sessionStorage
  useEffect(() => {
    const raw = sessionStorage.getItem('anchorData');
    if (!raw) {
      navigate('/', { replace: true });
      return;
    }
    try {
      const data = JSON.parse(raw) as AnchorData;
      setAnchorData(data);

      // Build pixel coordinates from all anchors
      const px = buildPixelCoords(data.anchors);
      setPixelAnchors(px);

      // Load floor plan image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imageRef.current = img;
      };
      img.src = data.floor_plan_url;
    } catch {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Redraw canvas whenever elapsed or anchors change
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !anchorData) return;
    drawMap(canvas, imageRef.current, pixelAnchors, anchorData.id, formatTime(elapsed));
  }, [anchorData, pixelAnchors, elapsed]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  const handleReachedExit = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const durationSeconds = Math.floor((Date.now() - startTs) / 1000);
    if (anchorData) {
      sessionStorage.setItem(
        'drillResult',
        JSON.stringify({ anchorId: anchorData.id, durationSeconds, completed: true })
      );
    }
    navigate('/complete', { replace: true });
  }, [anchorData, navigate, startTs]);

  if (!anchorData) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          background: COLOR_BG,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
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

  const exitAnchor = pixelAnchors.find((a) => a.is_exit);
  const currentAnchor = pixelAnchors.find((a) => a.id === anchorData.id);

  // Distance in meters (straight line from pos_x/pos_z)
  let distanceM: number | null = null;
  if (currentAnchor && exitAnchor) {
    const dx = currentAnchor.pos_x - exitAnchor.pos_x;
    const dz = currentAnchor.pos_z - exitAnchor.pos_z;
    distanceM = Math.sqrt(dx * dx + dz * dz);
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: COLOR_BG,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#fff',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          borderBottom: '1px solid rgba(57,255,20,0.15)',
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => navigate('/')}
          style={iconBtnStyle}
        >
          ← Home
        </button>
        <div style={{ fontSize: 15, fontWeight: 600 }}>Evacuation Map</div>
        <div
          style={{
            fontFamily: '"Courier New", monospace',
            fontSize: 22,
            fontWeight: 700,
            color: '#39FF14',
            letterSpacing: 1,
            minWidth: 64,
            textAlign: 'right',
          }}
        >
          {formatTime(elapsed)}
        </div>
      </div>

      {/* Location info */}
      <div
        style={{
          padding: '10px 16px',
          background: 'rgba(57,255,20,0.07)',
          borderBottom: '1px solid rgba(57,255,20,0.12)',
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
          Your location
        </div>
        <div style={{ fontSize: 16, fontWeight: 700 }}>{anchorData.name}</div>
        {distanceM !== null && (
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>
            {distanceM.toFixed(1)} m to exit
          </div>
        )}
      </div>

      {/* Canvas map */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 12,
          minHeight: 0,
        }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          style={{
            width: '100%',
            maxWidth: 480,
            aspectRatio: '1 / 1',
            borderRadius: 12,
            border: '1px solid rgba(57,255,20,0.2)',
            display: 'block',
          }}
        />
      </div>

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          gap: 16,
          padding: '8px 16px',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <LegendItem color={COLOR_CURRENT} label="You" />
        <LegendItem color={COLOR_EXIT} label="Exit" />
        <LegendItem color={COLOR_OTHER} label="Others" />
        <LegendItem color={COLOR_LINE} label="Route" dashed />
      </div>

      {/* Action buttons */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          padding: '12px 16px 28px',
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => setScreen('ar')}
          style={{
            flex: 1,
            background: 'transparent',
            border: '1.5px solid #39FF14',
            borderRadius: 14,
            color: '#39FF14',
            fontSize: 15,
            fontWeight: 700,
            minHeight: 56,
            cursor: 'pointer',
          }}
        >
          View AR
        </button>
        <button
          onClick={handleReachedExit}
          style={{
            flex: 2,
            background: '#39FF14',
            border: 'none',
            borderRadius: 14,
            color: '#0A1A0E',
            fontSize: 15,
            fontWeight: 700,
            minHeight: 56,
            cursor: 'pointer',
            boxShadow: '0 0 20px rgba(57,255,20,0.35)',
          }}
        >
          Reached Exit!
        </button>
      </div>
    </div>
  );
}

// ---------- Legend ----------
function LegendItem({
  color,
  label,
  dashed = false,
}: {
  color: string;
  label: string;
  dashed?: boolean;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      {dashed ? (
        <div
          style={{
            width: 20,
            height: 3,
            borderTop: `2px dashed ${color}`,
          }}
        />
      ) : (
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: color,
          }}
        />
      )}
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>{label}</span>
    </div>
  );
}

const iconBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'rgba(255,255,255,0.7)',
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

function ArOverlay({
  anchorData,
  pixelAnchors,
  elapsed,
  onBack,
  onReachedExit,
}: ArOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const headingRef = useRef(0);
  const [arState, setArState] = useState<'requesting' | 'active' | 'unavailable'>('requesting');
  const [arrowAngle, setArrowAngle] = useState<number | null>(null);
  const [distanceM, setDistanceM] = useState<number | null>(null);

  // Compute distance to exit
  useEffect(() => {
    const current = pixelAnchors.find((a) => a.id === anchorData.id);
    const exit = pixelAnchors.find((a) => a.is_exit);
    if (current && exit) {
      const dx = current.pos_x - exit.pos_x;
      const dz = current.pos_z - exit.pos_z;
      setDistanceM(Math.sqrt(dx * dx + dz * dz));
    }
  }, [anchorData.id, pixelAnchors]);

  // Camera
  useEffect(() => {
    let cancelled = false;

    async function startAr() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
        }
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

  // Device orientation for compass
  useEffect(() => {
    let cancelled = false;

    function handleOrientation(e: DeviceOrientationEvent) {
      const webkit = (e as unknown as { webkitCompassHeading?: number }).webkitCompassHeading;
      if (typeof webkit === 'number') headingRef.current = webkit;
      else if (typeof e.alpha === 'number') headingRef.current = 360 - e.alpha;

      // Compute arrow angle: bearing from current anchor to exit, relative to heading
      const current = pixelAnchors.find((a) => a.id === anchorData.id);
      const exit = pixelAnchors.find((a) => a.is_exit);
      if (current && exit) {
        const bearing = Math.atan2(exit.pos_x - current.pos_x, -(exit.pos_z - current.pos_z)) * (180 / Math.PI);
        let rel = bearing - headingRef.current;
        while (rel > 180) rel -= 360;
        while (rel < -180) rel += 360;
        setArrowAngle(rel);
      }
    }

    async function setupOrientation() {
      const doe = DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<PermissionState>;
      };
      if (typeof doe.requestPermission === 'function') {
        try {
          const res = await doe.requestPermission();
          if (cancelled || res !== 'granted') return;
        } catch {
          return;
        }
      }
      if (!cancelled) {
        window.addEventListener('deviceorientation', handleOrientation, true);
      }
    }

    void setupOrientation();

    return () => {
      cancelled = true;
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, [anchorData.id, pixelAnchors]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* Camera background */}
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
          opacity: arState === 'active' ? 1 : 0.3,
        }}
      />

      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          position: 'absolute',
          top: 20,
          left: 16,
          background: 'rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: 10,
          color: '#fff',
          fontSize: 14,
          fontWeight: 600,
          padding: '8px 16px',
          cursor: 'pointer',
          zIndex: 10,
        }}
      >
        ← Map
      </button>

      {/* Timer */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          right: 16,
          fontFamily: '"Courier New", monospace',
          fontSize: 22,
          fontWeight: 700,
          color: '#39FF14',
          zIndex: 10,
          textShadow: '0 0 10px rgba(57,255,20,0.6)',
        }}
      >
        {formatTime(elapsed)}
      </div>

      {arState === 'unavailable' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 5,
          }}
        >
          <div
            style={{
              background: 'rgba(10,26,14,0.9)',
              borderRadius: 20,
              padding: '28px 24px',
              textAlign: 'center',
              maxWidth: 280,
              color: '#fff',
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>📷</div>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>AR not available</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>
              Camera access or device orientation is not available on this device.
            </div>
          </div>
        </div>
      )}

      {arState === 'active' && (
        <>
          {/* Directional arrow */}
          <div
            style={{
              position: 'absolute',
              top: '35%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 5,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {arrowAngle !== null ? (
              <div
                style={{
                  fontSize: 80,
                  transform: `rotate(${arrowAngle}deg)`,
                  transition: 'transform 0.2s ease',
                  filter: 'drop-shadow(0 0 12px rgba(57,255,20,0.8))',
                  lineHeight: 1,
                }}
              >
                ↑
              </div>
            ) : (
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
                Compass not available
              </div>
            )}
          </div>

          {/* Distance badge */}
          {distanceM !== null && (
            <div
              style={{
                position: 'absolute',
                top: '58%',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.65)',
                borderRadius: 20,
                padding: '8px 20px',
                color: '#fff',
                fontSize: 18,
                fontWeight: 700,
                zIndex: 5,
                whiteSpace: 'nowrap',
              }}
            >
              {distanceM.toFixed(1)} m to exit
            </div>
          )}
        </>
      )}

      {/* Reached exit button */}
      <div
        style={{
          position: 'absolute',
          bottom: 36,
          left: 16,
          right: 16,
          zIndex: 10,
        }}
      >
        <button
          onClick={onReachedExit}
          style={{
            width: '100%',
            background: '#39FF14',
            border: 'none',
            borderRadius: 14,
            color: '#0A1A0E',
            fontSize: 17,
            fontWeight: 700,
            minHeight: 56,
            cursor: 'pointer',
            boxShadow: '0 0 24px rgba(57,255,20,0.4)',
          }}
        >
          Reached Exit!
        </button>
      </div>
    </div>
  );
}
