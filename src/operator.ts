import { DEFAULT_TAGS, OPERATOR_REGISTRATION_PAYMENT_TAGS, TAG_NAMES } from './constants';
import { IContractEdge, IContractQueryResult, IEdge, ITagFilter } from './interface';
import { FIND_BY_TAGS } from './queries';
import { client, findTag, getTxOwner, isValidRegistration, logger } from './utils';

type listOperatorsParam = string | IContractEdge | IEdge;

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
class FairOperator {
  private _owner: string;
  private _name: string;
  private _txid: string;
  private _raw: IContractEdge | IEdge;
  private _timestamp: number;
  private _fee: string;
  private _operationScript: string;
  private _operationScriptName: string;

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

const commonTags = [...DEFAULT_TAGS, ...OPERATOR_REGISTRATION_PAYMENT_TAGS];

const _queryOperators = async (tags: ITagFilter[]) => {
  let hasNextPage = false;
  let requestTxs: IContractEdge[] = [];
  do {
    logger.debug(`Fetching operators with tags: ${JSON.stringify(tags)}`);
    const result: IContractQueryResult = await client.request(FIND_BY_TAGS, {
      tags,
      first: 10,
      after: hasNextPage ? requestTxs[requestTxs.length - 1].cursor : undefined,
    });
    requestTxs = requestTxs.concat(result.transactions.edges);
    hasNextPage = result.transactions.pageInfo.hasNextPage;
    if (hasNextPage) {
      logger.debug('Fetching next page of operators');
    } else {
      logger.debug('No more pages to fetch');
    }
  } while (hasNextPage);

  return requestTxs;
};

const _filterOperators = async (txs: IContractEdge[]) => {
  const filtered: FairOperator[] = [];
  for (const tx of txs) {
    const opFee = findTag(tx, 'operatorFee') as string;
    const scriptName = findTag(tx, 'scriptName') as string;
    const scriptCurator = findTag(tx, 'scriptCurator') as string;
    const registrationOwner = (findTag(tx, 'sequencerOwner') as string) ?? tx.node.owner.address;

    if (
      await isValidRegistration(tx.node.id, opFee, registrationOwner, scriptName, scriptCurator)
    ) {
      filtered.push(new FairOperator(tx));
    }
  }

  return filtered;
};

const _listOperatorsWithScriptId = async (scriptId?: string) => {
  const tags = [
    ...commonTags,
    ...(scriptId ? [{ name: TAG_NAMES.scriptTransaction, values: [scriptId] }] : []),
  ];
  const requestTxs = await _queryOperators(tags);

  logger.debug('Filtering operators');
  const filtered = await _filterOperators(requestTxs);

  return filtered;
};

const _listOperatorsWithScriptTx = async (scriptTx: IContractEdge | IEdge) => {
  const operationName = findTag(scriptTx, 'operationName') as string;

  const tags = [
    ...commonTags,
    { name: TAG_NAMES.scriptName, values: [findTag(scriptTx, 'scriptName') as string] },
    { name: TAG_NAMES.scriptCurator, values: [findTag(scriptTx, 'scriptCurator') as string] },
  ];

  if (operationName === 'Script Creation Payment') {
    tags.push({
      name: TAG_NAMES.scriptTransaction,
      values: [findTag(scriptTx, 'scriptTransaction') as string],
    });
  } else if (operationName === 'Script Creation') {
    tags.push({ name: TAG_NAMES.scriptTransaction, values: [scriptTx.node.id] });
  } else {
    throw new Error('Invalid script transaction');
  }

  const requestTxs = await _queryOperators(tags);

  logger.debug('Filtering operators');
  const filtered = await _filterOperators(requestTxs);

  return filtered;
};

const _listAllOperators = async () => {
  const requestTxs = await _queryOperators(commonTags);

  logger.debug('Filtering operators');
  const filtered = await _filterOperators(requestTxs);

  return filtered;
};

/**
 * List all available operators
 * @returns { FairOperator[]} List of FairOperator objects
 */
function listOperators(): Promise<FairOperator[]>;
/**
 * List Operators registered for a specific script
 * @param scriptId Transaction Id of the 'Script Creation' transaction
 * @returns { FairOperator[]} List of FairOperator objects
 */
function listOperators(scriptId?: string): Promise<FairOperator[]>;
/**
 * List Operators registered for a specific script
 * @param scriptTx Raw Transaction object of the 'Script Creation' transaction or 'Script Creation Payment' transaction\
 * @returns { FairOperator[]} List of FairOperator objects
 */
function listOperators(scriptTx: IContractEdge | IEdge): Promise<FairOperator[]>;

function listOperators(param?: listOperatorsParam) {
  if (!param) {
    return _listAllOperators();
  } else if (param instanceof Object) {
    return _listOperatorsWithScriptTx(param);
  } else if (typeof param === 'string') {
    return _listOperatorsWithScriptId(param);
  } else {
    throw new Error('Invalid parameter');
  }
}

export { listOperators, FairOperator };
