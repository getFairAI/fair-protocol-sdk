import fs from 'node:fs';
import type NodeBundlr from '@bundlr-network/client/build/cjs/node/bundlr';
import { JWKInterface } from 'warp-contracts';
import { getResponses, getAllResponses, getRequests, inference } from './actions';
import { FairModel, FairScript, FairOperator } from './classes';
import { listModels, listScripts, listOperators } from './queries';
import { IEdge, IContractEdge, logLevels } from './types';
import {
  jwkToAddress,
  getById,
  findTag,
  logger,
  connectToU,
  initBundlr,
  getArBalance,
  getUBalance,
} from './utils';
import {
  MODEL_CREATION_PAYMENT,
  SCRIPT_CREATION_PAYMENT,
  REGISTER_OPERATION,
  MAX_MESSAGE_SIZE,
  U_DIVIDER,
} from './utils/constants';

const walletError = 'Wallet not set';

export default abstract class FairSDK {
  // no constructor, only static methods
  private static _model: FairModel;
  private static _script: FairScript;
  private static _operator: FairOperator;
  private static _wallet: JWKInterface;
  private static _address: string;
  private static _bundlr: NodeBundlr;

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
    if (!this._wallet) {
      throw new Error(walletError);
    } else {
      return (async () => {
        if (!this._address) {
          this._address = await jwkToAddress(this._wallet);
        } else {
          // ignore
        }
        return this._address;
      })();
    }
  }

  public static get queries() {
    return {
      listModels,
      listScripts,
      listOperators,
      getResponses: (requestIds: string[]) => getResponses(this._address, requestIds),
      getAllResponses: (limit: number) => getAllResponses(this._address, limit),
      getRequests: (limit: number) => getRequests(this._address, limit),
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

  public static setWallet = async (wallet: string | JWKInterface) => {
    if (wallet instanceof Object) {
      this._wallet = wallet;
    } else if (typeof wallet === 'string') {
      // wallet is path try to read from file
      const JWK: JWKInterface = JSON.parse(fs.readFileSync(wallet).toString());
      this._wallet = JWK;
    } else {
      throw new Error('Invalid wallet; Please provide a path to a wallet file or a JWK object');
    }

    this._address = ''; // reset address
    connectToU(this._wallet);
    this._bundlr = await initBundlr(this._wallet);
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
    if (!this._wallet) {
      throw new Error(walletError);
    } else if (!this._address) {
      // user has not called address yet
      this._address = await jwkToAddress(this._wallet);
    } else {
      // ignore
    }

    return getUBalance(this._address);
  };

  public static prompt = async (content: string) => {
    if (!this._address || !this._wallet) {
      throw new Error(walletError);
    }

    if (!this._bundlr) {
      throw new Error('Bundlr not initialized');
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
        this._bundlr,
      );
      logger.info(`Inference result: ${JSON.stringify(result)}`);
    }
  };
}
