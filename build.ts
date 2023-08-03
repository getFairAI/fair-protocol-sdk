import * as esbuild from 'esbuild';
import { nodeExternalsPlugin } from 'esbuild-node-externals';
import { polyfillNode } from 'esbuild-plugin-polyfill-node';

try {
  const sharedConfig = {
    entryPoints: [ './src/index.ts' ], // entryPoints,
    bundle: true,
    minify: true,
    plugins: [ nodeExternalsPlugin() ],
    // outdir: 'dist',
  };

  await esbuild.build({
    ...sharedConfig,
    platform: 'node', // for CJS
    outfile: 'dist/index.js',
  });

  await esbuild.build({
    ...sharedConfig,
    outfile: 'dist/index.esm.js',
    platform: 'neutral', // for ESM
    format: 'esm',
    plugins: sharedConfig.plugins.concat([
      polyfillNode({
        // Options (optional)
        polyfills: {
          fs: true,
        }
      }),
	  ]),
  });
} catch (e) {
  console.error(e);
}