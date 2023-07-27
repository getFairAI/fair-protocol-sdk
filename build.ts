import * as esbuild from 'esbuild';

try {
  await esbuild.build({
    entryPoints: [ './src/index.ts' ],
    bundle: true,
    minify: true,
    outdir: './dist',
  });
} catch (e) {
  console.error(e);
}