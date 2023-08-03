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
import { getTxOwner, findTag } from '../utils/common';

/**
 * @description Class to wrap a Fair Protocol Model tx with easy to access proeprties
 * @property {string} owner - Owner of the Model
 * @property {string} name - Name of the Model
 * @property {string} txid - Transaction Id of the Model
 * @property {IContractEdge | IEdge} raw - Raw transaction object
 * @property {number} timestamp - Timestamp of the Tx
 * @property {string} fee - Fee of the operator
 * @property {string} operationScript - Operation script of the operator
 * @property {string} operationScriptName - Operation script name of the operator
 */
export class FairOperator {
  private readonly _owner: string;
  private readonly _name: string;
  private readonly _txid: string;
  private readonly _raw: IContractEdge | IEdge;
  private readonly _timestamp: number;
  private readonly _fee: string;
  private readonly _operationScript: string;
  private readonly _operationScriptName: string;

  constructor(tx: IContractEdge | IEdge) {
    this._owner = getTxOwner(tx);
    this._name = findTag(tx, 'operatorName') ?? 'Name Not available';
    this._fee = findTag(tx, 'operatorFee') ?? 'Fee Not available';
    this._txid = tx.node.id;
    this._raw = tx;
    this._timestamp = parseInt(findTag(tx, 'unixTime') as string, 10);
    this._operationScript = findTag(tx, 'scriptTransaction') ?? 'Script Not available';
    this._operationScriptName = findTag(tx, 'scriptName') ?? 'Script Name Not available';
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
    return this._raw;
  }

  public get timestamp() {
    return this._timestamp;
  }

  public get fee() {
    return this._fee;
  }

  public get operationScript() {
    return this._operationScript;
  }

  public get operationScriptName() {
    return this._operationScriptName;
  }
}
