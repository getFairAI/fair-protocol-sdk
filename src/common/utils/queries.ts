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

import { GraphQLClient, Variables, gql } from 'graphql-request';
import {
  CANCEL_OPERATION,
  CONVERSATION_START,
  CREATOR_PERCENTAGE_FEE,
  CURATOR_PERCENTAGE_FEE,
  DEFAULT_TAGS,
  INFERENCE_PAYMENT,
  MARKETPLACE_ADDRESS,
  MARKETPLACE_PERCENTAGE_FEE,
  MODEL_CREATION_PAYMENT_TAGS,
  MODEL_DELETION,
  NET_ARWEAVE_URL,
  N_PREVIOUS_BLOCKS,
  OPERATOR_REGISTRATION_PAYMENT_TAGS,
  PROTOCOL_NAME,
  SCRIPT_CREATION_PAYMENT_TAGS,
  SCRIPT_DELETION,
  SCRIPT_INFERENCE_REQUEST,
  SCRIPT_INFERENCE_RESPONSE,
  TAG_NAMES,
  U_CONTRACT_ID,
  VAULT_ADDRESS,
} from './constants';
import {
  IContractEdge,
  IContractQueryResult,
  IEdge,
  IQueryResult,
  ITagFilter,
} from '../types/arweave';
import { filterByUniqueScriptTxId, filterPreviousVersions, findTag } from './common';
import { isUTxValid } from './warp';
import { FairScript } from '../classes/script';

const DEFAULT_PAGE_SIZE = 10;
const RADIX = 10;

const client = new GraphQLClient(`${NET_ARWEAVE_URL}/graphql`);

const FIND_BY_TAGS = gql`
  query FIND_BY_TAGS($tags: [TagFilter!], $first: Int!, $after: String) {
    transactions(tags: $tags, first: $first, after: $after, sort: HEIGHT_DESC) {
      pageInfo {
        hasNextPage
      }
      edges {
        cursor
        node {
          id
          tags {
            name
            value
          }
          owner {
            address
            key
          }
        }
      }
    }
  }
`;

const FIND_BY_TAGS_WITH_OWNERS = gql`
  query FIND_BY_TAGS_WITH_OWNERS(
    $owners: [String!]
    $tags: [TagFilter!]
    $first: Int!
    $after: String
  ) {
    transactions(owners: $owners, tags: $tags, first: $first, after: $after, sort: HEIGHT_DESC) {
      pageInfo {
        hasNextPage
      }
      edges {
        cursor
        node {
          id
          tags {
            name
            value
          }
          owner {
            address
            key
          }
        }
      }
    }
  }
`;

const QUERY_TX_WITH_OWNERS = gql`
  query QUERY_TX_WITH_OWNERS($owners: [String!], $tags: [TagFilter!]) {
    transactions(owners: $owners, tags: $tags, sort: HEIGHT_DESC, first: 1) {
      pageInfo {
        hasNextPage
      }
      edges {
        cursor
        node {
          id
          owner {
            address
            key
          }
          tags {
            name
            value
          }
        }
      }
    }
  }
`;

const QUERY_TX_BY_ID = gql`
  query QUERY_TX_BY_ID($id: ID!) {
    transactions(ids: [$id], sort: HEIGHT_DESC, first: 1) {
      pageInfo {
        hasNextPage
      }
      edges {
        cursor
        node {
          id
          tags {
            name
            value
          }
          owner {
            address
            key
          }
        }
      }
    }
  }
`;

const QUERY_TX_BY_IDS = gql`
  query QUERY_TX_BY_ID($ids: [ID!], $first: Int!) {
    transactions(ids: $ids, sort: HEIGHT_DESC, first: $first) {
      pageInfo {
        hasNextPage
      }
      edges {
        cursor
        node {
          id
          tags {
            name
            value
          }
          owner {
            address
            key
          }
        }
      }
    }
  }
`;

const QUERY_TXS_OWNERS = gql`
  query QUERY_TX_BY_ID($ids: [ID!], $first: Int!) {
    transactions(ids: $ids, sort: HEIGHT_DESC, first: $first) {
      edges {
        node {
          owner {
            address
            key
          }
        }
      }
    }
  }
`;

const inputFnName = 'transfer';

// helper functions
export const getByIds = async (txids: string[]) => {
  const data: IQueryResult = await client.request(QUERY_TX_BY_IDS, {
    ids: txids,
    first: txids.length,
  });

  return data.transactions.edges;
};

export const getById = async (txid: string) => {
  const data: IQueryResult = await client.request(QUERY_TX_BY_ID, {
    id: txid,
  });

  return data.transactions.edges[0];
};

export const getTxWithOwners = async (tags: ITagFilter[], owners: string[]) => {
  const data: IQueryResult = await client.request(QUERY_TX_WITH_OWNERS, {
    tags,
    owners,
  });

  return data.transactions.edges;
};

export const findByTags = async (tags: ITagFilter[], first: number, after?: string) => {
  const data: IContractQueryResult = await client.request(FIND_BY_TAGS, {
    tags,
    first,
    after,
  });

  return data;
};

export const getTxOwners = async (txids: string[]) => {
  const data: IQueryResult = await client.request(QUERY_TXS_OWNERS, {
    ids: txids,
    first: txids.length,
  });

  return data.transactions.edges.map((el: IEdge) => el.node.owner.address);
};

export const getTxsWithOwners = async (tags: ITagFilter[], owners: string[], first: number) => {
  const txs: IEdge[] = [];
  let hasNextPage = false;
  let lastPaginationCursor = null;

  if (first <= 0) {
    // if first is 0 or negative, fetch everything
    first = Math.min();
  } else {
    // ignore
  }

  do {
    const data: IQueryResult = await client.request(FIND_BY_TAGS, {
      tags,
      first,
      after: lastPaginationCursor,
    });

    for (const tx of data.transactions.edges) {
      const owner = findTag(tx, 'sequencerOwner') || tx.node.owner.address;

      if (owners.includes(owner)) {
        txs.push(tx);
      } else {
        // ignore
      }
    }

    hasNextPage = data.transactions.pageInfo.hasNextPage;
    lastPaginationCursor = data.transactions.edges[data.transactions.edges.length - 1].cursor;
  } while (txs.length < Math.max() && hasNextPage);

  return txs;
};

const queryCheckUserPayment = async (
  inferenceTransaction: string,
  userAddress: string,
  scriptId: string,
) => {
  const tags = [
    {
      name: TAG_NAMES.protocolName,
      values: [PROTOCOL_NAME],
    },
    {
      name: TAG_NAMES.operationName,
      values: [INFERENCE_PAYMENT],
    },
    {
      name: TAG_NAMES.scriptTransaction,
      values: [scriptId],
    },
    {
      name: TAG_NAMES.inferenceTransaction,
      values: [inferenceTransaction],
    },
    {
      name: TAG_NAMES.contract,
      values: [U_CONTRACT_ID],
    },
    {
      name: TAG_NAMES.sequencerOwner,
      values: [userAddress],
    },
  ];

  const result: IQueryResult = await client.request(FIND_BY_TAGS, {
    tags,
    first: 4,
  });

  return result.transactions.edges;
};

export const checkUserPaidInferenceFees = async (
  txid: string,
  userAddress: string,
  creatorAddress: string,
  curatorAddress: string,
  operatorFee: number,
  scriptId: string,
) => {
  const marketplaceShare = operatorFee * MARKETPLACE_PERCENTAGE_FEE;
  const curatorShare = operatorFee * CURATOR_PERCENTAGE_FEE;
  const creatorShare = operatorFee * CREATOR_PERCENTAGE_FEE;

  const paymentTxs = await queryCheckUserPayment(txid, userAddress, scriptId);
  const necessaryPayments = 3;

  if (paymentTxs.length < necessaryPayments) {
    return false;
  } else {
    const validPayments = paymentTxs.filter((tx) => {
      try {
        const input = findTag(tx, 'input');
        if (!input) {
          return false;
        }

        const inputObj = JSON.parse(input);
        const qty = parseInt(inputObj.qty, 10);
        if (inputObj.function !== inputFnName) {
          return false;
        } else if (qty >= marketplaceShare && inputObj.target === VAULT_ADDRESS) {
          return true;
        } else if (qty >= curatorShare && inputObj.target === curatorAddress) {
          return true;
        } else if (qty >= creatorShare && inputObj.target === creatorAddress) {
          return true;
        } else {
          return false;
        }
      } catch (error) {
        return false;
      }
    });

    return validPayments.length >= necessaryPayments;
  }
};

// app logic
const checkLastRequests = async (
  operatorAddr: string,
  operatorFee: string,
  scriptName: string,
  scriptCurator: string,
  isStableDiffusion?: boolean,
) => {
  const { query, variables } = getRequestsQuery(
    undefined,
    scriptName,
    scriptCurator,
    operatorAddr,
    undefined,
    N_PREVIOUS_BLOCKS,
  );

  const data: IQueryResult = await client.request(query, variables as Variables);

  const baseFee = parseFloat(operatorFee);

  const validTxs: IEdge[] = [];
  for (const requestTx of data.transactions.edges) {
    const nImages = findTag(requestTx, 'nImages');
    const userAddr = requestTx.node.owner.address;
    const creatorAddr = findTag(requestTx, 'modelCreator') as string;
    const curatorAddr = findTag(requestTx, 'scriptCurator') as string;
    const scriptId = findTag(requestTx, 'scriptTransaction') as string;

    let isValidRequest = false;
    if (
      isStableDiffusion &&
      nImages &&
      (parseInt(nImages, RADIX) > 0 || parseInt(nImages, RADIX) < 10)
    ) {
      const actualFee = baseFee * parseInt(nImages, RADIX);

      isValidRequest = await checkUserPaidInferenceFees(
        requestTx.node.id,
        userAddr,
        creatorAddr,
        curatorAddr,
        actualFee,
        scriptId,
      );
    } else if (isStableDiffusion) {
      // default nImages
      const defaultNImages = 4;
      const actualFee = baseFee * defaultNImages;

      isValidRequest = await checkUserPaidInferenceFees(
        requestTx.node.id,
        userAddr,
        creatorAddr,
        curatorAddr,
        actualFee,
        scriptId,
      );
    } else {
      isValidRequest = await checkUserPaidInferenceFees(
        requestTx.node.id,
        userAddr,
        creatorAddr,
        curatorAddr,
        baseFee,
        scriptId,
      );
    }

    if (isValidRequest) {
      const hasAnswered = await hasOperatorAnswered(requestTx, operatorAddr);
      if (hasAnswered) {
        validTxs.push(requestTx);
      }
    } else {
      // if user has not paid, ignore
      validTxs.push(requestTx);
    }
  }

  return validTxs.length === data.transactions.edges.length;
};

const hasOperatorAnswered = async (request: IEdge | IContractEdge, opAddress: string) => {
  const responseTags: ITagFilter[] = [
    ...DEFAULT_TAGS,
    {
      name: TAG_NAMES.requestTransaction,
      values: [findTag(request, 'inferenceTransaction') as string],
    },
    { name: TAG_NAMES.operationName, values: [SCRIPT_INFERENCE_RESPONSE] },
  ];

  const data: IEdge[] = await getTxWithOwners(responseTags, [opAddress]);

  if (data.length === 0) {
    return false;
  } else {
    return true;
  }
};

const isCancelled = async (txid: string, opAddress: string) => {
  const cancelTags = [
    ...DEFAULT_TAGS,
    { name: TAG_NAMES.operationName, values: [CANCEL_OPERATION] },
    { name: TAG_NAMES.registrationTransaction, values: [txid] },
  ];

  const data: IEdge[] = await getTxWithOwners(cancelTags, [opAddress]);

  return data.length > 0;
};

const isValidRegistration = async (
  txid: string,
  operatorFee: string,
  opAddress: string,
  scriptName: string,
  scriptCurator: string,
  isStableDiffusion?: boolean,
) => {
  const isCancelledTx = await isCancelled(txid, opAddress);
  if (isCancelledTx) {
    return false;
  }

  return checkLastRequests(opAddress, operatorFee, scriptName, scriptCurator, isStableDiffusion);
};

const checkHasOperators = async (
  scriptTx: IEdge | IContractEdge,
  filtered: Array<IEdge | IContractEdge>,
) => {
  const elementsPerPage = 5;

  const scriptId = (findTag(scriptTx, 'scriptTransaction') as string) ?? scriptTx.node.id;
  const scriptName = findTag(scriptTx, 'scriptName') as string;
  const scriptCurator = findTag(scriptTx, 'scriptCurator') as string;
  const isStableDiffusion = findTag(scriptTx, 'outputConfiguration') as string;

  const { variables } = getOperatorQueryForScript(
    scriptId,
    scriptName,
    scriptCurator,
    elementsPerPage,
  );

  const queryResult = await findByTags(variables.tags, variables.first, variables.after);

  if (queryResult.transactions.edges.length === 0) {
    filtered.splice(
      filtered.findIndex((el) => el.node.id === scriptTx.node.id),
      1,
    );
  } else {
    let hasAtLeastOneValid = false;
    for (const registration of queryResult.transactions.edges) {
      const opFee = findTag(registration, 'operatorFee') as string;
      const scriptName = findTag(registration, 'scriptName') as string;
      const scriptCurator = findTag(registration, 'scriptCurator') as string;
      const registrationOwner =
        (findTag(registration, 'sequencerOwner') as string) ?? registration.node.owner.address;

      if (
        await isValidRegistration(
          registration.node.id,
          opFee,
          registrationOwner,
          scriptName,
          scriptCurator,
          !!isStableDiffusion && isStableDiffusion === 'stable-diffusion',
        )
      ) {
        filtered.push(scriptTx);
        hasAtLeastOneValid = true;
      }
    }
    const arrayPos = filtered.findIndex((existing) => scriptTx.node.id === existing.node.id);
    if (!hasAtLeastOneValid && arrayPos >= 0) {
      filtered.splice(arrayPos, 1);
    }
  }
};

const checkOpResponses = async (el: IContractEdge, filtered: IContractEdge[]) => {
  const opFee = findTag(el, 'operatorFee') as string;
  const scriptName = findTag(el, 'scriptName') as string;
  const scriptCurator = findTag(el, 'scriptCurator') as string;
  const registrationOwner = (findTag(el, 'sequencerOwner') as string) ?? el.node.owner.address;
  const scriptTx = await getById(findTag(el, 'scriptTransaction') as string);
  const isStableDiffusion = findTag(scriptTx, 'outputConfiguration') as string;

  if (
    !(await isValidRegistration(
      el.node.id,
      opFee,
      registrationOwner,
      scriptName,
      scriptCurator,
      !!isStableDiffusion && isStableDiffusion === 'stable-diffusion',
    ))
  ) {
    filtered.splice(
      filtered.findIndex((existing) => el.node.id === existing.node.id),
      1,
    );
  }
};

const isFakeDeleted = async (txid: string, owner: string, type: 'script' | 'model') => {
  const deleteTags: ITagFilter[] = [];

  if (type === 'model') {
    deleteTags.push({ name: TAG_NAMES.operationName, values: [MODEL_DELETION] });
    deleteTags.push({ name: TAG_NAMES.modelTransaction, values: [txid] });
  } else {
    deleteTags.push({ name: TAG_NAMES.operationName, values: [SCRIPT_DELETION] });
    deleteTags.push({ name: TAG_NAMES.scriptTransaction, values: [txid] });
  }

  const owners = owner ? [MARKETPLACE_ADDRESS, owner] : [MARKETPLACE_ADDRESS];

  const data = await getTxWithOwners(deleteTags, owners);

  return data.length > 0;
};

// exports
export const getModelsQuery = (first = DEFAULT_PAGE_SIZE, after?: string) => ({
  query: FIND_BY_TAGS,
  variables: {
    tags: [...DEFAULT_TAGS, ...MODEL_CREATION_PAYMENT_TAGS],
    first,
    after,
  },
});

export const modelsFilter = async (data: IContractEdge[]) => {
  const filtered: IContractEdge[] = [];
  for (const el of data) {
    const modelId = findTag(el, 'modelTransaction') as string;
    const modelOwner = findTag(el, 'sequencerOwner') as string;
    const sequencerId = findTag(el, 'sequencerTxId') as string;

    const isValidPayment = await isUTxValid(sequencerId);
    if (!isValidPayment) {
      // ignore
    } else if (!modelOwner || !modelId) {
      // ignore
    } else if (await isFakeDeleted(modelId, modelOwner, 'model')) {
      // ignore
    } else {
      filtered.push(el);
    }
  }

  return filtered;
};

export const scriptsFilter = async (data: IContractEdge[]) => {
  const uniqueScripts = filterByUniqueScriptTxId<IContractEdge[]>(data);
  const filteredScritps = filterPreviousVersions<IContractEdge[]>(uniqueScripts as IContractEdge[]);
  const filtered: IContractEdge[] = [];
  for (const el of filteredScritps) {
    const scriptId = findTag(el, 'scriptTransaction') as string;
    const scriptOwner = findTag(el, 'sequencerOwner') as string;
    const sequencerId = findTag(el, 'sequencerTxId') as string;

    const isValidPayment = await isUTxValid(sequencerId);

    if (!isValidPayment) {
      // ignore
    } else if (!scriptOwner || !scriptId) {
      // ignore
    } else if (await isFakeDeleted(scriptId, scriptOwner, 'script')) {
      // if fake deleted ignore
    } else {
      await checkHasOperators(el, filtered);
    }
  }

  return filtered;
};

export const getScriptsQuery = (first = DEFAULT_PAGE_SIZE, after?: string) => ({
  query: FIND_BY_TAGS,
  variables: {
    tags: [...DEFAULT_TAGS, ...SCRIPT_CREATION_PAYMENT_TAGS],
    first,
    after,
  },
});

export const getScriptQueryForModel = (
  modelId: string,
  modelName?: string,
  modelCreator?: string,
  first = DEFAULT_PAGE_SIZE,
  after?: string,
) => {
  const tags = [
    ...DEFAULT_TAGS,
    ...SCRIPT_CREATION_PAYMENT_TAGS,
    { name: TAG_NAMES.modelTransaction, values: [modelId] },
  ];

  if (modelName && modelCreator) {
    tags.push({ name: TAG_NAMES.modelName, values: [modelName] });
    tags.push({ name: TAG_NAMES.modelCreator, values: [modelCreator] });
  }

  return {
    query: FIND_BY_TAGS,
    variables: {
      tags,
      first,
      after,
    },
  };
};

export const getOperatorsQuery = (first = DEFAULT_PAGE_SIZE, after?: string) => ({
  query: FIND_BY_TAGS,
  variables: {
    tags: [...DEFAULT_TAGS, ...OPERATOR_REGISTRATION_PAYMENT_TAGS],
    first,
    after,
  },
});

export const getOperatorQueryForScript = (
  scriptId: string,
  scriptName?: string,
  scriptCurator?: string,
  first = DEFAULT_PAGE_SIZE,
  after?: string,
) => {
  const tags = [
    ...DEFAULT_TAGS,
    ...OPERATOR_REGISTRATION_PAYMENT_TAGS,
    { name: TAG_NAMES.scriptTransaction, values: [scriptId] },
  ];

  if (scriptName && scriptCurator) {
    tags.push({ name: TAG_NAMES.scriptName, values: [scriptName] });
    tags.push({ name: TAG_NAMES.scriptCurator, values: [scriptCurator] });
  }

  return {
    query: FIND_BY_TAGS,
    variables: {
      tags,
      first,
      after,
    },
  };
};

export const operatorsFilter = async (data: IContractEdge[]) => {
  const filtered: IContractEdge[] = [];
  for (const el of data) {
    const sequencerId = findTag(el, 'sequencerTxId') as string;

    const isValidPayment = await isUTxValid(sequencerId);
    if (!isValidPayment) {
      // ignore
    } else {
      filtered.push(el);
      await checkOpResponses(el, filtered);
    }
  }

  return filtered;
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
      return parseInt(conversationId, DEFAULT_PAGE_SIZE);
    } else {
      return 1;
    }
  } else {
    return 1;
  }
};

export const getRequestsQuery = (
  userAddress?: string,
  scriptName?: string,
  scriptCurator?: string,
  scriptOperator?: string,
  currenctConversationId?: number,
  first = DEFAULT_PAGE_SIZE,
  after?: string,
) => {
  const tags = [
    ...DEFAULT_TAGS,
    { name: TAG_NAMES.operationName, values: [SCRIPT_INFERENCE_REQUEST] },
  ];
  if (scriptName) {
    tags.push({ name: TAG_NAMES.scriptName, values: [scriptName] });
  }

  if (scriptCurator) {
    tags.push({ name: TAG_NAMES.scriptCurator, values: [scriptCurator] });
  }

  if (scriptOperator) {
    tags.push({ name: TAG_NAMES.scriptOperator, values: [scriptOperator] });
  }

  if (currenctConversationId) {
    tags.push({ name: TAG_NAMES.conversationIdentifier, values: [`${currenctConversationId}`] });
  }

  if (userAddress) {
    return {
      query: FIND_BY_TAGS_WITH_OWNERS,
      variables: {
        owners: [userAddress],
        tags,
        first,
        after,
      },
    };
  } else {
    return {
      query: FIND_BY_TAGS,
      variables: {
        tags,
        first,
        after,
      },
    };
  }
};

export const getResponsesQuery = (
  requestIds: string[],
  userAddress?: string,
  scriptName?: string,
  scriptCurator?: string,
  scriptOperator?: string,
  currenctConversationId?: number,
  first = DEFAULT_PAGE_SIZE,
  after?: string,
) => {
  const tags = [
    ...DEFAULT_TAGS,
    { name: TAG_NAMES.operationName, values: [SCRIPT_INFERENCE_RESPONSE] },
  ];

  if (requestIds.length > 0) {
    tags.push({ name: TAG_NAMES.requestTransaction, values: requestIds });
  }

  if (userAddress) {
    tags.push({ name: TAG_NAMES.scriptUser, values: [userAddress] });
  }

  if (scriptName) {
    tags.push({ name: TAG_NAMES.scriptName, values: [scriptName] });
  }

  if (scriptCurator) {
    tags.push({ name: TAG_NAMES.scriptCurator, values: [scriptCurator] });
  }

  if (currenctConversationId) {
    tags.push({ name: TAG_NAMES.conversationIdentifier, values: [`${currenctConversationId}`] });
  }

  if (scriptOperator) {
    return {
      query: FIND_BY_TAGS_WITH_OWNERS,
      variables: {
        owners: [scriptOperator],
        tags,
        first,
        after,
      },
    };
  } else {
    return {
      query: FIND_BY_TAGS,
      variables: {
        tags,
        first,
        after,
      },
    };
  }
};

export const runQuery = async (query: string, variables: Variables) => {
  const data: IQueryResult = await client.request(query, variables);

  return data;
};
