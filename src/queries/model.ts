// model related functionality
// list models
import { DEFAULT_TAGS_RETRO, MODEL_CREATION_PAYMENT_TAGS } from '../utils/constants';
import { findTag, isFakeDeleted, findByTags } from '../utils';
import { IContractEdge } from '../types';
import { FairModel } from '../classes';

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
