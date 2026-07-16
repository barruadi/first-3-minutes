import { describe, it, expect } from 'vitest';
import type { GuestRoute } from '@3minutes/contracts';
import { computeGuidance, guidanceToSpeech, activeWaypointIndex } from '../guidance.js';

/** Rute lurus ke depan (-Z), exit 5 m di depan. */
const straightRoute: GuestRoute = {
  locationRef: 'floor-4-room-402',
  origin: { x: 0, y: 0, z: 0 },
  routePoints: [{ x: 0, y: 0, z: -2 }],
  hazardPoints: [],
  safeZones: [],
  exitPoint: { x: 0, y: 0, z: -5 },
};

const atOrigin = { position: { x: 0, y: 0, z: 0 }, headingDeg: 0 };

describe('activeWaypointIndex', () => {
  it('targets the first unreached waypoint', () => {
    expect(activeWaypointIndex(straightRoute, atOrigin)).toBe(0);
  });

  it('advances past a waypoint once within reach radius', () => {
    const pose = { position: { x: 0, y: 0, z: -2.4 }, headingDeg: 0 };
    expect(activeWaypointIndex(straightRoute, pose)).toBe(1);
  });
});

describe('computeGuidance', () => {
  it('says go straight when the waypoint is dead ahead', () => {
    const event = computeGuidance(straightRoute, atOrigin);
    expect(event.action).toBe('GO_STRAIGHT');
    expect(event.priority).toBe('NORMAL');
  });

  it('turns right when the waypoint sits to the right of heading', () => {
    // Menghadap -Z, waypoint di +X -> belok kanan.
    const route: GuestRoute = { ...straightRoute, routePoints: [{ x: 5, y: 0, z: 0 }] };
    expect(computeGuidance(route, atOrigin).action).toBe('TURN_RIGHT');
  });

  it('turns left when the waypoint sits to the left of heading', () => {
    const route: GuestRoute = { ...straightRoute, routePoints: [{ x: -5, y: 0, z: 0 }] };
    expect(computeGuidance(route, atOrigin).action).toBe('TURN_LEFT');
  });

  it('announces the exit ahead on the final leg', () => {
    const pose = { position: { x: 0, y: 0, z: -2.5 }, headingDeg: 0 };
    const event = computeGuidance(straightRoute, pose);
    expect(event.action).toBe('EXIT_AHEAD');
    expect(event.priority).toBe('CRITICAL');
  });

  it('reports arrival at the exit', () => {
    const pose = { position: { x: 0, y: 0, z: -4.6 }, headingDeg: 0 };
    const event = computeGuidance(straightRoute, pose);
    expect(event.action).toBe('ARRIVED');
    expect(event.priority).toBe('CRITICAL');
  });

  it('lets a near hazard override normal navigation, as CRITICAL', () => {
    const route: GuestRoute = { ...straightRoute, hazardPoints: [{ x: 1, y: 0, z: -1 }] };
    const event = computeGuidance(route, atOrigin);
    // Hazard di kanan -> menghindar ke kiri.
    expect(event.action).toBe('AVOID_LEFT');
    expect(event.priority).toBe('CRITICAL');
  });

  it('ignores a hazard that is far away', () => {
    const route: GuestRoute = { ...straightRoute, hazardPoints: [{ x: 20, y: 0, z: -20 }] };
    expect(computeGuidance(route, atOrigin).action).toBe('GO_STRAIGHT');
  });
});

describe('guidanceToSpeech', () => {
  // Guardrail architecture.md §8.8 / PRD §6.6: panduan suara tidak boleh
  // bergantung pada panah, warna, ikon, atau teks berwarna.
  const forbidden = ['panah', 'hijau', 'merah', 'warna', 'ikon', 'tombol', 'layar'];

  const allActions = [
    'GO_STRAIGHT',
    'TURN_LEFT',
    'TURN_RIGHT',
    'AVOID_LEFT',
    'AVOID_RIGHT',
    'STAY_LOW',
    'SAFE_ZONE_LEFT',
    'SAFE_ZONE_RIGHT',
    'EXIT_AHEAD',
    'ARRIVED',
  ] as const;

  it('never references arrows, colours, or icons for any action', () => {
    for (const action of allActions) {
      const phrase = guidanceToSpeech({ action, priority: 'NORMAL' }).toLowerCase();
      for (const word of forbidden) {
        expect(phrase, `"${action}" mengandung kata terlarang "${word}"`).not.toContain(word);
      }
    }
  });

  it('produces a non-empty action phrase for every frozen action', () => {
    for (const action of allActions) {
      expect(guidanceToSpeech({ action, priority: 'NORMAL' }).length).toBeGreaterThan(0);
    }
  });

  it('states direction and distance when distance is relevant', () => {
    const phrase = guidanceToSpeech({ action: 'TURN_RIGHT', distanceMeters: 2, priority: 'NORMAL' });
    expect(phrase).toContain('2 meter');
    expect(phrase).toContain('kanan');
  });
});
