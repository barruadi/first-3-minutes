import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { FRAME_COUNT, generateTargetTimestamps, totalPayloadBytes } from './scanMachine';

export type PreparedFrame = { uri: string; sizeBytes: number; timestampMs: number };
const ROOT = `${FileSystem.cacheDirectory ?? ''}spatial-scans/`;

export async function purgeScanCache(): Promise<void> {
  if (!FileSystem.cacheDirectory) throw new Error('Direktori cache tidak tersedia');
  const info = await FileSystem.getInfoAsync(ROOT);
  if (info.exists) await FileSystem.deleteAsync(ROOT, { idempotent: true });
  await FileSystem.makeDirectoryAsync(ROOT, { intermediates: true });
}

async function manipulate(uri: string, quality: number, dimensions?: { width: number; height: number }): Promise<string> {
  const resize = dimensions && Math.max(dimensions.width, dimensions.height) > 1080
    ? dimensions.width >= dimensions.height ? { width: 1080 } : { height: 1080 }
    : undefined;
  const result = await ImageManipulator.manipulateAsync(uri, resize ? [{ resize }] : [], {
    compress: quality,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return result.uri;
}

async function describe(uri: string, timestampMs: number): Promise<PreparedFrame> {
  const info = await FileSystem.getInfoAsync(uri, { size: true });
  if (!info.exists || info.isDirectory || typeof info.size !== 'number') throw new Error('Frame hasil kompresi tidak dapat dibaca');
  return { uri, timestampMs, sizeBytes: info.size };
}

export async function extractAndCompressFrames(videoUri: string): Promise<PreparedFrame[]> {
  const timestamps = generateTargetTimestamps();
  const initial: PreparedFrame[] = [];
  for (const timestampMs of timestamps) {
    const thumb = await VideoThumbnails.getThumbnailAsync(videoUri, { time: Math.max(0, timestampMs - 1), quality: 1 });
    initial.push(await describe(await manipulate(thumb.uri, 0.7, thumb), timestampMs));
    await FileSystem.deleteAsync(thumb.uri, { idempotent: true });
  }

  if (initial.length !== FRAME_COUNT) throw new Error('Ekstraksi tidak menghasilkan tepat 15 frame');
  if (totalPayloadBytes(initial) <= 4 * 1024 * 1024) return initial;

  const recompressed: PreparedFrame[] = [];
  for (const frame of initial) {
    recompressed.push(await describe(await manipulate(frame.uri, 0.5), frame.timestampMs));
    await FileSystem.deleteAsync(frame.uri, { idempotent: true });
  }
  return recompressed;
}

export async function cleanupUris(uris: readonly string[]): Promise<void> {
  await Promise.all(uris.map((uri) => FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined)));
}
