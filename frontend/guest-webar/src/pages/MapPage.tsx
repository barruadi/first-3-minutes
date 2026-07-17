import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AnchorData, AnchorSummary } from '../services/anchorApi.js';
import DrillArScene from '../scenes/DrillArScene.js';

const CANVAS_SIZE = 512;
const PADDING_FRACTION = 0.1;
const DOT_RADIUS = 10;
const LABEL_FONT = '700 12px system-ui, sans-serif';
const GRID_SIZE = 256;

const COLOR_CURRENT = '#39FF14';
const COLOR_EXIT = '#00E5FF';
const COLOR_OTHER = '#888';
const COLOR_LINE = '#FF3B30';
const COLOR_CUSTOM = '#FF9500';
const COLOR_CANVAS_BG = '#0A2947';

const C = {
  navy: '#0A2947',
  navyLight: '#0E3560',
  cream: '#F3E4C9',
  earth: '#8B5E3C',
  textSec: 'rgba(243, 228, 201, 0.6)',
  safetyGreen: '#39FF14',
  white: '#FFFFFF',
};

type Screen = 'map' | 'ar';
type PathPoint = { px: number; py: number };

interface AnchorPixel extends AnchorSummary {
  px: number;
  py: number;
}

function worldToCanvas(posX: number, posZ: number, data: AnchorData): { px: number; py: number } {
  if (data.scaleMetersPerPixel <= 0) {
    return { px: CANVAS_SIZE / 2, py: CANVAS_SIZE / 2 };
  }
  const pxPerMeter = 1 / data.scaleMetersPerPixel;
  const px = (posX - data.originX) * pxPerMeter;
  const py = CANVAS_SIZE - (posZ - data.originZ) * pxPerMeter;
  return {
    px: Math.max(5, Math.min(CANVAS_SIZE - 5, px)),
    py: Math.max(5, Math.min(CANVAS_SIZE - 5, py)),
  };
}

function buildPixelCoords(anchors: AnchorSummary[], data: AnchorData): AnchorPixel[] {
  if (anchors.length === 0) return [];

  if (data.scaleMetersPerPixel <= 0) {
    const xs = anchors.map((a) => a.posX);
    const zs = anchors.map((a) => a.posZ);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minZ = Math.min(...zs);
    const maxZ = Math.max(...zs);
    const rangeX = maxX - minX || 1;
    const rangeZ = maxZ - minZ || 1;
    const innerSize = CANVAS_SIZE * (1 - 2 * PADDING_FRACTION);
    const offsetX = CANVAS_SIZE * PADDING_FRACTION;
    const offsetZ = CANVAS_SIZE * PADDING_FRACTION;
    return anchors.map((a) => ({
      ...a,
      px: offsetX + ((a.posX - minX) / rangeX) * innerSize,
      py: offsetZ + ((a.posZ - minZ) / rangeZ) * innerSize,
    }));
  }

  return anchors.map((a) => {
    const { px, py } = worldToCanvas(a.posX, a.posZ, data);
    return { ...a, px, py };
  });
}

function buildOccupancyGrid(image: HTMLImageElement, anchors: AnchorPixel[]): Uint8Array {
  const off = document.createElement('canvas');
  off.width = GRID_SIZE;
  off.height = GRID_SIZE;
  const ctx = off.getContext('2d')!;
  ctx.drawImage(image, 0, 0, GRID_SIZE, GRID_SIZE);
  const { data } = ctx.getImageData(0, 0, GRID_SIZE, GRID_SIZE);

  let sumBr = 0;
  let count = 0;
  for (const a of anchors) {
    const gx = Math.min(GRID_SIZE - 1, Math.max(0, Math.round((a.px / CANVAS_SIZE) * GRID_SIZE)));
    const gy = Math.min(GRID_SIZE - 1, Math.max(0, Math.round((a.py / CANVAS_SIZE) * GRID_SIZE)));
    const i = (gy * GRID_SIZE + gx) * 4;
    sumBr += (data[i]! + data[i + 1]! + data[i + 2]!) / 3;
    count++;
  }
  const refBr = count > 0 ? sumBr / count : 200;
  const lightIsFloor = refBr > 100;
  const THRESH = 80;

  const raw = new Uint8Array(GRID_SIZE * GRID_SIZE);
  for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
    const r = data[i * 4]!;
    const g = data[i * 4 + 1]!;
    const b = data[i * 4 + 2]!;
    const a = data[i * 4 + 3]!;
    const br = (r + g + b) / 3;
    if (a < 10) {
      raw[i] = 0;
    } else if (lightIsFloor) {
      raw[i] = br > THRESH ? 1 : 0;
    } else {
      raw[i] = br < 256 - THRESH ? 1 : 0;
    }
  }

  const grid = new Uint8Array(GRID_SIZE * GRID_SIZE);
  grid.fill(1);
  const D = 1;
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (raw[y * GRID_SIZE + x] === 0) {
        for (let dy = -D; dy <= D; dy++) {
          for (let dx = -D; dx <= D; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
              grid[ny * GRID_SIZE + nx] = 0;
            }
          }
        }
      }
    }
  }
  return grid;
}

function snapToWalkable(grid: Uint8Array, gx: number, gy: number): { gx: number; gy: number } {
  if (grid[gy * GRID_SIZE + gx] !== 0) return { gx, gy };
  const visited = new Set<number>([gy * GRID_SIZE + gx]);
  const queue: number[][] = [[gx, gy]];
  while (queue.length > 0) {
    const [cx, cy] = queue.shift()!;
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nx = cx! + dx!, ny = cy! + dy!;
      if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) continue;
      const ni = ny * GRID_SIZE + nx;
      if (visited.has(ni)) continue;
      visited.add(ni);
      if (grid[ni] !== 0) return { gx: nx, gy: ny };
      queue.push([nx, ny]);
    }
  }
  return { gx, gy };
}

function astarGrid(
  grid: Uint8Array,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
): Array<{ gx: number; gy: number }> | null {
  const n = GRID_SIZE * GRID_SIZE;
  const gScore = new Float32Array(n).fill(Infinity);
  const fScore = new Float32Array(n).fill(Infinity);
  const prev = new Int32Array(n).fill(-2);
  const closed = new Uint8Array(n);

  const si = sy * GRID_SIZE + sx;
  const ei = ey * GRID_SIZE + ex;
  gScore[si] = 0;
  fScore[si] = Math.hypot(sx - ex, sy - ey);
  prev[si] = -1;

  const heap: number[] = [si];

  const up = (i: number) => {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (fScore[heap[p]!]! <= fScore[heap[i]!]!) break;
      [heap[p], heap[i]] = [heap[i]!, heap[p]!];
      i = p;
    }
  };
  const down = (i: number) => {
    const len = heap.length;
    for (;;) {
      let m = i;
      const l = 2 * i + 1, r = 2 * i + 2;
      if (l < len && fScore[heap[l]!]! < fScore[heap[m]!]!) m = l;
      if (r < len && fScore[heap[r]!]! < fScore[heap[m]!]!) m = r;
      if (m === i) break;
      [heap[i], heap[m]] = [heap[m]!, heap[i]!];
      i = m;
    }
  };

  const DIRS: [number, number, number][] = [
    [-1, -1, 1.414], [0, -1, 1], [1, -1, 1.414],
    [-1, 0, 1],                   [1, 0, 1],
    [-1, 1, 1.414],  [0, 1, 1],  [1, 1, 1.414],
  ];

  while (heap.length > 0) {
    const cur = heap[0]!;
    const last = heap.pop()!;
    if (heap.length > 0) {
      heap[0] = last;
      down(0);
    }
    if (closed[cur]) continue;
    closed[cur] = 1;

    if (cur === ei) {
      const path: { gx: number; gy: number }[] = [];
      let c: number = cur;
      while (c !== -1 && c !== -2) {
        path.unshift({ gx: c % GRID_SIZE, gy: Math.floor(c / GRID_SIZE) });
        c = prev[c]!;
      }
      return path;
    }

    const cx = cur % GRID_SIZE;
    const cy = Math.floor(cur / GRID_SIZE);
    for (const [dx, dy, cost] of DIRS) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) continue;
      const ni = ny * GRID_SIZE + nx;
      if (closed[ni] || grid[ni] === 0) continue;
      const ng = gScore[cur]! + cost;
      if (ng < gScore[ni]!) {
        prev[ni] = cur;
        gScore[ni] = ng;
        fScore[ni] = ng + Math.hypot(nx - ex, ny - ey);
        heap.push(ni);
        up(heap.length - 1);
      }
    }
  }
  return null;
}

function hasLineOfSight(grid: Uint8Array, x0: number, y0: number, x1: number, y1: number): boolean {
  let cx = x0, cy = y0;
  const dx = Math.abs(x1 - cx), dy = Math.abs(y1 - cy);
  const sx = cx < x1 ? 1 : -1, sy = cy < y1 ? 1 : -1;
  let err = dx - dy;
  for (;;) {
    if (cx < 0 || cx >= GRID_SIZE || cy < 0 || cy >= GRID_SIZE) return false;
    if (grid[cy * GRID_SIZE + cx] === 0) return false;
    if (cx === x1 && cy === y1) return true;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; cx += sx; }
    if (e2 < dx) { err += dx; cy += sy; }
  }
}

function simplifyPath(
  path: { gx: number; gy: number }[],
  grid: Uint8Array,
): { gx: number; gy: number }[] {
  if (path.length <= 2) return path;
  const result = [path[0]!];
  let i = 0;
  while (i < path.length - 1) {
    let j = path.length - 1;
    while (j > i + 1) {
      if (hasLineOfSight(grid, path[i]!.gx, path[i]!.gy, path[j]!.gx, path[j]!.gy)) break;
      j--;
    }
    result.push(path[j]!);
    i = j;
  }
  return result;
}

function computeWallPath(
  image: HTMLImageElement,
  anchors: AnchorPixel[],
  startAnchor: AnchorPixel,
  exitAnchor: AnchorPixel,
): PathPoint[] {
  let grid: Uint8Array;
  try {
    grid = buildOccupancyGrid(image, anchors);
  } catch (err) {
    console.warn('[MapPage] buildOccupancyGrid failed (likely CORS/canvas security):', err);
    return [
      { px: startAnchor.px, py: startAnchor.py },
      { px: exitAnchor.px, py: exitAnchor.py },
    ];
  }

  const scale = GRID_SIZE / CANVAS_SIZE;
  const rawS = {
    gx: Math.min(GRID_SIZE - 1, Math.max(0, Math.round(startAnchor.px * scale))),
    gy: Math.min(GRID_SIZE - 1, Math.max(0, Math.round(startAnchor.py * scale))),
  };
  const rawE = {
    gx: Math.min(GRID_SIZE - 1, Math.max(0, Math.round(exitAnchor.px * scale))),
    gy: Math.min(GRID_SIZE - 1, Math.max(0, Math.round(exitAnchor.py * scale))),
  };
  const snapS = snapToWalkable(grid, rawS.gx, rawS.gy);
  const snapE = snapToWalkable(grid, rawE.gx, rawE.gy);

  const rawPath = astarGrid(grid, snapS.gx, snapS.gy, snapE.gx, snapE.gy);
  if (!rawPath || rawPath.length < 2) {
    console.warn('[MapPage] A* found no path — falling back to direct line. Check grid resolution or dilation.');
    return [
      { px: startAnchor.px, py: startAnchor.py },
      { px: exitAnchor.px, py: exitAnchor.py },
    ];
  }

  const smoothed = simplifyPath(rawPath, grid);
  const invScale = CANVAS_SIZE / GRID_SIZE;
  return smoothed.map((p) => ({
    px: p.gx * invScale,
    py: p.gy * invScale,
  }));
}

function computeThreshold(anchors: AnchorPixel[]): number {
  if (anchors.length < 2) return 20;
  const mins: number[] = [];
  for (const a of anchors) {
    let minD = Infinity;
    for (const b of anchors) {
      if (a.id === b.id) continue;
      const d = Math.hypot(a.posX - b.posX, a.posZ - b.posZ);
      if (d < minD) minD = d;
    }
    if (minD < Infinity) mins.push(minD);
  }
  const avg = mins.reduce((s, d) => s + d, 0) / mins.length;
  return avg * 2.5;
}

function dijkstraPath(anchors: AnchorPixel[], startId: string, goalId: string): PathPoint[] {
  const byId = new Map(anchors.map((a) => [a.id, a]));
  const threshold = computeThreshold(anchors);

  const adj = new Map<string, { id: string; dist: number }[]>();
  for (const a of anchors) {
    const neighbors: { id: string; dist: number }[] = [];
    for (const b of anchors) {
      if (a.id === b.id) continue;
      const d = Math.hypot(a.posX - b.posX, a.posZ - b.posZ);
      if (d <= threshold) neighbors.push({ id: b.id, dist: d });
    }
    adj.set(a.id, neighbors);
  }

  const dist = new Map<string, number>(anchors.map((a) => [a.id, Infinity]));
  const prev = new Map<string, string | null>(anchors.map((a) => [a.id, null]));
  const unvisited = new Set(anchors.map((a) => a.id));
  dist.set(startId, 0);

  while (unvisited.size > 0) {
    let u: string | null = null;
    let minD = Infinity;
    for (const id of unvisited) {
      const d = dist.get(id) ?? Infinity;
      if (d < minD) { minD = d; u = id; }
    }
    if (!u || u === goalId || minD === Infinity) break;
    unvisited.delete(u);
    for (const { id: v, dist: w } of adj.get(u) ?? []) {
      if (!unvisited.has(v)) continue;
      const alt = (dist.get(u) ?? Infinity) + w;
      if (alt < (dist.get(v) ?? Infinity)) {
        dist.set(v, alt);
        prev.set(v, u);
      }
    }
  }

  const path: PathPoint[] = [];
  let cur: string | null = goalId;
  while (cur) {
    const a = byId.get(cur);
    if (a) path.unshift({ px: a.px, py: a.py });
    cur = prev.get(cur) ?? null;
  }

  if (path.length < 2) {
    const s = byId.get(startId);
    const g = byId.get(goalId);
    return s && g ? [{ px: s.px, py: s.py }, { px: g.px, py: g.py }] : [];
  }
  return path;
}

function drawMap(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement | null,
  pixelAnchors: AnchorPixel[],
  currentId: string,
  timerText: string,
  pathPoints: PathPoint[],
  drawMode = false,
  isCustom = false,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = COLOR_CANVAS_BG;
  ctx.fillRect(0, 0, w, h);

  if (image) {
    ctx.globalAlpha = 0.85;
    ctx.drawImage(image, 0, 0, w, h);
    ctx.globalAlpha = 1;
  }

  if (pathPoints.length >= 2) {
    ctx.save();
    if (isCustom || drawMode) {
      ctx.setLineDash([]);
      ctx.strokeStyle = COLOR_CUSTOM;
      ctx.lineWidth = 3;
    } else {
      ctx.setLineDash([10, 6]);
      ctx.strokeStyle = COLOR_LINE;
      ctx.lineWidth = 2.5;
    }
    ctx.globalAlpha = drawMode ? 0.6 : 0.85;
    ctx.beginPath();
    ctx.moveTo(pathPoints[0]!.px, pathPoints[0]!.py);
    for (let i = 1; i < pathPoints.length; i++) {
      ctx.lineTo(pathPoints[i]!.px, pathPoints[i]!.py);
    }
    ctx.stroke();

    if (isCustom || drawMode) {
      for (let i = 1; i < pathPoints.length; i++) {
        ctx.beginPath();
        ctx.arc(pathPoints[i]!.px, pathPoints[i]!.py, 5, 0, Math.PI * 2);
        ctx.fillStyle = COLOR_CUSTOM;
        ctx.globalAlpha = 0.9;
        ctx.fill();
        ctx.setLineDash([]);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  if (drawMode) {
    ctx.save();
    ctx.strokeStyle = COLOR_CUSTOM;
    ctx.lineWidth = 4;
    ctx.setLineDash([]);
    ctx.strokeRect(2, 2, w - 4, h - 4);
    ctx.font = '700 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,149,0,0.88)';
    ctx.fillRect(w / 2 - 96, 10, 192, 22);
    ctx.fillStyle = '#fff';
    ctx.fillText('TAP UNTUK TAMBAH TITIK', w / 2, 21);
    ctx.restore();
  }

  for (const a of pixelAnchors) {
    const isCurrent = a.id === currentId;
    const isExit = a.isExit;
    let color: string;
    let label: string;
    if (isCurrent) {
      color = COLOR_CURRENT;
      label = a.name;
    } else if (isExit) {
      color = COLOR_EXIT;
      label = 'EXIT';
    } else {
      color = COLOR_OTHER;
      label = a.name;
    }

    if (isCurrent || isExit) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(a.px, a.py, DOT_RADIUS + 5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.2;
      ctx.fill();
      ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(a.px, a.py, DOT_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    if (isCurrent) {
      ctx.beginPath();
      ctx.arc(a.px, a.py, DOT_RADIUS + 3, 0, Math.PI * 2);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.font = LABEL_FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const textY = a.py + DOT_RADIUS + 5;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillText(label, a.px + 1, textY + 1);
    ctx.fillStyle = color;
    ctx.fillText(label, a.px, textY);
  }

  ctx.font = '700 18px "Courier New", monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillText(timerText, w - 11, 13);
  ctx.fillStyle = COLOR_CURRENT;
  ctx.fillText(timerText, w - 12, 12);
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function MapPage() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [anchorData, setAnchorData] = useState<AnchorData | null>(null);
  const [pixelAnchors, setPixelAnchors] = useState<AnchorPixel[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [screen, setScreen] = useState<Screen>('map');
  const [startTs] = useState(() => Date.now());
  const [imageLoaded, setImageLoaded] = useState(false);
  const [pathPoints, setPathPoints] = useState<PathPoint[]>([]);
  const [usedAr, setUsedAr] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
  const [customPath, setCustomPath] = useState<PathPoint[]>([]);

  useEffect(() => {
    const raw = sessionStorage.getItem('anchorData');
    if (!raw) {
      navigate('/', { replace: true });
      return;
    }
    try {
      const data = JSON.parse(raw) as AnchorData;
      setAnchorData(data);
      const px = buildPixelCoords(data.anchors, data);
      setPixelAnchors(px);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imageRef.current = img;
        setImageLoaded(true);
      };
      const floorPlanSrc = data.floorPlanUrl
        ? data.floorPlanUrl.replace(/^https?:\/\/[^/]+/, '')
        : '';
      img.src = floorPlanSrc;
    } catch {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (!imageLoaded || !imageRef.current || !anchorData || pixelAnchors.length === 0) return;
    const startAnchor = pixelAnchors.find((a) => a.id === anchorData.id);
    const exitAnchor = pixelAnchors.find((a) => a.isExit);
    if (!startAnchor || !exitAnchor) {
      setPathPoints([]);
      return;
    }
    const pts = computeWallPath(imageRef.current, pixelAnchors, startAnchor, exitAnchor);
    setPathPoints(pts);
  }, [imageLoaded, pixelAnchors, anchorData]);

  useEffect(() => {
    if (imageLoaded || !anchorData || pixelAnchors.length === 0) return;
    const exitAnchor = pixelAnchors.find((a) => a.isExit);
    if (!exitAnchor) return;
    setPathPoints(dijkstraPath(pixelAnchors, anchorData.id, exitAnchor.id));
  }, [imageLoaded, pixelAnchors, anchorData]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !anchorData) return;
    const isCustomActive = customPath.length >= 2 && !drawMode;
    const displayPath = drawMode ? customPath : (isCustomActive ? customPath : pathPoints);
    drawMap(canvas, imageRef.current, pixelAnchors, anchorData.id, formatTime(elapsed), displayPath, drawMode, isCustomActive);
  }, [anchorData, pixelAnchors, elapsed, pathPoints, customPath, drawMode]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  const handleReachedExit = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const durationSeconds = Math.floor((Date.now() - startTs) / 1000);
    if (anchorData) {
      sessionStorage.setItem(
        'drillResult',
        JSON.stringify({ anchorId: anchorData.id, durationSeconds, completed: true, usedAr })
      );
    }
    navigate('/complete', { replace: true });
  }, [anchorData, navigate, startTs, usedAr]);

  const handleStartDraw = useCallback(() => {
    const startAnchor = pixelAnchors.find((a) => a.id === anchorData?.id);
    setCustomPath(startAnchor ? [{ px: startAnchor.px, py: startAnchor.py }] : []);
    setDrawMode(true);
  }, [pixelAnchors, anchorData]);

  const handleFinishDraw = useCallback(() => {
    setDrawMode(false);
  }, []);

  const handleClearCustomPath = useCallback(() => {
    const startAnchor = pixelAnchors.find((a) => a.id === anchorData?.id);
    setCustomPath(startAnchor ? [{ px: startAnchor.px, py: startAnchor.py }] : []);
  }, [pixelAnchors, anchorData]);

  const handleResetToAuto = useCallback(() => {
    setCustomPath([]);
    setDrawMode(false);
  }, []);

  const handleCanvasTap = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;
    setCustomPath((prev) => {
      if (prev.length >= 20) return prev;
      return [...prev, { px, py }];
    });
  }, [drawMode]);

  if (!anchorData) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          background: C.navy,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: C.cream,
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        Loading map...
      </div>
    );
  }

  if (screen === 'ar') {
    const activePath = customPath.length >= 2 ? customPath : pathPoints;
    return (
      <DrillArScene
        anchorData={anchorData}
        anchors={anchorData.anchors}
        pathPoints={activePath}
        elapsed={elapsed}
        onBack={() => setScreen('map')}
        onReachedExit={handleReachedExit}
      />
    );
  }

  const exitAnchor = pixelAnchors.find((a) => a.isExit);
  const currentAnchor = pixelAnchors.find((a) => a.id === anchorData.id);
  let distanceM: number | null = null;
  if (currentAnchor && exitAnchor) {
    const dx = currentAnchor.posX - exitAnchor.posX;
    const dz = currentAnchor.posZ - exitAnchor.posZ;
    distanceM = Math.sqrt(dx * dx + dz * dz);
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: C.navy,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          borderBottom: `1px solid rgba(243, 228, 201, 0.12)`,
          flexShrink: 0,
        }}
      >
        <button onClick={() => navigate('/')} style={navBtnStyle}>
          ← Home
        </button>
        <div style={{ fontSize: 15, fontWeight: 600, color: C.cream }}>Evacuation Map</div>
        <div
          style={{
            fontFamily: '"Courier New", monospace',
            fontSize: 22,
            fontWeight: 700,
            color: C.safetyGreen,
            letterSpacing: 1,
            minWidth: 64,
            textAlign: 'right',
          }}
        >
          {formatTime(elapsed)}
        </div>
      </div>

      <div
        style={{
          padding: '10px 16px',
          background: C.navyLight,
          borderBottom: `1px solid rgba(243, 228, 201, 0.08)`,
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: 13, color: C.textSec }}>Your location</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.cream }}>{anchorData.name}</div>
        {distanceM !== null && (
          <div style={{ fontSize: 12, color: C.textSec, marginTop: 2 }}>
            {distanceM.toFixed(1)} m to exit
          </div>
        )}
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 12,
          minHeight: 0,
        }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          onPointerUp={handleCanvasTap}
          style={{
            width: '100%',
            maxWidth: 480,
            aspectRatio: '1 / 1',
            borderRadius: 12,
            border: drawMode
              ? `2px solid ${COLOR_CUSTOM}`
              : `1px solid rgba(243, 228, 201, 0.15)`,
            display: 'block',
            cursor: drawMode ? 'crosshair' : 'default',
            touchAction: drawMode ? 'none' : 'auto',
          }}
        />
      </div>

      <div
        style={{
          display: 'flex',
          gap: 16,
          padding: '8px 16px',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <LegendItem color={COLOR_CURRENT} label="You" />
        <LegendItem color={COLOR_EXIT} label="Exit" />
        <LegendItem color={COLOR_OTHER} label="Others" />
        {customPath.length >= 2 && !drawMode
          ? <LegendItem color={COLOR_CUSTOM} label="Kustom" />
          : <LegendItem color={COLOR_LINE} label="Route" dashed />
        }
      </div>

      {drawMode && (
        <div style={{ display: 'flex', gap: 8, padding: '8px 16px 0', flexShrink: 0 }}>
          <button
            onClick={handleClearCustomPath}
            style={{
              flex: 1,
              background: 'rgba(255,149,0,0.15)',
              border: `1.5px solid ${COLOR_CUSTOM}`,
              borderRadius: 12,
              color: COLOR_CUSTOM,
              fontSize: 13,
              fontWeight: 600,
              minHeight: 44,
              cursor: 'pointer',
            }}
          >
            Hapus Titik
          </button>
          <button
            onClick={handleFinishDraw}
            disabled={customPath.length < 2}
            style={{
              flex: 2,
              background: customPath.length >= 2 ? COLOR_CUSTOM : 'rgba(255,149,0,0.3)',
              border: 'none',
              borderRadius: 12,
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              minHeight: 44,
              cursor: customPath.length >= 2 ? 'pointer' : 'not-allowed',
              opacity: customPath.length >= 2 ? 1 : 0.5,
            }}
          >
            Selesai ({customPath.length > 0 ? customPath.length - 1 : 0} titik)
          </button>
        </div>
      )}

      {!drawMode && customPath.length >= 2 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: COLOR_CUSTOM, fontWeight: 600 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLOR_CUSTOM }} />
            Jalur kustom aktif
          </div>
          <button
            onClick={handleResetToAuto}
            style={{ background: 'transparent', border: 'none', color: 'rgba(243,228,201,0.5)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
          >
            Gunakan jalur otomatis
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, padding: '12px 16px 28px', flexShrink: 0 }}>
        {!drawMode && (
          <button
            onClick={handleStartDraw}
            style={{
              flex: 1,
              background: 'transparent',
              border: `1.5px solid ${COLOR_CUSTOM}`,
              borderRadius: 14,
              color: COLOR_CUSTOM,
              fontSize: 13,
              fontWeight: 700,
              minHeight: 52,
              cursor: 'pointer',
            }}
          >
            Jalur Sendiri
          </button>
        )}
        {!drawMode && (
          <button
            onClick={() => {
                  void (async () => {
                const anyDOE = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<PermissionState> };
                if (typeof anyDOE.requestPermission === 'function') {
                  try { await anyDOE.requestPermission(); } catch { /* ignore */ }
                }
                const anyDME = DeviceMotionEvent as unknown as { requestPermission?: () => Promise<PermissionState> };
                if (typeof anyDME.requestPermission === 'function') {
                  try { await anyDME.requestPermission(); } catch { /* ignore */ }
                }
                setUsedAr(true);
                setScreen('ar');
              })();
            }}
            style={{
              flex: 1,
              background: 'transparent',
              border: `1.5px solid rgba(243, 228, 201, 0.5)`,
              borderRadius: 14,
              color: C.cream,
              fontSize: 13,
              fontWeight: 700,
              minHeight: 52,
              cursor: 'pointer',
            }}
          >
            View AR
          </button>
        )}
        <button
          onClick={handleReachedExit}
          style={{
            flex: drawMode ? 1 : 2,
            background: C.safetyGreen,
            border: 'none',
            borderRadius: 14,
            color: '#0A1A0E',
            fontSize: 15,
            fontWeight: 700,
            minHeight: 52,
            cursor: 'pointer',
          }}
        >
          Reached Exit!
        </button>
      </div>
    </div>
  );
}

function LegendItem({
  color,
  label,
  dashed = false,
}: {
  color: string;
  label: string;
  dashed?: boolean;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      {dashed ? (
        <div style={{ width: 20, height: 3, borderTop: `2px dashed ${color}` }} />
      ) : (
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
      )}
      <span style={{ fontSize: 11, color: 'rgba(243, 228, 201, 0.65)' }}>{label}</span>
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'rgba(243, 228, 201, 0.7)',
  fontSize: 14,
  cursor: 'pointer',
  padding: '4px 0',
};

function canvasToWorld(px: number, py: number, data: AnchorData): { x: number; z: number } {
  return {
    x: data.originX + px * data.scaleMetersPerPixel,
    z: data.originZ + (CANVAS_SIZE - py) * data.scaleMetersPerPixel,
  };
}

interface XrSystem {
  isSessionSupported(type: string): Promise<boolean>;
  requestSession(type: string, opts?: unknown): Promise<XRSession>;
}

function isSafariBrowser(): boolean {
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (/^((?!chrome|android).)*safari/i.test(ua))
  );
}

async function checkWebXrSupport(): Promise<boolean> {
  if (isSafariBrowser()) return false;
  try {
    const xr = (navigator as Navigator & { xr?: XrSystem }).xr;
    return !!(xr && await xr.isSessionSupported('immersive-ar'));
  } catch {
    return false;
  }
}

type ArStatus =
  | 'detecting'
  | 'offer-webxr'
  | 'requesting'
  | 'active-camera'
  | 'active-webxr'
  | 'failed';

interface ArOverlayProps {
  anchorData: AnchorData;
  pixelAnchors: AnchorPixel[];
  pathPoints: PathPoint[];
  elapsed: number;
  onBack: () => void;
  onReachedExit: () => void;
}

function ArOverlay({ anchorData, pixelAnchors, pathPoints, elapsed, onBack, onReachedExit }: ArOverlayProps) {
  const overlayRef  = useRef<HTMLDivElement>(null);
  const videoRef    = useRef<HTMLVideoElement>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const xrRef       = useRef<{ session: XRSession; canvas: HTMLCanvasElement } | null>(null);
  const headingRef  = useRef(0);

  const [arStatus, setArStatus]     = useState<ArStatus>('detecting');
  const [arrowAngle, setArrowAngle] = useState<number | null>(null);
  const [distanceM, setDistanceM]   = useState<number | null>(null);
  const [waypointIdx, setWaypointIdx] = useState(1);

  const waypoints = React.useMemo(() => {
    if (pathPoints.length <= 1 || anchorData.scaleMetersPerPixel <= 0) {
      const exit = pixelAnchors.find((a) => a.isExit);
      return exit ? [{ x: exit.posX, z: exit.posZ }] : [];
    }
    return pathPoints.slice(1).map((p) => canvasToWorld(p.px, p.py, anchorData));
  }, [pathPoints, anchorData, pixelAnchors]);

  const totalSteps   = waypoints.length;
  const clampedIdx   = Math.min(waypointIdx - 1, totalSteps - 1);
  const currentTarget = totalSteps > 0 ? waypoints[clampedIdx] : null;
  const isLastStep   = clampedIdx >= totalSteps - 1;

  const recomputeArrow = React.useCallback(() => {
    if (!currentTarget) return;
    const dx = currentTarget.x - anchorData.posX;
    const dz = currentTarget.z - anchorData.posZ;
    const bearing = Math.atan2(dx, -dz) * (180 / Math.PI);
    let rel = bearing - headingRef.current;
    while (rel > 180) rel -= 360;
    while (rel < -180) rel += 360;
    setArrowAngle(rel);
    setDistanceM(Math.hypot(dx, dz));
  }, [currentTarget, anchorData.posX, anchorData.posZ]);

  useEffect(() => { recomputeArrow(); }, [recomputeArrow]);

  useEffect(() => {
    let alive = true;
    void checkWebXrSupport().then((supported) => {
      if (!alive) return;
      if (supported) {
        setArStatus('offer-webxr');
      } else {
        setArStatus('requesting');
        void startCameraMode();
      }
    });
    return () => {
      alive = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      void xrRef.current?.session.end().catch(() => {});
      xrRef.current?.canvas.remove();
      xrRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    function onOrientation(e: DeviceOrientationEvent) {
      const wk = (e as unknown as { webkitCompassHeading?: number }).webkitCompassHeading;
      if (typeof wk === 'number') headingRef.current = wk;
      else if (typeof e.alpha === 'number') headingRef.current = 360 - e.alpha;
      if (!cancelled) recomputeArrow();
    }
    void (async () => {
      const DOE = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<PermissionState> };
      if (typeof DOE.requestPermission === 'function') {
        try {
          const res = await DOE.requestPermission();
          if (cancelled || res !== 'granted') return;
        } catch { return; }
      }
      if (!cancelled) window.addEventListener('deviceorientation', onOrientation, true);
    })();
    return () => {
      cancelled = true;
      window.removeEventListener('deviceorientation', onOrientation, true);
    };
  }, [recomputeArrow]);

  const [cameraAvailable, setCameraAvailable] = React.useState(true);

  async function startCameraMode() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) { video.srcObject = stream; await video.play(); }
      setArStatus('active-camera');
    } catch {
      // Camera denied or unavailable — show nav UI on dark background.
      // Compass arrow still works; only the live feed is missing.
      setCameraAvailable(false);
      setArStatus('active-camera');
    }
  }

  async function startWebXRMode() {
    const overlay = overlayRef.current;
    if (!overlay) { setArStatus('failed'); return; }
    setArStatus('requesting');
    try {
      const xrNav = (navigator as Navigator & { xr: XrSystem }).xr;
      const session = await xrNav.requestSession('immersive-ar', {
        requiredFeatures: ['dom-overlay'],
        optionalFeatures: ['local-floor'],
        domOverlay: { root: overlay },
      });

      // Minimal WebGL context required to keep the XR session alive
      const glCanvas = document.createElement('canvas');
      document.body.appendChild(glCanvas);
      const glRaw = glCanvas.getContext('webgl2', { xrCompatible: true });
      if (!glRaw) {
        void session.end().catch(() => {});
        glCanvas.remove();
        setArStatus('requesting');
        void startCameraMode();
        return;
      }
      const gl = glRaw as WebGL2RenderingContext & { makeXRCompatible(): Promise<void> };
      await gl.makeXRCompatible();

      // XRWebGLLayer may not be in the DOM typings but is available at runtime
      const LayerCtor = (window as unknown as Record<string, unknown>)['XRWebGLLayer'] as
        | (new (s: XRSession, g: WebGL2RenderingContext) => XRWebGLLayer)
        | undefined;
      if (LayerCtor) {
        session.updateRenderState({ baseLayer: new LayerCtor(session, gl) });
      }

      xrRef.current = { session, canvas: glCanvas };

      session.addEventListener('end', () => {
        xrRef.current?.canvas.remove();
        xrRef.current = null;
        setArStatus('requesting');
        void startCameraMode();
      });

      const renderFrame = (_t: DOMHighResTimeStamp, _frame: XRFrame) => {
        const ref = xrRef.current;
        if (!ref) return;
        const fb = ref.session.renderState.baseLayer?.framebuffer ?? null;
        if (fb !== null) {
          gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
          gl.clearColor(0, 0, 0, 0);
          gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        }
        ref.session.requestAnimationFrame(renderFrame);
      };
      session.requestAnimationFrame(renderFrame);

      setArStatus('active-webxr');
    } catch {
      // requestSession denied or feature not supported → fall back to camera
      setArStatus('requesting');
      void startCameraMode();
    }
  }

  const handleNext = () => {
    if (isLastStep) { onReachedExit(); return; }
    setWaypointIdx((i) => i + 1);
  };

  const isActive  = arStatus === 'active-camera' || arStatus === 'active-webxr';
  const isWebXR   = arStatus === 'active-webxr';

  return (
    <div
      ref={overlayRef}
      style={{
        position: 'fixed', inset: 0,
        // Transparent in WebXR mode: camera passthrough is rendered by the browser
        background: isWebXR ? 'transparent' : '#000',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {!isWebXR && cameraAvailable && (
        <video
          ref={videoRef}
          playsInline muted autoPlay
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            opacity: arStatus === 'active-camera' ? 1 : 0.3,
          }}
        />
      )}

      {arStatus === 'offer-webxr' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, background: C.navy }}>
          <div style={{ fontSize: 48 }}>🥽</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.cream, textAlign: 'center' }}>AR tersedia</div>
          <div style={{ fontSize: 13, color: C.textSec, textAlign: 'center', maxWidth: 280 }}>
            Perangkat ini mendukung AR. Gunakan AR untuk panduan navigasi yang lebih imersif, atau lanjutkan dengan kamera biasa.
          </div>
          <button
            onClick={() => void startWebXRMode()}
            style={{ width: '100%', maxWidth: 300, background: C.safetyGreen, border: 'none', borderRadius: 14, color: '#0A1A0E', fontSize: 16, fontWeight: 700, minHeight: 54, cursor: 'pointer' }}
          >
            Masuk AR
          </button>
          <button
            onClick={() => { setArStatus('requesting'); void startCameraMode(); }}
            style={{ width: '100%', maxWidth: 300, background: 'transparent', border: `1.5px solid rgba(243,228,201,0.4)`, borderRadius: 14, color: C.cream, fontSize: 15, fontWeight: 600, minHeight: 48, cursor: 'pointer' }}
          >
            Gunakan Kamera Saja
          </button>
          <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: C.textSec, fontSize: 13, cursor: 'pointer', marginTop: 4 }}>
            ← Kembali ke Peta
          </button>
        </div>
      )}

      {arStatus === 'detecting' || arStatus === 'requesting' ? (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 8 }}>
          <div style={{ background: 'rgba(10,41,71,0.88)', backdropFilter: 'blur(12px)', borderRadius: 16, padding: '20px 28px', color: C.cream, fontSize: 14, fontWeight: 600 }}>
            {arStatus === 'detecting' ? 'Memeriksa dukungan AR…' : 'Memulai AR…'}
          </div>
        </div>
      ) : null}

      {arStatus === 'failed' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 8 }}>
          <div style={{ background: 'rgba(10,41,71,0.92)', backdropFilter: 'blur(12px)', borderRadius: 20, padding: '28px 24px', textAlign: 'center', maxWidth: 280 }}>
            <div style={{ fontWeight: 700, marginBottom: 8, color: C.cream, fontSize: 16 }}>AR tidak tersedia</div>
            <div style={{ fontSize: 13, color: 'rgba(243,228,201,0.65)', marginBottom: 20 }}>Izin kamera ditolak atau perangkat tidak mendukung.</div>
            <button onClick={onBack} style={{ background: 'transparent', border: `1px solid ${C.cream}`, borderRadius: 12, color: C.cream, fontSize: 14, padding: '10px 24px', cursor: 'pointer' }}>
              ← Kembali ke Peta
            </button>
          </div>
        </div>
      )}

      {isActive && (
        <>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '20px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
            <button onClick={onBack} style={glassBtn}>← Map</button>
            {isWebXR && (
              <div style={{ background: 'rgba(57,255,20,0.15)', border: '1px solid rgba(57,255,20,0.5)', borderRadius: 12, padding: '3px 10px', fontSize: 11, fontWeight: 700, color: C.safetyGreen, letterSpacing: '0.05em' }}>
                WebXR AR
              </div>
            )}
            <div style={{ fontFamily: '"Courier New", monospace', fontSize: 22, fontWeight: 700, color: C.safetyGreen, textShadow: '0 0 10px rgba(57,255,20,0.6)' }}>
              {formatTime(elapsed)}
            </div>
          </div>

          {!isWebXR && !cameraAvailable && (
            <div style={{ position: 'absolute', top: 68, left: 16, right: 16, zIndex: 10 }}>
              <div style={{ background: 'rgba(255,59,48,0.18)', border: '1px solid rgba(255,59,48,0.5)', borderRadius: 10, padding: '7px 14px', fontSize: 12, color: 'rgba(255,200,200,0.9)', textAlign: 'center' }}>
                Kamera tidak dapat diakses — navigasi kompas tetap aktif
              </div>
            </div>
          )}

          {totalSteps > 1 && (
            <div style={{ position: 'absolute', top: cameraAvailable || isWebXR ? 72 : 110, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', borderRadius: 20, padding: '5px 16px', color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 600, zIndex: 10, whiteSpace: 'nowrap' }}>
              Titik {clampedIdx + 1} dari {totalSteps}{isLastStep ? ' · EXIT' : ''}
            </div>
          )}

          <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            {arrowAngle !== null ? (
              <div style={{ fontSize: 96, transform: `rotate(${arrowAngle}deg)`, transition: 'transform 0.15s ease', filter: `drop-shadow(0 0 16px ${isLastStep ? '#00E5FF' : 'rgba(57,255,20,0.9)'})`, lineHeight: 1, color: isLastStep ? '#00E5FF' : C.safetyGreen }}>
                ↑
              </div>
            ) : (
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', padding: '12px 20px', background: 'rgba(0,0,0,0.5)', borderRadius: 12 }}>
                Kompas tidak tersedia
              </div>
            )}
            {distanceM !== null && (
              <div style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', borderRadius: 20, padding: '8px 20px', color: '#fff', fontSize: 20, fontWeight: 700, whiteSpace: 'nowrap' }}>
                ±{distanceM.toFixed(0)} m {isLastStep ? 'ke EXIT' : 'ke titik berikutnya'}
              </div>
            )}
          </div>

          {totalSteps > 1 && (
            <div style={{ position: 'absolute', top: '62%', left: 16, right: 16, zIndex: 5 }}>
              <div style={{ background: 'rgba(10,41,71,0.75)', backdropFilter: 'blur(8px)', borderRadius: 12, padding: '10px 14px', fontSize: 12, color: 'rgba(243,228,201,0.8)', textAlign: 'center' }}>
                {isWebXR
                  ? 'Mode AR aktif. Ketuk "Lanjut" saat tiba di setiap titik.'
                  : !cameraAvailable
                    ? 'Panduan kompas aktif. Ikuti arah panah dan ketuk "Lanjut" saat tiba di setiap titik.'
                    : 'Posisi nyata tidak dapat dilacak di dalam gedung. Ketuk "Lanjut" saat tiba di setiap titik.'}
              </div>
            </div>
          )}

          <div style={{ position: 'absolute', bottom: 36, left: 16, right: 16, zIndex: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {totalSteps > 1 && !isLastStep && (
              <button
                onClick={handleNext}
                style={{ background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.4)', backdropFilter: 'blur(8px)', borderRadius: 14, color: '#fff', fontSize: 16, fontWeight: 700, minHeight: 48, cursor: 'pointer' }}
              >
                Lanjut ke titik berikutnya →
              </button>
            )}
            <button
              onClick={onReachedExit}
              style={{ background: C.safetyGreen, border: 'none', borderRadius: 14, color: '#0A1A0E', fontSize: 17, fontWeight: 700, minHeight: 52, cursor: 'pointer' }}
            >
              Sampai di EXIT!
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const glassBtn: React.CSSProperties = {
  background: 'rgba(255,255,255,0.15)',
  border: '1px solid rgba(255,255,255,0.35)',
  backdropFilter: 'blur(8px)',
  borderRadius: 10,
  color: '#fff',
  fontSize: 14,
  fontWeight: 600,
  padding: '8px 16px',
  cursor: 'pointer',
};
