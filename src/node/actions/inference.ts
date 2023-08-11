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

import type NodeBundlr from '@bundlr-network/client/build/cjs/node/bundlr';
import { logger } from '../../common/utils/common';
import { FairModel } from '../../common/classes/model';
import { FairOperator } from '../../common/classes/operator';
import { FairScript } from '../../common/classes/script';
import { getLastConversationId } from '../../common/queries/inference';
import { getUploadTags, handlePayment } from '../../common/utils/inference';

const inference = async (
  model: FairModel,
  script: FairScript,
  operator: FairOperator,
  prompt: string,
  userAddr: string,
  bundlr: NodeBundlr,
) => {
  const conversationId = await getLastConversationId(userAddr, script);
  const tags = getUploadTags(script, operator.owner, conversationId);
  try {
    const { id: txid } = await bundlr.upload(prompt, { tags });
    if (!txid) {
      throw new Error('No txid returned from bundlr');
    }
    logger.debug(`Inference txid: ${txid}`);

    return handlePayment(
      txid,
      operator.fee,
      'text/plain',
      script,
      conversationId,
      model.owner,
      operator.owner,
    );
  } catch (error) {
    throw new Error(JSON.stringify(error));
  }
};

export { inference };
