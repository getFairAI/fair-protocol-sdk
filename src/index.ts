import { MODEL_CREATION_PAYMENT, REGISTER_OPERATION, SCRIPT_CREATION_PAYMENT } from './constants';
import { IContractEdge, IEdge } from './interface';
import { FairModel, listModels } from './model';
import { FairOperator, listOperators } from './operator';
import { FairScript, listScripts } from './script';
import { findTag, getById, logger } from './utils';

type logLevels = 'fatal' | 'error' | 'trace' | 'debug' | 'info' | 'warn';

export abstract class FairSDK {
  // no constructor, only static methods
  private static _model: FairModel;
  private static _script: FairScript;
  private static _operator: FairOperator;

  public static get model() {
    return this._model;
  }

  public static get script() {
    return this._script;
  }

  public static get operator() {
    return this._operator;
  }

  public static get queries() {
    return {
      listModels,
      listScripts,
      listOperators,
    };
  }

  private static _parseTx = async (
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
}
