/*
 * Copyright 2023 Fair protocol
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * 
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as esbuild from 'esbuild';
import { nodeExternalsPlugin } from 'esbuild-node-externals';
import { polyfillNode } from 'esbuild-plugin-polyfill-node';
import { default as Pino } from 'pino';

export const logger = Pino({
  name: 'Fair-SDK Build',
  level: 'debug',
});

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
  logger.error(e);
}