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

import { IContractEdge, IEdge } from '../types/arweave';
import { findTag, getTxOwner } from '../utils/common';
import {
  DEFAULT_TAGS_FOR_TOKENS,
  TAG_NAMES,
  SCRIPT_INFERENCE_RESPONSE,
  APP_NAME,
  APP_VERSION,
  SCRIPT_INFERENCE_REQUEST,
  DEFAULT_TAGS,
  CONVERSATION_START,
} from '../utils/constants';
import {
  getTxOwners,
  getTxWithOwners,
  findByTags,
  getByIds,
  getTxsWithOwners,
} from '../utils/queries';
import { FairScript } from './script';

const DEFAULT_LIMIT = 10;

export const getResponses = async (userAddr: string, requestIds: string[]) => {
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

export const getAllResponses = async (userAddr: string, limit = DEFAULT_LIMIT) => {
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

export const getRequests = async (userAddr: string, limit = DEFAULT_LIMIT) => {
  const tags = [
    { name: TAG_NAMES.appName, values: [APP_NAME] },
    { name: TAG_NAMES.appVersion, values: [APP_VERSION] },
    { name: TAG_NAMES.operationName, values: [SCRIPT_INFERENCE_REQUEST] },
  ];

  return getTxsWithOwners(tags, [userAddr], limit);
};

export const getLastConversationId = async (userAddr: string, script: FairScript) => {
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
