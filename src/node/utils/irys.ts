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

import { JWKInterface } from 'warp-contracts';
import { AR_IO_UPLOAD_URL } from '../../common/utils/constants';
import Irys from '@irys/sdk';

export const initIrys = async (jwk?: JWKInterface) => {
  const irys = new Irys({
    url: AR_IO_UPLOAD_URL,
    token: 'arweave',
    key: jwk || window.arweaveWallet,
  });
  await irys.ready();

  return irys;
};
