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
