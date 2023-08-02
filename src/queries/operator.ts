import { FairOperator } from '../classes';
import { DEFAULT_TAGS, OPERATOR_REGISTRATION_PAYMENT_TAGS, TAG_NAMES } from '../utils/constants';
import { IContractEdge, IEdge, ITagFilter, listFilterParams } from '../types';
import { findTag, getTxOwner, isValidRegistration, logger, findByTags } from '../utils';

const commonTags = [...DEFAULT_TAGS, ...OPERATOR_REGISTRATION_PAYMENT_TAGS];

const _queryOperators = async (tags: ITagFilter[]) => {
  let hasNextPage = false;
  let requestTxs: IContractEdge[] = [];
  do {
    logger.debug(`Fetching operators with tags: ${JSON.stringify(tags)}`);
    const first = 10;
    const after = hasNextPage ? requestTxs[requestTxs.length - 1].cursor : undefined;

    const result = await findByTags(tags, first, after);

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
    { name: TAG_NAMES.scriptCurator, values: [getTxOwner(scriptTx)] },
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

function listOperators(param?: listFilterParams) {
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
