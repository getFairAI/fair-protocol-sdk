import { DEFAULT_TAGS_RETRO, SCRIPT_CREATION_PAYMENT_TAGS, TAG_NAMES } from './constants';
import { IContractEdge, IEdge, ITagFilter } from './interface';
import { findByTags } from './queries';
import {
  filterByUniqueScriptTxId,
  filterPreviousVersions,
  findTag,
  getTxOwner,
  isFakeDeleted,
  logger,
} from './utils';

type listScriptsParam = string | IContractEdge | IEdge;

/**
 * @description Class to wrap a Fair Protocol Script tx with easy to access proeprties
 * @property {string} owner - Owner of the script
 * @property {string} name - Name of the script
 * @property {string} txid - Transaction Id of the script
 * @property {IContractEdge | IEdge} raw - Raw transaction object
 * @property {string} paymentId - Payment Id of the script
 * @property {number} timestamp - Timestamp of the script
 */
class FairScript {
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

const commonTags: ITagFilter[] = [...DEFAULT_TAGS_RETRO, ...SCRIPT_CREATION_PAYMENT_TAGS];

const _queryScripts = async (tags: ITagFilter[]) => {
  let hasNextPage = false;
  let requestTxs: IContractEdge[] = [];
  do {
    logger.debug(`Fetching scripts with tags: ${JSON.stringify(tags)}`);
    const after = hasNextPage ? requestTxs[requestTxs.length - 1].cursor : undefined;
    const first = 10;
    const result = await findByTags(tags, first, after);

    requestTxs = requestTxs.concat(result.transactions.edges);
    hasNextPage = result.transactions.pageInfo.hasNextPage;
    if (hasNextPage) {
      logger.debug('Fetching next page of scripts');
    } else {
      logger.debug('No more pages to fetch');
    }
  } while (hasNextPage);

  return requestTxs;
};

const _filterScripts = async (txs: IContractEdge[]) => {
  const filtered: FairScript[] = [];
  logger.debug('Filtering scripts');
  const uniqueScripts = filterByUniqueScriptTxId<IContractEdge[]>(txs);
  const filteredScritps = filterPreviousVersions<IContractEdge[]>(uniqueScripts as IContractEdge[]);
  for (const tx of filteredScritps) {
    const modelTx = findTag(tx, 'scriptTransaction') as string;
    const modelOwner = getTxOwner(tx);
    if (await isFakeDeleted(modelTx, modelOwner, 'script')) {
      // ignore tx
    } else {
      filtered.push(new FairScript(tx));
    }
  }

  return filtered;
};

/**
 * Lists all scripts or scripts for a given model available in Fair Protocol
 * It applies the necessary filters to reproduce the same behavior as the Fair Protocol UI
 * @returns { FairScript[]} List of FairScript objects
 */
const _listAllScripts = async () => {
  const requestTxs = await _queryScripts(commonTags);

  logger.debug('Filtering operators');
  const filtered = await _filterScripts(requestTxs);

  return filtered;
};

const _listScriptsWithModelId = async (modelId: string) => {
  const tags = [
    ...DEFAULT_TAGS_RETRO,
    ...(modelId ? [{ name: TAG_NAMES.modelTransaction, values: [modelId] }] : []),
    ...SCRIPT_CREATION_PAYMENT_TAGS,
  ];

  const requestTxs = await _queryScripts(tags);

  logger.debug('Filtering operators');
  const filtered = await _filterScripts(requestTxs);

  return filtered;
};

const _listScriptsWithModelTx = async (modelTx: IContractEdge | IEdge) => {
  const operationName = findTag(modelTx, 'operationName') as string;

  const tags = [
    ...commonTags,
    { name: TAG_NAMES.modelName, values: [findTag(modelTx, 'modelName') as string] },
    { name: TAG_NAMES.modelCreator, values: [getTxOwner(modelTx)] },
  ];

  if (operationName === 'Model Creation Payment') {
    tags.push({
      name: TAG_NAMES.modelTransaction,
      values: [findTag(modelTx, 'modelTransaction') as string],
    });
  } else if (operationName === 'Model Creation') {
    tags.push({ name: TAG_NAMES.modelTransaction, values: [modelTx.node.id] });
  } else {
    throw new Error('Invalid Model transaction');
  }

  const requestTxs = await _queryScripts(tags);

  logger.debug('Filtering operators');
  const filtered = await _filterScripts(requestTxs);

  return filtered;
};

/**
 * List all available scripts
 * @returns { FairScript[]} List of FairScript objects
 */
function listScripts(): Promise<FairScript[]>;
/**
 * List Scripts for a specific model
 * @param modelId Transaction Id of the 'Model Creation' transaction
 * @returns { FairScript[]} List of FairScript objects
 */
function listScripts(modelId?: string): Promise<FairScript[]>;
/**
 * List Scripts for a specific model
 * @param modelTx Raw Transaction object of the 'Model Creation' transaction or 'Model Creation Payment' transaction\
 * @returns { FairScript[]} List of FairScript objects
 */
function listScripts(modelTx: IContractEdge | IEdge): Promise<FairScript[]>;

function listScripts(param?: listScriptsParam) {
  if (!param) {
    return _listAllScripts();
  } else if (param instanceof Object) {
    return _listScriptsWithModelTx(param);
  } else if (typeof param === 'string') {
    return _listScriptsWithModelId(param);
  } else {
    throw new Error('Invalid parameter');
  }
}

export { listScripts, FairScript };
