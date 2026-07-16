import { useRef, useCallback } from 'react';
import type { GuidanceEvent, GuidanceAction, AccessibilityMode } from '../types';
import { toArrowAngleRad, angleToDirection } from '../ar/SpatialCoordinateAdapter';
import type { Coordinate3D, SpatialObject } from '@3minutes/contracts';

const ACTION_LABELS: Record<GuidanceAction, string> = {
  GO_STRAIGHT: 'Berjalan lurus',
  TURN_LEFT: 'Belok kiri',
  TURN_RIGHT: 'Belok kanan',
  AVOID_LEFT: 'Hindari ke kiri',
  AVOID_RIGHT: 'Hindari ke kanan',
  STAY_LOW: 'Tetap merunduk',
  SAFE_ZONE_LEFT: 'Zona aman di kiri',
  SAFE_ZONE_RIGHT: 'Zona aman di kanan',
  EXIT_AHEAD: 'Pintu keluar di depan',
  ARRIVED: 'Anda telah mencapai titik evakuasi',
};

// Computes a GuidanceEvent from target position relative to origin.
export function computeGuidanceEvent(
  target: Coordinate3D,
  origin: Coordinate3D,
  distanceMeters: number,
  isCritical: boolean,
): GuidanceEvent {
  const angle = toArrowAngleRad(target, origin);
  const direction = angleToDirection(angle);

  let action: GuidanceAction;
  if (distanceMeters < 0.5) {
    action = 'ARRIVED';
  } else if (direction === 'straight') {
    action = 'GO_STRAIGHT';
  } else if (direction === 'left') {
    action = 'TURN_LEFT';
  } else if (direction === 'right') {
    action = 'TURN_RIGHT';
  } else {
    action = 'GO_STRAIGHT'; // behind → default straight
  }

  return {
    action,
    distanceMeters: Math.round(distanceMeters * 10) / 10,
    priority: isCritical ? 'CRITICAL' : 'NORMAL',
  };
}

export function guidanceLabel(event: GuidanceEvent): string {
  const label = ACTION_LABELS[event.action];
  if (event.distanceMeters !== undefined && event.distanceMeters > 0) {
    return `${label} — ${event.distanceMeters.toFixed(1)} m`;
  }
  return label;
}

// Debounce: skip identical consecutive events.
export function useGuidanceDebounce() {
  const lastRef = useRef<GuidanceAction | null>(null);

  return useCallback((event: GuidanceEvent): boolean => {
    if (event.action === lastRef.current) return false; // suppress duplicate
    lastRef.current = event.action;
    return true;
  }, []);
}

export { ACTION_LABELS };
