import type { Coordinate3D, GuestRoute, GuidanceEvent } from '@3minutes/contracts';

/**
 * Guidance decision engine untuk Guest WebAR (D4-GUEST-ACCESSIBILITY).
 *
 * Menghasilkan GuidanceEvent semantik dari rute, posisi, dan heading. Fungsi
 * murni agar dapat diuji tanpa kamera atau perangkat.
 *
 * Guardrail: event TIDAK PERNAH merujuk panah, warna, ikon, atau label. Dalam
 * mode AUDIO_PRIMARY, tamu harus dapat mengikuti rute tanpa melihat layar.
 */

/** Radius dianggap sudah mencapai waypoint. */
const WAYPOINT_REACHED_M = 1.0;
/** Jarak mulai mengumumkan belokan. */
const TURN_ANNOUNCE_M = 3.0;
/** Sudut minimum yang dianggap belokan, bukan lurus. */
const TURN_THRESHOLD_DEG = 25;
/** Jarak hazard yang memicu peringatan menghindar. */
const HAZARD_NEAR_M = 2.0;

export type Pose = {
  /** Posisi relatif terhadap origin marker, meter. */
  position: Coordinate3D;
  /** Arah hadap, derajat searah jarum jam dari sumbu -Z. */
  headingDeg: number;
};

function distance2D(a: Coordinate3D, b: Coordinate3D): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

/** Sudut ke target relatif terhadap heading, dinormalisasi ke [-180, 180]. */
function relativeBearingDeg(from: Coordinate3D, to: Coordinate3D, headingDeg: number): number {
  const bearing = Math.atan2(to.x - from.x, -(to.z - from.z)) * (180 / Math.PI);
  let rel = bearing - headingDeg;
  while (rel > 180) rel -= 360;
  while (rel < -180) rel += 360;
  return rel;
}

/**
 * Returns true if the user has moved past `wp` along the segment from `prev` to `wp`.
 * Uses signed path projection so we detect overshoot even without entering the radius.
 */
function isWaypointPassed(prev: Coordinate3D, wp: Coordinate3D, userPos: Coordinate3D): boolean {
  if (distance2D(userPos, wp) <= WAYPOINT_REACHED_M) return true;
  const dx = wp.x - prev.x;
  const dz = wp.z - prev.z;
  const segLen = Math.hypot(dx, dz);
  if (segLen < 0.001) return false;
  const proj = (userPos.x - prev.x) * (dx / segLen) + (userPos.z - prev.z) * (dz / segLen);
  return proj > segLen - WAYPOINT_REACHED_M;
}

/** Waypoint aktif = titik rute pertama yang belum tercapai. */
export function activeWaypointIndex(route: GuestRoute, pose: Pose): number {
  for (let i = 0; i < route.routePoints.length; i++) {
    const prev: Coordinate3D = i === 0 ? route.origin : route.routePoints[i - 1]!;
    if (!isWaypointPassed(prev, route.routePoints[i]!, pose.position)) return i;
  }
  return route.routePoints.length; // seluruh waypoint terlewati -> menuju exit
}

function nearestHazard(route: GuestRoute, pose: Pose): { point: Coordinate3D; dist: number } | null {
  let best: { point: Coordinate3D; dist: number } | null = null;
  for (const h of route.hazardPoints) {
    const dist = distance2D(pose.position, h);
    if (!best || dist < best.dist) best = { point: h, dist };
  }
  return best;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Menghitung satu event panduan untuk pose saat ini.
 *
 * Prioritas: hazard terdekat (CRITICAL) > tiba di exit (CRITICAL) > belokan >
 * lurus. Hanya satu instruksi primer pada satu waktu (design.md §2.3).
 */
export function computeGuidance(route: GuestRoute, pose: Pose): GuidanceEvent {
  // 1. Hazard mengalahkan segalanya — ini instruksi keselamatan.
  const hazard = nearestHazard(route, pose);
  if (hazard && hazard.dist <= HAZARD_NEAR_M) {
    const rel = relativeBearingDeg(pose.position, hazard.point, pose.headingDeg);
    // Hazard di kanan -> hindari ke kiri, dan sebaliknya.
    return {
      action: rel >= 0 ? 'AVOID_LEFT' : 'AVOID_RIGHT',
      distanceMeters: round1(hazard.dist),
      priority: 'CRITICAL',
    };
  }

  const idx = activeWaypointIndex(route, pose);
  const target = idx < route.routePoints.length ? route.routePoints[idx]! : route.exitPoint;
  const dist = distance2D(pose.position, target);
  const isFinalLeg = idx >= route.routePoints.length;

  // 2. Sudah sampai exit.
  if (isFinalLeg && dist <= WAYPOINT_REACHED_M) {
    return { action: 'ARRIVED', priority: 'CRITICAL' };
  }

  const rel = relativeBearingDeg(pose.position, target, pose.headingDeg);

  // 3. Exit sudah terlihat lurus di depan.
  if (isFinalLeg && Math.abs(rel) < TURN_THRESHOLD_DEG) {
    return { action: 'EXIT_AHEAD', distanceMeters: round1(dist), priority: 'CRITICAL' };
  }

  // 4. Belokan.
  if (Math.abs(rel) >= TURN_THRESHOLD_DEG) {
    return {
      action: rel > 0 ? 'TURN_RIGHT' : 'TURN_LEFT',
      // Jarak hanya relevan bila beloknya masih agak jauh.
      ...(dist <= TURN_ANNOUNCE_M ? { distanceMeters: round1(dist) } : {}),
      priority: 'NORMAL',
    };
  }

  // 5. Lurus.
  return { action: 'GO_STRAIGHT', distanceMeters: round1(dist), priority: 'NORMAL' };
}

/**
 * Event -> kalimat bahasa Indonesia berbentuk tindakan.
 *
 * Guardrail: tidak boleh menyebut panah, warna, ikon, atau tombol berwarna.
 */
export function guidanceToSpeech(event: GuidanceEvent): string {
  const d = event.distanceMeters;
  const inMeters = d !== undefined ? `Dalam ${d} meter, ` : '';

  switch (event.action) {
    case 'GO_STRAIGHT':
      return d !== undefined ? `Berjalan lurus sejauh ${d} meter.` : 'Berjalan lurus.';
    case 'TURN_LEFT':
      return d !== undefined ? `${inMeters}belok kiri.` : 'Belok kiri.';
    case 'TURN_RIGHT':
      return d !== undefined ? `${inMeters}belok kanan.` : 'Belok kanan.';
    case 'AVOID_LEFT':
      return 'Rintangan di depan. Bergerak ke kiri.';
    case 'AVOID_RIGHT':
      return 'Rintangan di depan. Bergerak ke kanan.';
    case 'STAY_LOW':
      return 'Tetap merunduk.';
    case 'SAFE_ZONE_LEFT':
      return 'Area aman di sebelah kiri Anda.';
    case 'SAFE_ZONE_RIGHT':
      return 'Area aman di sebelah kanan Anda.';
    case 'EXIT_AHEAD':
      return d !== undefined
        ? `Pintu keluar lurus di depan, sekitar ${d} meter.`
        : 'Pintu keluar lurus di depan.';
    case 'ARRIVED':
      return 'Anda telah mencapai titik evakuasi.';
  }
}

/** Dua event dianggap sama bila action sama — jarak berubah tiap frame. */
export function isSameGuidance(a: GuidanceEvent | null, b: GuidanceEvent): boolean {
  return a !== null && a.action === b.action;
}
