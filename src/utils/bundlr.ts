import { JWKInterface } from 'warp-contracts';
import Bundlr from '@bundlr-network/client/build/cjs/cjsIndex';
import { NODE2_BUNDLR_URL } from './constants';

export const initBundlr = async (jwk: JWKInterface) => {
  const bundlr = new Bundlr(NODE2_BUNDLR_URL, 'arweave', jwk);
  await bundlr.ready();

  return bundlr;
};
