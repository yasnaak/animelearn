import path from 'path';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import type { EpisodeCompositionProps } from '@/remotion/types';

let bundleLocation: string | null = null;

async function ensureBundle(): Promise<string> {
  if (bundleLocation) return bundleLocation;

  const entryPoint = path.resolve(
    process.cwd(),
    'src/remotion/index.ts',
  );

  bundleLocation = await bundle({
    entryPoint,
    webpackOverride: (config) => config,
  });

  return bundleLocation;
}

export async function renderEpisodeMp4(
  props: EpisodeCompositionProps,
  outputPath: string,
): Promise<string> {
  const bundlePath = await ensureBundle();

  const composition = await selectComposition({
    serveUrl: bundlePath,
    id: 'Episode',
    inputProps: props as unknown as Record<string, unknown>,
  });

  await renderMedia({
    composition,
    serveUrl: bundlePath,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps: props as unknown as Record<string, unknown>,
  });

  return outputPath;
}
