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

import { IContractEdge } from '../types/arweave';
import { FairModel } from '../classes/model';
import { findByTags, getModelsQuery, modelsFilter } from '../utils/queries';
import { logger } from '../utils/common';

const listModels = async () => {
  let hasNextPage = false;
  let requestTxs: IContractEdge[] = [];
  do {
    logger.debug('Fetching models');
    const variables = getModelsQuery().variables;
    const { tags, first } = variables;
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

  const filtered = await modelsFilter(requestTxs);

  return filtered.map((modelTx) => new FairModel(modelTx));
};

export { listModels, FairModel };
