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

import { DEFAULT_TAGS_RETRO, MODEL_CREATION_PAYMENT_TAGS } from '../utils/constants';
import { IContractEdge } from '../types/arweave';
import { FairModel } from '../classes/model';
import { findTag, isFakeDeleted } from '../utils/common';
import { findByTags } from '../utils/queries';

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
