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

import { FairScript } from '../classes/script';
import { DEFAULT_TAGS_RETRO, SCRIPT_CREATION_PAYMENT_TAGS, TAG_NAMES } from '../utils/constants';
import { ITagFilter, IContractEdge, IEdge, listFilterParams } from '../types/arweave';
import {
  logger,
  filterByUniqueScriptTxId,
  filterPreviousVersions,
  findTag,
  getTxOwner,
  isFakeDeleted,
} from '../utils/common';
import { findByTags } from '../utils/queries';

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
  logger.debug('Filtering scripts...');
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

  return _filterScripts(requestTxs);
};

const _listScriptsWithModelId = async (modelId: string) => {
  const tags = [
    ...DEFAULT_TAGS_RETRO,
    ...(modelId ? [{ name: TAG_NAMES.modelTransaction, values: [modelId] }] : []),
    ...SCRIPT_CREATION_PAYMENT_TAGS,
  ];

  const requestTxs = await _queryScripts(tags);

  return _filterScripts(requestTxs);
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

  return _filterScripts(requestTxs);
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

function listScripts(param?: listFilterParams) {
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
