import { WarpFactory, JWKInterface, Tags } from 'warp-contracts';
import { U_CONTRACT_ID, U_DIVIDER } from './constants';
import { UState } from '../types';

const warp = WarpFactory.forMainnet();

const contract = warp.contract(U_CONTRACT_ID).setEvaluationOptions({
  remoteStateSyncSource: 'https://dre-6.warp.cc/contract',
  remoteStateSyncEnabled: true,
  unsafeClient: 'skip',
  allowBigInt: true,
  internalWrites: true,
});

// warp u funcitonality
export const connectToU = (jwk: JWKInterface) => {
  contract.connect(jwk);
};

export const getUBalance = async (address: string) => {
  try {
    const { cachedValue } = await contract.readState();

    const balance = (cachedValue as UState).state.balances[address];

    return parseFloat(balance) / U_DIVIDER;
  } catch (error) {
    return 0;
  }
};

export const sendU = async (to: string, amount: string | number, tags: Tags) => {
  if (typeof amount === 'number') {
    amount = amount.toString();
  }

  const result = await contract.writeInteraction(
    {
      function: 'transfer',
      target: to,
      qty: amount,
    },
    { tags, strict: true },
  );

  return result?.originalTxId;
};
