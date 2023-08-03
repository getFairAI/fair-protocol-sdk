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
import type { Tag } from 'warp-contracts';
import {
  APP_NAME,
  APP_VERSION,
  CONVERSATION_START,
  CREATOR_PERCENTAGE_FEE,
  CURATOR_PERCENTAGE_FEE,
  DEFAULT_TAGS,
  DEFAULT_TAGS_FOR_TOKENS,
  INFERENCE_PAYMENT,
  MARKETPLACE_PERCENTAGE_FEE,
  OPERATOR_PERCENTAGE_FEE,
  SCRIPT_INFERENCE_REQUEST,
  SCRIPT_INFERENCE_RESPONSE,
  TAG_NAMES,
  VAULT_ADDRESS,
  secondInMS,
} from '../utils/constants';
import { IContractEdge, IEdge, ITag } from '../types/arweave';
import { FairModel } from '../classes/model';
import { FairOperator } from '../classes/operator';
import { FairScript } from '../classes/script';
import { logger, findTag, getTxOwner } from '../utils/common';
import {
  getTxWithOwners,
  getTxOwners,
  findByTags,
  getByIds,
  getTxsWithOwners,
} from '../utils/queries';
import { sendU } from '../utils/warp';

const DEFAULT_LIMIT = 10;

const handlePayment = async (
  bundlrId: string,
  inferenceFee: string,
  contentType: string,
  script: FairScript,
  conversationId: number,
  modelCreator: string,
  operatorAddrr: string,
) => {
  const parsedUFee = parseFloat(inferenceFee);
  const paymentTags = [
    { name: TAG_NAMES.appName, value: APP_NAME },
    { name: TAG_NAMES.appVersion, value: APP_VERSION },
    { name: TAG_NAMES.operationName, value: INFERENCE_PAYMENT },
    { name: TAG_NAMES.scriptName, value: script.name },
    { name: TAG_NAMES.scriptCurator, value: script.owner },
    { name: TAG_NAMES.scriptTransaction, value: script.txid },
    { name: TAG_NAMES.scriptOperator, value: operatorAddrr },
    { name: TAG_NAMES.modelCreator, value: modelCreator },
    { name: TAG_NAMES.conversationIdentifier, value: `${conversationId}` },
    { name: TAG_NAMES.inferenceTransaction, value: bundlrId },
    { name: TAG_NAMES.unixTime, value: (Date.now() / secondInMS).toString() },
    { name: TAG_NAMES.contentType, value: contentType },
  ];

  const operatorFeeShare = parsedUFee * OPERATOR_PERCENTAGE_FEE;
  const marketPlaceFeeShare = parsedUFee * MARKETPLACE_PERCENTAGE_FEE;
  const creatorFeeShare = parsedUFee * CREATOR_PERCENTAGE_FEE;
  const curatorFeeShare = parsedUFee * CURATOR_PERCENTAGE_FEE;

  // pay operator
  const operatorPaymentTx = await sendU(
    operatorAddrr,
    parseInt(operatorFeeShare.toString(), DEFAULT_LIMIT),
    paymentTags as Tag[],
  );
  // pay curator
  const curatorPaymentTx = await sendU(
    script.owner,
    parseInt(curatorFeeShare.toString(), DEFAULT_LIMIT),
    paymentTags as Tag[],
  );
  // pay model creator
  const creatorPaymentTx = await sendU(
    modelCreator,
    parseInt(creatorFeeShare.toString(), DEFAULT_LIMIT),
    paymentTags as Tag[],
  );
  // pay marketplace
  const marketplacePaymentTx = await sendU(
    VAULT_ADDRESS,
    parseInt(marketPlaceFeeShare.toString(), DEFAULT_LIMIT),
    paymentTags as Tag[],
  );

  logger.info('Payment Successful');

  return {
    operatorPaymentTx,
    curatorPaymentTx,
    creatorPaymentTx,
    marketplacePaymentTx,
  };
};

const getUploadTags = (script: FairScript, operatorAddr: string, conversationId: number) => {
  const tags: ITag[] = [];
  tags.push({ name: TAG_NAMES.appName, value: APP_NAME });
  tags.push({ name: TAG_NAMES.appVersion, value: APP_VERSION });
  tags.push({ name: TAG_NAMES.scriptName, value: script.name });
  tags.push({ name: TAG_NAMES.scriptCurator, value: script.owner });
  tags.push({ name: TAG_NAMES.scriptTransaction, value: script.txid });
  tags.push({ name: TAG_NAMES.scriptOperator, value: operatorAddr });
  tags.push({ name: TAG_NAMES.operationName, value: SCRIPT_INFERENCE_REQUEST });
  tags.push({ name: TAG_NAMES.conversationIdentifier, value: `${conversationId}` });
  const tempDate = Date.now() / secondInMS;
  tags.push({ name: TAG_NAMES.unixTime, value: tempDate.toString() });
  tags.push({ name: TAG_NAMES.contentType, value: 'text/plain' });

  return tags;
};

const getLastConversationId = async (userAddr: string, script: FairScript) => {
  const tags = [
    ...DEFAULT_TAGS,
    {
      name: TAG_NAMES.operationName,
      values: [CONVERSATION_START],
    },
    {
      name: TAG_NAMES.scriptTransaction,
      values: [script.txid],
    },
    { name: TAG_NAMES.scriptName, values: [script.name] },
    { name: TAG_NAMES.scriptCurator, values: [script.owner] },
  ];
  const owners = [userAddr];

  const data = await getTxWithOwners(tags, owners);

  if (data?.length > 0) {
    const tx = data[0];
    const conversationId = findTag(tx, 'conversationIdentifier');
    if (conversationId) {
      return parseInt(conversationId, DEFAULT_LIMIT);
    } else {
      return 1;
    }
  } else {
    return 1;
  }
};

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

const getResponses = async (userAddr: string, requestIds: string[]) => {
  const owners = await getTxOwners(requestIds);

  const tagsResponses = [
    ...DEFAULT_TAGS_FOR_TOKENS,
    /* { name: TAG_NAMES.scriptName, values: [state.scriptName] },
    { name: TAG_NAMES.scriptCurator, values: [state.scriptCurator] }, */
    { name: TAG_NAMES.operationName, values: [SCRIPT_INFERENCE_RESPONSE] },
    // { name: 'Conversation-Identifier', values: [currentConversationId] },
    { name: TAG_NAMES.scriptUser, values: [userAddr] },
    {
      name: TAG_NAMES.requestTransaction,
      values: requestIds,
    },
  ];

  return getTxWithOwners(tagsResponses, owners);
};

const getAllResponses = async (userAddr: string, limit = DEFAULT_LIMIT) => {
  const tagsResponses = [
    ...DEFAULT_TAGS_FOR_TOKENS,
    /* { name: TAG_NAMES.scriptName, values: [state.scriptName] },
    { name: TAG_NAMES.scriptCurator, values: [state.scriptCurator] }, */
    { name: TAG_NAMES.operationName, values: [SCRIPT_INFERENCE_RESPONSE] },
    // { name: 'Conversation-Identifier', values: [currentConversationId] },
    { name: TAG_NAMES.scriptUser, values: [userAddr] },
  ];

  const responsesPerRequest = 4;
  const data = await findByTags(tagsResponses, limit * responsesPerRequest);

  // get the txs requestIds
  const requestIds = Array.from(
    new Set(
      data.transactions.edges.map((el: IContractEdge) =>
        findTag(el, 'requestTransaction'),
      ) as string[],
    ),
  );
  // get the txs
  const requests = await getByIds(requestIds);

  const filtered = [];
  // filter responses that
  for (const res of data.transactions.edges) {
    // find request
    const request = requests.find(
      (el: IEdge) => el.node.id === findTag(res, 'requestTransaction'),
    ) as IEdge;
    if (getTxOwner(res) === findTag(request, 'scriptOperator')) {
      // remove response
      filtered.push(res);
    } else {
      // ignore response
    }
  }

  return filtered;
};

const getRequests = async (userAddr: string, limit = DEFAULT_LIMIT) => {
  const tags = [
    { name: TAG_NAMES.appName, values: [APP_NAME] },
    { name: TAG_NAMES.appVersion, values: [APP_VERSION] },
    { name: TAG_NAMES.operationName, values: [SCRIPT_INFERENCE_REQUEST] },
  ];

  return getTxsWithOwners(tags, [userAddr], limit);
};

export { inference, getResponses, getAllResponses, getRequests };
