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

import { IContractEdge, IEdge } from '../types/arweave';
import { findTag, getTxOwner } from '../utils/common';

/**
 * @description Class to wrap a Fair Protocol Script tx with easy to access proeprties
 * @property {string} owner - Owner of the script
 * @property {string} name - Name of the script
 * @property {string} txid - Transaction Id of the script
 * @property {IContractEdge | IEdge} raw - Raw transaction object
 * @property {string} paymentId - Payment Id of the script
 * @property {number} timestamp - Timestamp of the script
 */
export class FairScript {
  private readonly _owner: string;
  private readonly _name: string;
  private readonly _txid: string;
  private readonly _rawTx: IContractEdge | IEdge;
  private readonly _paymentId: string;
  private readonly _timestamp: number;

  constructor(tx: IContractEdge | IEdge) {
    const txid = findTag(tx, 'scriptTransaction');
    if (!txid) {
      throw new Error('Invalid script transaction');
    }

    this._owner = getTxOwner(tx);
    this._name = findTag(tx, 'scriptName') ?? 'Name Not available';
    this._txid = txid;
    this._rawTx = tx;
    this._paymentId = tx.node.id;
    this._timestamp = parseInt(findTag(tx, 'unixTime') as string, 10);
  }

  public get owner() {
    return this._owner;
  }

  public get name() {
    return this._name;
  }

  public get txid() {
    return this._txid;
  }

  public get raw() {
    return this._rawTx;
  }

  public get paymentId() {
    return this._paymentId;
  }

  public get timestamp() {
    return this._timestamp;
  }
}
