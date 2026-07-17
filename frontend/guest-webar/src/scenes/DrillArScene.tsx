import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  Vector3,
  Quaternion,
  Euler,
  Group,
  Mesh,
  Shape,
  ShapeGeometry,
  MeshBasicMaterial,
  MathUtils,
  DoubleSide,
} from 'three';
import type { GuestRoute, GuidanceEvent, Coordinate3D } from '@3minutes/contracts';
import { computeGuidance, guidanceToSpeech, activeWaypointIndex } from '../services/guidance.js';
import { FpsSampler } from '../services/performance.js';
import { useStepTracking } from '../hooks/useStepTracking.js';
import type { AnchorData, AnchorSummary } from '../services/anchorApi.js';

// Canvas size must match MapPage's CANVAS_SIZE constant.
const CANVAS_SIZE  = 512;
const ARROW_COLOR  = 0x39ff14;
const EYE_HEIGHT_M = 1.6;

type PathPoint = { px: number; py: number };

function canvasToWorld(px: number, py: number, data: AnchorData): { x: number; z: number } {
  return {
    x: data.originX + px * data.scaleMetersPerPixel,
    z: data.originZ + (CANVAS_SIZE - py) * data.scaleMetersPerPixel,
  };
}

/**
 * Converts drill-flow canvas path + anchor metadata into a GuestRoute whose
 * origin is the scanned anchor (0,0,0). All coordinates are in metres.
 */
function buildRoute(
  pathPoints: PathPoint[],
  anchorData: AnchorData,
  anchors: AnchorSummary[],
): GuestRoute {
  const exitAnchor = anchors.find((a) => a.isExit);

  // Fallback: no real scale metadata — use exit anchor world coords directly.
  if (pathPoints.length < 2 || anchorData.scaleMetersPerPixel <= 0) {
    const exitPoint: Coordinate3D = exitAnchor
      ? { x: exitAnchor.posX - anchorData.posX, y: 0, z: exitAnchor.posZ - anchorData.posZ }
      : { x: 0, y: 0, z: -5 };
    return {
      locationRef: anchorData.id,
      origin:      { x: 0, y: 0, z: 0 },
      routePoints: [],
      hazardPoints: [],
      safeZones:   [],
      exitPoint,
    };
  }

  // Convert canvas pixel path to anchor-relative metres.
  const local = pathPoints.map((p) => {
    const w = canvasToWorld(p.px, p.py, anchorData);
    return { x: w.x - anchorData.posX, y: 0, z: w.z - anchorData.posZ };
  });

  return {
    locationRef:  anchorData.id,
    origin:       { x: 0, y: 0, z: 0 },
    routePoints:  local.slice(1, -1),   // intermediate waypoints
    hazardPoints: [],
    safeZones:    [],
    exitPoint:    local[local.length - 1]!,
  };
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

interface Props {
  anchorData: AnchorData;
  /** All anchors for the scan (exit anchor provides world-coord fallback). */
  anchors: AnchorSummary[];
  /** A* or Dijkstra path in canvas-pixel coordinates from MapPage. */
  pathPoints: PathPoint[];
  elapsed: number;
  onBack: () => void;
  onReachedExit: () => void;
}

export default function DrillArScene({
  anchorData,
  anchors,
  pathPoints,
  elapsed,
  onBack,
  onReachedExit,
}: Props) {
  const mountRef  = useRef<HTMLDivElement>(null);
  const videoRef  = useRef<HTMLVideoElement>(null);
  const headingRef = useRef(0);
  const pitchRef   = useRef(90); // degrees; 90 = upright phone = horizontal camera
  const [stream, setStream]     = useState<MediaStream | null>(null);
  const [guidance, setGuidance] = useState<GuidanceEvent | null>(null);

  const positionRef = useStepTracking(headingRef);

  const route = useMemo(
    () => buildRoute(pathPoints, anchorData, anchors),
    [pathPoints, anchorData, anchors],
  );

  // Camera — permission was already granted in ScanPage, so no gesture needed.
  useEffect(() => {
    let cancelled = false;
    let acquired: MediaStream | null = null;
    void navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((s) => {
        if (cancelled) { s.getTracks().forEach((t) => t.stop()); return; }
        acquired = s;
        setStream(s);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      acquired?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Attach stream to video element.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;
    video.srcObject = stream;
    void video.play().catch(() => {});
    return () => { video.srcObject = null; };
  }, [stream]);

  // Device orientation — pitch + heading.
  useEffect(() => {
    let cancelled = false;
    let listener: ((e: DeviceOrientationEvent) => void) | null = null;

    void (async () => {
      const anyDOE = DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<PermissionState>;
      };
      if (typeof anyDOE.requestPermission === 'function') {
        try {
          const res = await anyDOE.requestPermission();
          if (cancelled || res !== 'granted') return;
        } catch { return; }
      }
      if (cancelled) return;

      listener = (e: DeviceOrientationEvent) => {
        const wk = (e as unknown as { webkitCompassHeading?: number }).webkitCompassHeading;
        if (typeof wk === 'number') headingRef.current = wk;
        else if (typeof e.alpha === 'number') headingRef.current = 360 - e.alpha;
        if (typeof e.beta === 'number')
          pitchRef.current = Math.max(0, Math.min(180, e.beta));
      };
      window.addEventListener('deviceorientation', listener, true);
    })();

    return () => {
      cancelled = true;
      if (listener) window.removeEventListener('deviceorientation', listener, true);
    };
  }, []);

  // Three.js scene — rebuilt when route or stream changes.
  useEffect(() => {
    if (!stream) return;
    const mount = mountRef.current;
    if (!mount) return;

    const width  = mount.clientWidth;
    const height = mount.clientHeight;

    const renderer = new WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    Object.assign(renderer.domElement.style, { position: 'absolute', top: '0', left: '0' });
    mount.appendChild(renderer.domElement);

    const scene  = new Scene();
    const camera = new PerspectiveCamera(75, width / height, 0.1, 100);
    camera.position.set(0, EYE_HEIGHT_M, 0);

    // Flat chevron: XY shape, rotated to XZ floor plane.
    const shape = new Shape();
    shape.moveTo( 0,     0.28);
    shape.lineTo( 0.22, -0.18);
    shape.lineTo( 0.08, -0.06);
    shape.lineTo( 0,     0.06);
    shape.lineTo(-0.08, -0.06);
    shape.lineTo(-0.22, -0.18);
    shape.closePath();

    const chevronGeo = new ShapeGeometry(shape);
    const material   = new MeshBasicMaterial({
      color:       ARROW_COLOR,
      transparent: true,
      opacity:     0.88,
      side:        DoubleSide,
    });

    const arrowsRoot  = new Group();
    const segmentMeta: Array<{ group: Group; wpIdx: number }> = [];
    const waypoints   = [...route.routePoints, route.exitPoint] as Coordinate3D[];
    const forward     = new Vector3(0, 0, 1);

    for (let i = 0; i < waypoints.length; i++) {
      const from: Coordinate3D = i === 0 ? route.origin : waypoints[i - 1]!;
      const to: Coordinate3D   = waypoints[i]!;
      const seg = new Vector3(to.x - from.x, 0, to.z - from.z);
      const len = seg.length();
      if (len < 0.01) continue;
      const dir   = seg.clone().normalize();
      const steps = Math.min(Math.max(Math.round(len / 0.5), 1), 20);
      for (let s = 0; s < steps; s++) {
        const t    = (s + 0.5) / steps;
        const mesh = new Mesh(chevronGeo, material);
        mesh.rotation.x = Math.PI / 2; // tip → +Z (floor plane)
        const g = new Group();
        g.add(mesh);
        g.position.set(
          from.x + dir.x * len * t,
          0.02,
          from.z + dir.z * len * t,
        );
        g.quaternion.setFromUnitVectors(forward, dir);
        arrowsRoot.add(g);
        segmentMeta.push({ group: g, wpIdx: i });
      }
    }
    scene.add(arrowsRoot);

    const sampler         = new FpsSampler();
    const euler           = new Euler(0, 0, 0, 'YXZ');
    const quat            = new Quaternion();
    let animId            = 0;
    let lastGuidanceAt    = 0;

    function animate(nowMs: number) {
      animId = requestAnimationFrame(animate);
      sampler.tick(nowMs);

      camera.position.x = positionRef.current.x;
      camera.position.z = positionRef.current.z;
      euler.set(
        MathUtils.degToRad(pitchRef.current - 90),
        MathUtils.degToRad(-headingRef.current),
        0,
        'YXZ',
      );
      quat.setFromEuler(euler);
      camera.quaternion.copy(quat);
      renderer.render(scene, camera);

      if (nowMs - lastGuidanceAt > 250) {
        lastGuidanceAt = nowMs;
        const pose      = { position: positionRef.current, headingDeg: headingRef.current };
        const event     = computeGuidance(route, pose);
        const activeIdx = activeWaypointIndex(route, pose);
        setGuidance(event);
        for (const { group, wpIdx } of segmentMeta) {
          group.visible = wpIdx >= activeIdx;
        }
      }
    }
    animId = requestAnimationFrame(animate);

    function onResize() {
      const w = mount!.clientWidth;
      const h = mount!.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', onResize);

    function onVisibility() {
      if (document.hidden) cancelAnimationFrame(animId);
      else animId = requestAnimationFrame(animate);
    }
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      chevronGeo.dispose();
      material.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, [route, stream]); // positionRef/headingRef/pitchRef are stable refs — safe to omit

  const instruction = guidance ? guidanceToSpeech(guidance) : 'Menyiapkan panduan...';

  if (!stream) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#F3E4C9', fontSize: 14, fontWeight: 600 }}>Memulai kamera...</div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000' }}>
      <video
        ref={videoRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        playsInline
        muted
        autoPlay
      />
      <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />

      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        padding: '20px 16px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        zIndex: 10,
      }}>
        <button onClick={onBack} style={glassBtnStyle}>← Peta</button>
        <div style={{
          fontFamily: '"Courier New", monospace',
          fontSize: 22, fontWeight: 700,
          color: '#39FF14',
          textShadow: '0 0 10px rgba(57,255,20,0.6)',
        }}>
          {formatTime(elapsed)}
        </div>
      </div>

      {/* Guidance text */}
      <div
        aria-live="assertive"
        style={{
          position: 'absolute', bottom: 104, left: 16, right: 16,
          display: 'flex', justifyContent: 'center',
          pointerEvents: 'none', zIndex: 10,
        }}
      >
        <div style={{
          background: 'rgba(10,41,71,0.85)',
          color: '#F3E4C9',
          padding: '12px 22px',
          borderRadius: 22,
          fontWeight: 600, fontSize: 15,
          textAlign: 'center', maxWidth: 420,
        }}>
          {instruction}
        </div>
      </div>

      {/* Exit button */}
      <div style={{ position: 'absolute', bottom: 36, left: 16, right: 16, zIndex: 10 }}>
        <button
          onClick={onReachedExit}
          style={{
            width: '100%',
            background: '#39FF14',
            border: 'none', borderRadius: 14,
            color: '#0A1A0E',
            fontSize: 17, fontWeight: 700,
            minHeight: 52, cursor: 'pointer',
          }}
        >
          Sampai di EXIT!
        </button>
      </div>
    </div>
  );
}

const glassBtnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.15)',
  border: '1px solid rgba(255,255,255,0.35)',
  backdropFilter: 'blur(8px)',
  borderRadius: 10,
  color: '#fff',
  fontSize: 14, fontWeight: 600,
  padding: '8px 16px',
  cursor: 'pointer',
};
