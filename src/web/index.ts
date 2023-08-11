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
import { inference } from './actions/inference';
import {
  MODEL_CREATION_PAYMENT,
  SCRIPT_CREATION_PAYMENT,
  REGISTER_OPERATION,
  MAX_MESSAGE_SIZE,
  U_DIVIDER,
} from '../common/utils/constants';
import { jwkToAddress, getArBalance } from '../common/utils/arweave';
import { findTag, logger } from '../common/utils/common';
import { getById } from '../common/utils/queries';
import { connectToU, getUBalance } from '../common/utils/warp';
import { FairModel } from '../common/classes/model';
import { FairOperator } from '../common/classes/operator';
import { FairScript } from '../common/classes/script';
import { listModels } from '../common/queries/model';
import { listOperators } from '../common/queries/operator';
import { listScripts } from '../common/queries/script';
import { IEdge, IContractEdge, logLevels } from '../common/types/arweave';
import { getAllResponses, getRequests, getResponses } from '../common/queries/inference';

const walletError = 'Wallet not connected';

export default abstract class FairSDKWeb {
  // no constructor, only static methods
  private static _model: FairModel;
  private static _script: FairScript;
  private static _operator: FairOperator;
  private static _wallet: JWKInterface;
  private static _address: string;

  public static get model() {
    return this._model;
  }

  public static get script() {
    return this._script;
  }

  public static get operator() {
    return this._operator;
  }

  public static get address() {
    if (!this._address) {
      throw new Error(walletError);
    } else {
      return this._address;
    }
  }

  public static get queries() {
    return {
      listModels,
      listScripts,
      listOperators,
      getResponses: async (requestIds: string[]) => {
        if (!this._address) {
          throw new Error(walletError);
        } else {
          return getResponses(this._address, requestIds);
        }
      },
      getAllResponses: (limit: number) => {
        if (!this._address) {
          throw new Error(walletError);
        } else {
          return getAllResponses(this._address, limit);
        }
      },
      getRequests: (limit: number) => {
        if (!this._address) {
          throw new Error(walletError);
        } else {
          return getRequests(this._address, limit);
        }
      },
    };
  }

  private static readonly _parseTx = async (
    tx: string | IEdge | IContractEdge,
    operationName: string,
    errorMessage: string,
  ) => {
    if (tx instanceof Object) {
      return tx;
    } else {
      const fullTx = await getById(tx);
      if (!fullTx) {
        throw new Error('Tx not found');
      } else if (findTag(fullTx, 'operationName') !== operationName) {
        throw new Error(errorMessage);
      } else {
        return fullTx;
      }
    }
  };

  public static use = async (
    type: 'model' | 'script' | 'operator',
    tx: string | IEdge | IContractEdge,
  ) => {
    switch (type) {
      case 'model':
        this._model = new FairModel(
          await this._parseTx(
            tx,
            MODEL_CREATION_PAYMENT,
            "Invalid model transaction, please use the txid of a 'Model Creation Payment' transaction",
          ),
        );
        break;
      case 'script':
        this._script = new FairScript(
          await this._parseTx(
            tx,
            SCRIPT_CREATION_PAYMENT,
            "Invalid script transaction, please use the txid of a 'Scrip Creation Payment' transaction",
          ),
        );
        break;
      case 'operator':
        this._operator = new FairOperator(
          await this._parseTx(
            tx,
            REGISTER_OPERATION,
            "Invalid operator transaction, please use the txid of a 'Operator Registration' transaction",
          ),
        );
        break;
      default:
        throw new Error(`Invalid type ${type}`);
    }

    return this;
  };

  public static setLogLevels = (level: logLevels) => {
    logger.level = level;
  };

  public static connectWallet = async () => {
    if (!window?.arweaveWallet) {
      throw new Error("Could not detect to 'ArConnect' Arweave Wallet. Please install ArConnect");
    } else {
      await window.arweaveWallet.connect([
        'ACCESS_ADDRESS',
        'SIGN_TRANSACTION',
        'DISPATCH',
        'ACCESS_PUBLIC_KEY',
        'SIGNATURE',
      ]);
      this._address = await window.arweaveWallet.getActiveAddress();
      connectToU('use_wallet');
    }
  };

  public static getArBalance = async () => {
    if (!this._wallet) {
      throw new Error(walletError);
    } else if (!this._address) {
      // user has not called address yet
      this._address = await jwkToAddress(this._wallet);
    } else {
      // ignore
    }

    return getArBalance(this._address);
  };

  public static getUBalance = async () => {
    if (!this._address) {
      throw new Error(walletError);
    } else {
      return getUBalance(this._address);
    }
  };

  public static prompt = async (content: string) => {
    if (!this._address || !this._wallet) {
      throw new Error(walletError);
    }

    if (this._model && this._script && this._operator) {
      const dataSize = Buffer.from(content).byteLength;

      if (dataSize > MAX_MESSAGE_SIZE) {
        throw new Error(`Data size is too large, max size is ${MAX_MESSAGE_SIZE} bytes`);
      }

      const uBalance = await getUBalance(this._address);
      const parsedOperatorFee = parseFloat(this._operator.fee) / U_DIVIDER;
      if (uBalance < parsedOperatorFee) {
        throw new Error(`Insufficient U balance, needed ${parsedOperatorFee} U`);
      }
      const result = await inference(
        this._model,
        this._script,
        this._operator,
        content,
        this._address,
      );
      logger.info(`Inference result: ${JSON.stringify(result)}`);
    }
  };
}
