// model related functionality
// list models
import { FIND_BY_TAGS } from './queries';
import { DEFAULT_TAGS_RETRO, MODEL_CREATION_PAYMENT_TAGS } from './constants';
import { IContractEdge, IContractQueryResult, IEdge } from './interface';
import { client, findTag, getTxOwner, isFakeDeleted } from './utils';

/**
 * @description Class to wrap a Fair Protocol Model tx with easy to access proeprties
 * @property {string} owner - Owner of the Model
 * @property {string} name - Name of the Model
 * @property {string} txid - Transaction Id of the Model
 * @property {IContractEdge | IEdge} raw - Raw transaction object
 * @property {string} paymentId - Payment Id of the Model
 * @property {number} timestamp - Timestamp of the Tx
 */
class FairModel {
  private _owner: string;
  private _name: string;
  private _txid: string;
  private _rawTx: IContractEdge | IEdge;
  private _paymentId: string;
  private _timestamp: number;

  constructor(tx: IContractEdge | IEdge) {
    const txid = findTag(tx, 'modelTransaction');
    if (!txid) {
      throw new Error('Invalid model transaction');
    }

    this._owner = getTxOwner(tx);
    this._name = findTag(tx, 'modelName') ?? 'Name Not available';
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

const listModels = async () => {
  let hasNextPage = false;
  let requestTxs: IContractEdge[] = [];
  do {
    const result: IContractQueryResult = await client.request(FIND_BY_TAGS, {
      tags: [...DEFAULT_TAGS_RETRO, ...MODEL_CREATION_PAYMENT_TAGS],
      first: 10,
      after: hasNextPage ? requestTxs[requestTxs.length - 1].cursor : undefined,
    });
    requestTxs = requestTxs.concat(result.transactions.edges);
    hasNextPage = result.transactions.pageInfo.hasNextPage;
  } while (hasNextPage);

  const filtered: FairModel[] = [];
  for (const tx of requestTxs) {
    const modelId = findTag(tx, 'modelTransaction') as string;
    const modelOwner = findTag(tx, 'sequencerOwner') as string;
    if (await isFakeDeleted(modelId, modelOwner, 'model')) {
      // ignore tx
    } else {
      filtered.push(new FairModel(tx));
    }
  }
  return filtered;
};

export { listModels, FairModel };
