import Bundlr from '@bundlr-network/client/build/cjs/cjsIndex';
import fs from 'fs';
import { glob } from 'glob';

const main = async () => {
  const wallet = './wallet.json';

  const jwk = JSON.parse(fs.readFileSync(wallet).toString());
  
  // NOTE: Depending on the version of JavaScript you use, you may need to use
  // the commented out line below to create a new Bundlr object.
  // const bundlr = new Bundlr("http://node1.bundlr.network", "arweave", jwk);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bundlr = new Bundlr('https://node2.bundlr.network', 'arweave', jwk ); // use node2 for free uploads up to 100kb
  
  // Get loaded balance in atomic units
  const atomicBalance = await bundlr.getLoadedBalance();
  console.log(`node balance (atomic units) = ${atomicBalance}`);
  
  // Convert balance to an easier to read format
  const convertedBalance = bundlr.utils.unitConverter(atomicBalance);
  console.log(`node balance (converted) = ${convertedBalance}`);
  
  // Print your wallet address
  console.log(`wallet address = ${bundlr.address}`);
  // all js files, but don't look in node_modules
  const sdkFiles = await glob('**/*.tgz', { ignore: [ 'node_modules/**', 'src/**', 'dist/**' ] });
  if (sdkFiles.length > 1) {
    console.log(`Found ${sdkFiles.length} SDK files. Please remove older versions and try again.`);
    return;
  } else if (sdkFiles.length === 0) {
    console.log('No SDK files found. Please run `npm run build && npm pack .` first.');
    return;
  } else {
    // continue
  }
  console.log(`Uploading ${sdkFiles[0]}`);

  const tags = [
    { name: 'Content-Type', value: 'application/gzip' },
    { name: 'App-Name', value: 'Fair Protocol SDK' },
    { name: 'App-Version', value: '1.0.0' },
    { name: 'Title', value: 'Fair Protocol SDK' },
    { name: 'Description', value: 'Software Development kit for Fair Protocol funcitonality' },
    { name: 'Type', value: 'zip' },
  ];

  const response = await bundlr.uploadFile(sdkFiles[0], { tags });
  console.log(`SDK Uploaded https://arweave.net/${response?.id}`);
};

(async () => await main())();