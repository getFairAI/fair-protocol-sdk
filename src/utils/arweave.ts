import Arweave from 'arweave';
import { JWKInterface } from 'warp-contracts';
import { NET_ARWEAVE_URL } from './constants';

const arweave = Arweave.init({
  host: NET_ARWEAVE_URL.split('//')[1],
  port: 443,
  protocol: 'https',
});

export const jwkToAddress = async (jwk: JWKInterface) => arweave.wallets.jwkToAddress(jwk);

export const getArBalance = async (address: string) => {
  const winstonBalance = await arweave.wallets.getBalance(address);

  return arweave.ar.winstonToAr(winstonBalance);
};
