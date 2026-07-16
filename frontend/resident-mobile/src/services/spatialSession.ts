import type { SpatialMap } from '@3minutes/contracts';

type Session = { map: SpatialMap; scanId: string };
let current: Session | null = null;
export const spatialSession = {
  get: () => current,
  set: (map: SpatialMap) => { current = { map, scanId: map.scanId }; },
  clear: () => { current = null; },
};
