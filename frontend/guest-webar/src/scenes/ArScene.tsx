import React, { useEffect, useRef, useState } from 'react';
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
import type { AccessibilityMode, GuestRoute, GuidanceEvent, Coordinate3D } from '@3minutes/contracts';
import { computeGuidance, guidanceToSpeech, activeWaypointIndex } from '../services/guidance.js';
import { GuidanceSpeaker } from '../services/speech.js';
import { FpsSampler } from '../services/performance.js';
import { useStepTracking } from '../hooks/useStepTracking.js';

interface Props {
  route: GuestRoute;
  /** Stream sudah diperoleh lewat gesture di RescuePage; jangan minta ulang. */
  stream: MediaStream;
  mode: AccessibilityMode;
  onModeChange: (m: AccessibilityMode) => void;
  onSceneReady: () => void;
}

const ARROW_COLOR  = 0x39ff14; // neon green (design.md §1)
const EYE_HEIGHT_M = 1.6;

const MODE_LABELS: Record<AccessibilityMode, string> = {
  VISUAL_ONLY:      'Visual',
  VISUAL_AND_AUDIO: 'Visual + suara',
  AUDIO_PRIMARY:    'Suara',
};

export default function ArScene({ route, stream, mode, onModeChange, onSceneReady }: Props) {
  const mountRef    = useRef<HTMLDivElement>(null);
  const videoRef    = useRef<HTMLVideoElement>(null);
  const speakerRef  = useRef<GuidanceSpeaker | null>(null);
  const headingRef  = useRef(0);
  const [guidance, setGuidance]                     = useState<GuidanceEvent | null>(null);
  const [orientationBlocked, setOrientationBlocked] = useState(false);

  // Dead-reckoned position from QR origin, updated each detected step.
  const positionRef = useStepTracking(headingRef);

  // Speaker follows mode without rebuilding scene.
  useEffect(() => {
    if (!speakerRef.current) speakerRef.current = new GuidanceSpeaker(mode);
    else speakerRef.current.setMode(mode);
  }, [mode]);

  useEffect(() => {
    return () => {
      speakerRef.current?.dispose();
      speakerRef.current = null;
    };
  }, []);

  // Device heading — iOS requires explicit DeviceOrientation permission.
  useEffect(() => {
    let cancelled = false;

    function onOrientation(e: DeviceOrientationEvent) {
      const webkitHeading = (e as unknown as { webkitCompassHeading?: number }).webkitCompassHeading;
      if (typeof webkitHeading === 'number') headingRef.current = webkitHeading;
      else if (typeof e.alpha === 'number') headingRef.current = 360 - e.alpha;
    }

    void (async () => {
      const anyDOE = DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<PermissionState>;
      };
      if (typeof anyDOE?.requestPermission === 'function') {
        try {
          const res = await anyDOE.requestPermission();
          if (cancelled) return;
          if (res !== 'granted') {
            setOrientationBlocked(true);
            return;
          }
        } catch {
          if (!cancelled) setOrientationBlocked(true);
          return;
        }
      }
      if (!cancelled) window.addEventListener('deviceorientation', onOrientation, true);
    })();

    return () => {
      cancelled = true;
      window.removeEventListener('deviceorientation', onOrientation, true);
    };
  }, []);

  // Attach stream to video element.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    void video.play().catch(() => {});
    return () => { video.srcObject = null; };
  }, [stream]);

  // Build scene once per route.
  useEffect(() => {
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

    // Flat chevron: defined in XY plane with tip at +Y.
    // mesh.rotation.x = π/2 maps +Y → +Z so the tip faces forward in group-local space.
    // The group quaternion then aligns group +Z with the segment direction.
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

    // Build chevrons along each route segment.
    // segmentMeta links each Group to its target-waypoint index for culling.
    const arrowsRoot  = new Group();
    const segmentMeta: Array<{ group: Group; wpIdx: number }> = [];
    const waypoints   = [...route.routePoints, route.exitPoint] as Coordinate3D[];
    const forward     = new Vector3(0, 0, 1);
    let placed        = 0;

    for (let i = 0; i < waypoints.length; i++) {
      const from: Coordinate3D = i === 0 ? route.origin : waypoints[i - 1]!;
      const to: Coordinate3D   = waypoints[i]!;
      const seg = new Vector3(to.x - from.x, 0, to.z - from.z);
      const len = seg.length();
      if (len < 0.01) continue;
      const dir = seg.clone().normalize();

      const steps = Math.min(Math.max(Math.floor(len), 1), 8);
      for (let s = 0; s < steps; s++) {
        const t    = (s + 0.5) / steps;
        const mesh = new Mesh(chevronGeo, material);
        mesh.rotation.x = Math.PI / 2; // ShapeGeometry XY → XZ floor plane

        const g = new Group();
        g.add(mesh);
        g.position.set(
          from.x + dir.x * len * t,
          0.02, // 2 cm above floor to avoid z-fighting
          from.z + dir.z * len * t,
        );
        g.quaternion.setFromUnitVectors(forward, dir);
        arrowsRoot.add(g);
        segmentMeta.push({ group: g, wpIdx: i });
        placed++;
      }
    }
    scene.add(arrowsRoot);

    const sampler      = new FpsSampler();
    const euler        = new Euler(0, 0, 0, 'YXZ');
    const quat         = new Quaternion();
    let animId         = 0;
    let readyFired     = false;
    let lastGuidanceAt = 0;

    function animate(nowMs: number) {
      animId = requestAnimationFrame(animate);
      sampler.tick(nowMs);

      // Move camera to tracked position; compass heading drives rotation.
      camera.position.x = positionRef.current.x;
      camera.position.z = positionRef.current.z;
      euler.set(0, MathUtils.degToRad(-headingRef.current), 0);
      quat.setFromEuler(euler);
      camera.quaternion.copy(quat);

      renderer.render(scene, camera);

      if (!readyFired && placed > 0) {
        readyFired = true;
        onSceneReady();
      }

      // Guidance and segment culling at ~4 Hz — no per-frame allocations.
      if (nowMs - lastGuidanceAt > 250) {
        lastGuidanceAt = nowMs;
        const pose      = { position: positionRef.current, headingDeg: headingRef.current };
        const event     = computeGuidance(route, pose);
        const activeIdx = activeWaypointIndex(route, pose);
        setGuidance(event);
        speakerRef.current?.announce(event, nowMs);
        // Hide chevrons for segments the user has already walked through.
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
      if (import.meta.env.DEV) {
        const r = sampler.report();
        if (r) {
          console.info(
            `[perf] guest_fps avg ${r.averageFps.toFixed(1)} p95frame ${r.p95FrameMs.toFixed(1)}ms (${r.samples} sampel)`
          );
        }
      }
      chevronGeo.dispose();
      material.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, [route, onSceneReady]); // positionRef/headingRef are stable refs — safe to omit

  const instruction = guidance ? guidanceToSpeech(guidance) : 'Menyiapkan panduan...';

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      <video
        ref={videoRef}
        className="absolute w-full h-full object-cover"
        playsInline
        muted
        autoPlay
      />
      <div ref={mountRef} className="absolute inset-0" />

      {orientationBlocked && (
        <div className="absolute top-4 left-4 right-4 bg-hazard/90 text-warm-beige px-4 py-2.5 rounded-[10px] text-[13px] text-center">
          Arah kompas tidak tersedia. Instruksi jarak tetap berjalan.
        </div>
      )}

      <div
        aria-live="assertive"
        className="absolute bottom-24 left-4 right-4 flex justify-center pointer-events-none"
      >
        <div
          className={`bg-navy/85 text-warm-beige px-[22px] py-3 rounded-[22px] font-semibold text-center max-w-[420px] ${
            mode === 'AUDIO_PRIMARY' ? 'text-lg' : 'text-[15px]'
          }`}
        >
          {instruction}
        </div>
      </div>

      <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2">
        {(['VISUAL_ONLY', 'VISUAL_AND_AUDIO', 'AUDIO_PRIMARY'] as AccessibilityMode[]).map((m) => (
          <button
            key={m}
            onClick={() => onModeChange(m)}
            aria-pressed={mode === m}
            className={`px-3.5 py-2 rounded-full border text-warm-beige text-xs min-h-[36px] cursor-pointer ${
              mode === m
                ? 'border-warm-beige bg-warm-beige/20'
                : 'border-warm-beige/40 bg-navy/70'
            }`}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>
    </div>
  );
}
