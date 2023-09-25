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

import { GraphQLClient, gql } from 'graphql-request';
import {
  CANCEL_OPERATION,
  DEFAULT_TAGS,
  INFERENCE_PAYMENT,
  MARKETPLACE_ADDRESS,
  MODEL_CREATION_PAYMENT_TAGS,
  MODEL_DELETION,
  NET_ARWEAVE_URL,
  N_PREVIOUS_BLOCKS,
  OPERATOR_REGISTRATION_PAYMENT_TAGS,
  SCRIPT_CREATION_PAYMENT_TAGS,
  SCRIPT_DELETION,
  SCRIPT_INFERENCE_RESPONSE,
  TAG_NAMES,
  U_CONTRACT_ID,
} from './constants';
import {
  IContractEdge,
  IContractQueryResult,
  IEdge,
  IQueryResult,
  ITagFilter,
} from '../types/arweave';
import { filterByUniqueScriptTxId, filterPreviousVersions, findTag } from './common';

const DEFAULT_PAGE_SIZE = 10;

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

// app logic
const getOperatorRequests = async (
  address: string,
  operatorFee: string,
  scriptName: string,
  scriptCurator: string,
) => {
  const qty = parseFloat(operatorFee);
  const requestPaymentsInputNumber = JSON.stringify({
    function: inputFnName,
    target: address,
    qty,
  });
  const requestPaymentsInputStr = JSON.stringify({
    function: inputFnName,
    target: address,
    qty: qty.toString(),
  });
  const data = await findByTags(
    [
      ...DEFAULT_TAGS,
      { name: TAG_NAMES.contract, values: [U_CONTRACT_ID] },
      { name: TAG_NAMES.operationName, values: [INFERENCE_PAYMENT] },
      { name: TAG_NAMES.scriptName, values: [scriptName] },
      { name: TAG_NAMES.scriptCurator, values: [scriptCurator] },
    ],
    N_PREVIOUS_BLOCKS,
  );

  return data.transactions.edges.filter((el: IContractEdge) => {
    try {
      const inputTag = findTag(el, 'input');
      if (!inputTag) {
        return false;
      } else if (inputTag === requestPaymentsInputNumber || inputTag === requestPaymentsInputStr) {
        return true;
      } else {
        const inputObj: { qty: number | string; function: string; target: string } =
          JSON.parse(inputTag);
        const qtyNumber =
          typeof inputObj.qty === 'string' ? parseFloat(inputObj.qty) : inputObj.qty;

        return qtyNumber >= qty && inputObj.function === inputFnName && inputObj.target === address;
      }
    } catch (err) {
      return false;
    }
  });
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
) => {
  const isCancelledTx = await isCancelled(txid, opAddress);
  if (isCancelledTx) {
    return false;
  }

  const lastRequests = await getOperatorRequests(opAddress, operatorFee, scriptName, scriptCurator);
  for (const request of lastRequests) {
    // check if operator has answered last 7 requests
    if (!(await hasOperatorAnswered(request, opAddress))) {
      // if any of the last 7 requests has not been answered, the operator is not valid
      return false;
    }
  }

  return true;
};

const checkHasOperators = async (
  scriptTx: IEdge | IContractEdge,
  filtered: Array<IEdge | IContractEdge>,
) => {
  const elementsPerPage = 5;

  const scriptId = (findTag(scriptTx, 'scriptTransaction') as string) ?? scriptTx.node.id;
  const scriptName = findTag(scriptTx, 'scriptName') as string;
  const scriptCurator = findTag(scriptTx, 'scriptCurator') as string;

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

  if (
    !(await isValidRegistration(el.node.id, opFee, registrationOwner, scriptName, scriptCurator))
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

    if (!modelOwner || !modelId) {
      // ignore
    } else if (!(await isFakeDeleted(modelId, modelOwner, 'model'))) {
      filtered.push(el);
    } else {
      // ignore
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
    if (await isFakeDeleted(scriptId, scriptOwner, 'script')) {
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

export const getOperatorQuery = (first = DEFAULT_PAGE_SIZE, after?: string) => ({
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
    filtered.push(el);
    await checkOpResponses(el, filtered);
  }

  return filtered;
};
