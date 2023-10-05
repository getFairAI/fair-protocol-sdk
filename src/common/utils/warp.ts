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

import { WarpFactory, JWKInterface, Tags } from 'warp-contracts';
import { U_CONTRACT_ID, U_DIVIDER } from './constants';
import { UState } from '../types/u';
import { logger } from './common';

const warp = WarpFactory.forMainnet();
const dreUrl = 'https://dre-u.warp.cc';

const contract = warp.contract(U_CONTRACT_ID).setEvaluationOptions({
  remoteStateSyncSource: `${dreUrl}/contract`,
  remoteStateSyncEnabled: true,
  unsafeClient: 'skip',
  allowBigInt: true,
  internalWrites: true,
});

// warp u funcitonality
export const connectToU = (wallet: JWKInterface | 'use_wallet') => {
  contract.connect(wallet);
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
    { tags, strict: true, disableBundling: true },
  );

  return result?.originalTxId;
};

export const isUTxValid = async (sequencerTxID?: string) => {
  if (!sequencerTxID) {
    logger.error('Invalid Sequencer Tx Id');
    return false;
  }

  try {
    const url = `${dreUrl}/validity?id=${sequencerTxID}&contractId=${U_CONTRACT_ID}`;
    const result = await fetch(url);
    const parsedResult: { validity: boolean } = await result.json();

    return parsedResult.validity;
  } catch (error) {
    logger.error(`Error validating U tx: ${error}`);
    return false;
  }
};
