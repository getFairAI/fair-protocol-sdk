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

import fs from 'fs';
import { glob } from 'glob';
import { default as Pino } from 'pino';
import Irys from '@irys/sdk';

export const logger = Pino({
  name: 'Fair-SDK Deploy',
  level: 'debug',
});

const main = async () => {
  const wallet = './wallet.json';

  const jwk = JSON.parse(fs.readFileSync(wallet).toString());
  
  // NOTE: Depending on the version of JavaScript you use, you may need to use
  // the commented out line below to create a new Bundlr object.
  // const bundlr = new Bundlr("http://node1.bundlr.network", "arweave", jwk);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const irys = new Irys({ url: 'https://up.arweave.net', token: 'arweave', key: jwk }); // use ario for free uploads
  
  // Get loaded balance in atomic units
  const atomicBalance = await irys.getLoadedBalance();
  logger.info(`node balance (atomic units) = ${atomicBalance}`);
  
  // Convert balance to an easier to read format
  const convertedBalance = irys.utils.unitConverter(atomicBalance);
  logger.info(`node balance (converted) = ${convertedBalance}`);
  
  // Print your wallet address
  logger.info(`wallet address = ${irys.address}`);
  // all js files, but don't look in node_modules
  const sdkFiles = await glob('**/*.tgz', { ignore: [ 'node_modules/**', 'src/**', 'dist/**' ] });
  if (sdkFiles.length > 1) {
    logger.error(`Found ${sdkFiles.length} SDK files. Please remove older versions and try again.`);
    return;
  } else if (sdkFiles.length === 0) {
    logger.error('No SDK files found. Please run `npm run build && npm pack .` first.');
    return;
  } else {
    // continue
  }
  logger.info(`Uploading ${sdkFiles[0]}`);

  const tags = [
    { name: 'Content-Type', value: 'application/gzip' },
    { name: 'App-Name', value: 'Fair Protocol SDK' },
    { name: 'App-Version', value: '1.0.1' },
    { name: 'Title', value: 'Fair Protocol SDK' },
    { name: 'Description', value: 'Software Development kit for Fair Protocol funcitonality' },
    { name: 'Type', value: 'zip' },
  ];

  const response = await irys.uploadFile(sdkFiles[0], { tags });
  logger.info(`SDK Uploaded https://arweave.net/${response?.id}`);
};

(async () => main())();