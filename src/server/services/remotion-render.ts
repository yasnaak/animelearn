import path from 'path';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import type {
  EpisodeCompositionProps,
  EpisodeCompositionPropsV2,
} from '@/remotion/types';

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
  props: EpisodeCompositionProps | EpisodeCompositionPropsV2,
  outputPath: string,
): Promise<string> {
  const bundlePath = await ensureBundle();

  // Detect V2 by checking for coldOpen field
  const isV2 = 'coldOpen' in props;
  const compositionId = isV2 ? 'EpisodeV2' : 'Episode';

  const composition = await selectComposition({
    serveUrl: bundlePath,
    id: compositionId,
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
