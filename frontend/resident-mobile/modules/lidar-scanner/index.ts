import { NativeModules, requireNativeComponent, findNodeHandle } from 'react-native';
import type { ViewProps } from 'react-native';

const { LidarScannerModule, ARScanView: ARScanViewModule, MeshViewerView: MeshViewerViewModule } = NativeModules as {
  LidarScannerModule: {
    isLidarSupported: () => Promise<boolean>;
    startScan: () => Promise<null>;
    stopAndGenerateFloorPlan: () => Promise<FloorPlanResult>;
    exportMeshOBJ: () => Promise<string>;
  };
  ARScanView: { startScan: (reactTag: number) => void };
  MeshViewerView: { loadMesh: (reactTag: number) => void };
};

export interface FloorPlanResult {
  uri: string;
  width: number;
  height: number;
  scaleMetersPerPixel: number;
  originX: number;
  originZ: number;
}

export interface MeshStatsEvent {
  anchorCount: number;
  vertexCount: number;
}

// ── Native view: AR scanning preview (live wireframe mesh) ────────────────────
export interface ARScanViewProps extends ViewProps {
  onMeshStats?: (event: { nativeEvent: MeshStatsEvent }) => void;
}

export const ARScanView = requireNativeComponent<ARScanViewProps>('ARScanView');

export function startARScan(ref: React.RefObject<unknown>): void {
  const tag = findNodeHandle(ref.current as never);
  if (tag) ARScanViewModule?.startScan(tag);
}

// ── Native view: 3D orbit viewer ──────────────────────────────────────────────
export const MeshViewerView = requireNativeComponent<ViewProps>('MeshViewerView');

export function reloadMeshViewer(ref: React.RefObject<unknown>): void {
  const tag = findNodeHandle(ref.current as never);
  if (tag) MeshViewerViewModule?.loadMesh(tag);
}

// ── Module methods ─────────────────────────────────────────────────────────────
export function isLidarSupported(): Promise<boolean> {
  return LidarScannerModule.isLidarSupported();
}

export function startScan(): Promise<null> {
  return LidarScannerModule.startScan();
}

export function stopAndGenerateFloorPlan(): Promise<FloorPlanResult> {
  return LidarScannerModule.stopAndGenerateFloorPlan();
}

export function exportMeshOBJ(): Promise<string> {
  return LidarScannerModule.exportMeshOBJ();
}
