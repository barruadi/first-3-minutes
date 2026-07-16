import React, { useEffect, useRef, useState } from 'react';
// Named import, bukan `import * as THREE` — namespace import mematikan
// tree-shaking dan menarik seluruh Three.js ke bundle (budget 1,5 MB gzip).
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  Vector3,
  Quaternion,
  Euler,
  Group,
  Mesh,
  ConeGeometry,
  CylinderGeometry,
  MeshBasicMaterial,
  MathUtils,
} from 'three';
import type { AccessibilityMode, GuestRoute, GuidanceEvent, Coordinate3D } from '@3minutes/contracts';
import { computeGuidance, guidanceToSpeech } from '../services/guidance.js';
import { GuidanceSpeaker } from '../services/speech.js';
import { FpsSampler } from '../services/performance.js';

interface Props {
  route: GuestRoute;
  /** Stream sudah diperoleh lewat gesture di RescuePage; jangan minta ulang. */
  stream: MediaStream;
  mode: AccessibilityMode;
  onModeChange: (m: AccessibilityMode) => void;
  onSceneReady: () => void;
}

const ARROW_COLOR = 0x39ff14; // neon green — hanya untuk directional arrow (design.md §1).
const EYE_HEIGHT_M = 1.6;

const MODE_LABELS: Record<AccessibilityMode, string> = {
  VISUAL_ONLY: 'Visual',
  VISUAL_AND_AUDIO: 'Visual + suara',
  AUDIO_PRIMARY: 'Suara',
};

export default function ArScene({ route, stream, mode, onModeChange, onSceneReady }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const speakerRef = useRef<GuidanceSpeaker | null>(null);
  const headingRef = useRef(0);
  const [guidance, setGuidance] = useState<GuidanceEvent | null>(null);
  const [orientationBlocked, setOrientationBlocked] = useState(false);

  // Speaker mengikuti mode tanpa membangun ulang scene.
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

  // Heading perangkat. iOS memerlukan izin eksplisit untuk DeviceOrientation.
  useEffect(() => {
    let cancelled = false;

    function onOrientation(e: DeviceOrientationEvent) {
      // webkitCompassHeading tersedia di Safari iOS dan sudah true-north.
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

  // Video feed memakai stream yang sudah ada.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    void video.play().catch(() => {});
    return () => {
      video.srcObject = null;
    };
  }, [stream]);

  // Scene dibangun sekali per route.
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const renderer = new WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    // Cap pixel ratio: perangkat 3x menguras fill rate tanpa manfaat terlihat.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    Object.assign(renderer.domElement.style, { position: 'absolute', top: '0', left: '0' });
    mount.appendChild(renderer.domElement);

    const scene = new Scene();
    const camera = new PerspectiveCamera(75, width / height, 0.1, 100);
    // Marker QR = origin lokal (0,0,0); tamu berdiri di origin setinggi mata.
    camera.position.set(0, EYE_HEIGHT_M, 0);

    // Geometry dan material dibuat sekali lalu dipakai ulang semua instance.
    const shaftGeo = new CylinderGeometry(0.04, 0.04, 0.3, 6);
    const headGeo = new ConeGeometry(0.1, 0.22, 8);
    const material = new MeshBasicMaterial({ color: ARROW_COLOR, transparent: true, opacity: 0.9 });

    // Arrow ditempatkan sepanjang tiap segmen rute, bukan satu arrow statis.
    const arrows = new Group();
    const waypoints: Coordinate3D[] = [...route.routePoints, route.exitPoint];
    const forward = new Vector3(0, 0, 1);
    let placed = 0;

    for (let i = 0; i < waypoints.length; i++) {
      const from = i === 0 ? { x: 0, y: 0, z: 0 } : waypoints[i - 1]!;
      const to = waypoints[i]!;
      const segment = new Vector3(to.x - from.x, 0, to.z - from.z);
      const length = segment.length();
      if (length < 0.01) continue;
      const dir = segment.clone().normalize();

      // Satu arrow per meter, dibatasi agar object count tetap rendah.
      const steps = Math.min(Math.max(Math.floor(length), 1), 8);
      for (let s = 0; s < steps; s++) {
        const t = (s + 0.5) / steps;
        const g = new Group();
        const shaftMesh = new Mesh(shaftGeo, material);
        shaftMesh.rotation.x = Math.PI / 2;
        shaftMesh.position.z = -0.15;
        const headMesh = new Mesh(headGeo, material);
        headMesh.rotation.x = Math.PI / 2;
        headMesh.position.z = 0.15;
        g.add(shaftMesh, headMesh);
        g.position.set(from.x + dir.x * length * t, 0.05, from.z + dir.z * length * t);
        g.quaternion.setFromUnitVectors(forward, dir);
        arrows.add(g);
        placed++;
      }
    }
    scene.add(arrows);

    const sampler = new FpsSampler();
    const euler = new Euler(0, 0, 0, 'YXZ');
    const quat = new Quaternion();
    let animId = 0;
    let readyFired = false;
    let lastGuidanceAt = 0;

    function animate(nowMs: number) {
      animId = requestAnimationFrame(animate);
      sampler.tick(nowMs);

      // Update hanya transform yang perlu; tidak ada alokasi di dalam loop.
      euler.set(0, MathUtils.degToRad(-headingRef.current), 0);
      quat.setFromEuler(euler);
      camera.quaternion.copy(quat);

      renderer.render(scene, camera);

      if (!readyFired && placed > 0) {
        readyFired = true;
        onSceneReady();
      }

      // Guidance dievaluasi ~4x/detik, bukan tiap frame.
      if (nowMs - lastGuidanceAt > 250) {
        lastGuidanceAt = nowMs;
        const event = computeGuidance(route, {
          position: { x: 0, y: 0, z: 0 },
          headingDeg: headingRef.current,
        });
        setGuidance(event);
        speakerRef.current?.announce(event, nowMs);
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

    // Hentikan loop saat tab tersembunyi — rAF tetap membakar baterai di background.
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
      shaftGeo.dispose();
      headGeo.dispose();
      material.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, [route, onSceneReady]);

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

      {/*
        Instruksi tekstual adalah teks tindakan yang sama dengan yang diucapkan.
        Tidak menyebut panah atau warna, sehingga tetap dapat dipahami pada mode
        AUDIO_PRIMARY dan tidak bergantung pada rendering AR.
      */}
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
