import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { GuestRoute } from '@3minutes/contracts';

interface Props {
  route: GuestRoute;
}

export default function ArScene({ route }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    const video = videoRef.current;
    if (!mount || !video) return;

    // Start camera feed
    let stream: MediaStream | undefined;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then((s) => {
        stream = s;
        video.srcObject = s;
        void video.play();
      })
      .catch(() => {});

    // Three.js overlay scene
    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 100);
    camera.position.set(0, 1.6, 0);

    // Ambient light
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));

    // Placeholder directional arrow toward first route point
    const arrowDir = route.routePoints.length > 0
      ? new THREE.Vector3(route.routePoints[0]!.x, 0, route.routePoints[0]!.z).normalize()
      : new THREE.Vector3(0, 0, -1);

    const arrowHelper = new THREE.ArrowHelper(
      arrowDir,
      new THREE.Vector3(0, 0, 0),
      1.5,
      0x39ff14,
      0.4,
      0.2,
    );
    scene.add(arrowHelper);

    let animId: number;
    function animate() {
      animId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    }
    animate();

    function onResize() {
      const w = mount!.clientWidth;
      const h = mount!.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [route]);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#000' }}>
      <video
        ref={videoRef}
        style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover' }}
        playsInline
        muted
        autoPlay
      />
      <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />
      <div style={{
        position: 'absolute', bottom: 40, left: 0, right: 0,
        display: 'flex', justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        <div style={{
          background: 'rgba(10,41,71,0.75)',
          color: '#F3E4C9',
          padding: '8px 20px',
          borderRadius: 20,
          fontSize: 13,
          fontWeight: 500,
        }}>
          Ikuti panah menuju pintu keluar
        </div>
      </div>
    </div>
  );
}
