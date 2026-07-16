export interface FloorPlanMeta {
  scaleMetersPerPixel: number;
  originX: number;
  originZ: number;
}

export interface ScanData {
  scanId: string;
  floorPlanUrl: string;
  floorPlanMeta: FloorPlanMeta;
}

let _data: ScanData | null = null;

export const scanStore = {
  set: (data: ScanData) => { _data = data; },
  get: () => _data,
  clear: () => { _data = null; },
};
