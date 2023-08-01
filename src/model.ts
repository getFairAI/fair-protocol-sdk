// model related functionality
// list models
import { DEFAULT_TAGS_RETRO, MODEL_CREATION_PAYMENT_TAGS } from './constants';
import { IContractEdge, IEdge } from './interface';
import { findByTags } from './queries';
import { findTag, getTxOwner, isFakeDeleted } from './utils';

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
  private readonly _owner: string;
  private readonly _name: string;
  private readonly _txid: string;
  private readonly _rawTx: IContractEdge | IEdge;
  private readonly _paymentId: string;
  private readonly _timestamp: number;

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
    const tags = [...DEFAULT_TAGS_RETRO, ...MODEL_CREATION_PAYMENT_TAGS];
    const first = 10;
    const after = hasNextPage ? requestTxs[requestTxs.length - 1].cursor : undefined;

    const result = await findByTags(tags, first, after);
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
