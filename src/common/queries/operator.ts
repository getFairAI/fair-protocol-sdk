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

import { FairOperator } from '../classes/operator';
import { IContractEdge, IEdge, listFilterParams } from '../types/arweave';
import {
  findByTags,
  getOperatorQuery,
  getOperatorQueryForScript,
  operatorsFilter,
} from '../utils/queries';
import { findTag, getTxOwner, logger } from '../utils/common';

const _queryOperators = async (scriptId?: string, scriptName?: string, scriptCurator?: string) => {
  let hasNextPage = false;
  let requestTxs: IContractEdge[] = [];
  do {
    logger.debug('Fetching operators');
    let variables;
    if (scriptId) {
      variables = getOperatorQueryForScript(scriptId, scriptName, scriptCurator).variables;
    } else {
      variables = getOperatorQuery().variables;
    }
    const tags = variables.tags;
    const first = variables.first;
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
  logger.debug('Filtering Operators...');

  const filtered = await operatorsFilter(txs);
  return filtered.map((operatorTx) => new FairOperator(operatorTx));
};

const _listOperatorsWithScriptId = async (scriptId?: string) => {
  const requestTxs = await _queryOperators(scriptId);

  return _filterOperators(requestTxs);
};

const _listOperatorsWithScriptTx = async (scriptTx: IContractEdge | IEdge) => {
  const operationName = findTag(scriptTx, 'operationName') as string;

  const scriptName = findTag(scriptTx, 'scriptName') as string;
  const scriptCurator = getTxOwner(scriptTx);
  let scriptId;

  if (operationName === 'Script Creation Payment') {
    scriptId = findTag(scriptTx, 'scriptTransaction') as string;
  } else if (operationName === 'Script Creation') {
    scriptId = scriptTx.node.id;
  } else {
    throw new Error('Invalid script transaction');
  }

  const requestTxs = await _queryOperators(scriptId, scriptName, scriptCurator);

  return _filterOperators(requestTxs);
};

const _listAllOperators = async () => {
  const requestTxs = await _queryOperators();

  return _filterOperators(requestTxs);
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
