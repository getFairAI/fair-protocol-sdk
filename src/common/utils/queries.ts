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
  OPERATOR_REGISTRATION_PAYMENT_TAGS,
  PROTOCOL_NAME,
  SCRIPT_CREATION_PAYMENT_TAGS,
  SCRIPT_DELETION,
  SCRIPT_INFERENCE_REQUEST,
  SCRIPT_INFERENCE_RESPONSE,
  TAG_NAMES,
  U_CONTRACT_ID,
  VAULT_ADDRESS,
  secondInMS,
} from './constants';
import {
  IContractEdge,
  IContractQueryResult,
  IEdge,
  IQueryResult,
  ITagFilter,
} from '../types/arweave';
import {
  filterByUniqueModelTxId,
  filterByUniqueScriptTxId,
  filterPreviousVersions,
  findTag,
  logger,
} from './common';
import { isUTxValid } from './warp';
import { FairScript } from '../classes/script';
import { ApolloClient, DocumentNode, InMemoryCache, gql } from '@apollo/client/core';

const DEFAULT_PAGE_SIZE = 10;
const RADIX = 10;

export const apolloClient = new ApolloClient({
  // uri: 'http://localhost:1984/graphql',
  uri: NET_ARWEAVE_URL + '/graphql',
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
      errorPolicy: 'all',
    },
    query: {
      fetchPolicy: 'cache-first',
      errorPolicy: 'all',
    },
  },
});

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

const STAMPS_QUERY = gql`
  query QUERY_STAMPS($txs: [ID!], $first: Int!, $after: string) {
    transactions(
      tags: [{ name: "Protocol-Name", values: ["Stamp"] }, { name: "Data-Source", values: $txs }]
      after: $after
      first: $first
    ) {
      pageInfo {
        hasNextPage
      }
      edges {
        cursor
        node {
          id
          owner {
            address
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

const inputFnName = 'transfer';

// helper functions
export const getByIds = async (txids: string[]) => {
  const { data }: { data: IQueryResult } = await apolloClient.query({
    query: QUERY_TX_BY_IDS,
    variables: {
      ids: txids,
      first: txids.length,
    },
  });

  return data.transactions.edges;
};

export const getById = async (txid: string) => {
  const { data }: { data: IQueryResult } = await apolloClient.query({
    query: QUERY_TX_BY_ID,
    variables: {
      id: txid,
    },
  });

  return data.transactions.edges[0];
};

export const getTxWithOwners = async (tags: ITagFilter[], owners: string[]) => {
  const { data }: { data: IQueryResult } = await apolloClient.query({
    query: QUERY_TX_WITH_OWNERS,
    variables: {
      tags,
      owners,
    },
  });

  return data.transactions.edges;
};

export const findByTags = async (tags: ITagFilter[], first: number, after?: string) => {
  const { data }: { data: IContractQueryResult } = await apolloClient.query({
    query: FIND_BY_TAGS,
    variables: {
      tags,
      first,
      after,
    },
  });

  return data;
};

export const getTxOwners = async (txids: string[]) => {
  const { data }: { data: IQueryResult } = await apolloClient.query({
    query: QUERY_TXS_OWNERS,
    variables: {
      ids: txids,
      first: txids.length,
    },
  });

  return data.transactions.edges.map((el: IEdge) => el.node.owner.address);
};

export const getTxsWithOwners = async (tags: ITagFilter[], owners: string[], first: number) => {
  const txs: IEdge[] = [];
  let hasNextPage = false;
  let lastPaginationCursor;

  if (first <= 0) {
    // if first is 0 or negative, fetch everything
    first = Math.min();
  } else {
    // ignore
  }

  do {
    const result = await apolloClient.query({
      query: FIND_BY_TAGS,
      variables: {
        tags,
        first,
        after: lastPaginationCursor,
      },
    });
    const data = result.data as IQueryResult;

    for (const tx of data.transactions.edges) {
      const owner = findTag(tx, 'sequencerOwner') ?? tx.node.owner.address;

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

  const { data: result }: { data: IQueryResult } = await apolloClient.query({
    query: FIND_BY_TAGS,
    variables: {
      tags,
      first: 4,
    },
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
const checkLastRequest = async (
  operatorAddr: string,
  operatorFee: string,
  scriptId: string,
  scriptName: string,
  scriptCurator: string,
  modelCreator: string,
  isStableDiffusion = false,
) => {
  const nRequestToValidate = 1; // check only last request
  const { query, variables } = getRequestsQuery(
    undefined,
    scriptName,
    scriptCurator,
    operatorAddr,
    undefined,
    nRequestToValidate,
  );

  const { data }: { data: IQueryResult } = await apolloClient.query({
    query,
    variables,
  });

  const baseFee = parseFloat(operatorFee);

  const validTxs: IEdge[] = [];

  const mutatableData = [...data.transactions.edges];
  /* // ignore most recent request
  // requests are ordered by most recent first, reverse so most recent is last element
  mutatableData.reverse();
  // remove most recent request
  mutatableData.pop(); */

  // validate all other requests
  for (const requestTx of mutatableData) {
    const nImages = findTag(requestTx, 'nImages');
    const userAddr = requestTx.node.owner.address;

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
        modelCreator,
        scriptCurator,
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
        modelCreator,
        scriptCurator,
        actualFee,
        scriptId,
      );
    } else {
      isValidRequest = await checkUserPaidInferenceFees(
        requestTx.node.id,
        userAddr,
        modelCreator,
        scriptCurator,
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

  return validTxs.length === mutatableData.length;
};

const hasOperatorAnswered = async (request: IEdge | IContractEdge, opAddress: string) => {
  const requestId = findTag(request, 'inferenceTransaction') ?? request.node.id;
  const responseTags: ITagFilter[] = [
    ...DEFAULT_TAGS,
    {
      name: TAG_NAMES.requestTransaction,
      values: [requestId],
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
  scriptId: string,
  scriptName: string,
  scriptCurator: string,
  modelCreator: string,
  isStableDiffusion = false,
) => {
  const isCancelledTx = await isCancelled(txid, opAddress);
  if (isCancelledTx) {
    return false;
  }

  return checkLastRequest(
    opAddress,
    operatorFee,
    scriptId,
    scriptName,
    scriptCurator,
    modelCreator,
    isStableDiffusion,
  );
};

const checkHasOperators = async (
  scriptTx: IEdge | IContractEdge,
  filtered: Array<IEdge | IContractEdge>,
) => {
  const elementsPerPage = 5;

  const scriptId = (findTag(scriptTx, 'scriptTransaction') as string) ?? scriptTx.node.id;
  const scriptName = findTag(scriptTx, 'scriptName') as string;
  const scriptCurator = findTag(scriptTx, 'sequencerOwner') ?? scriptTx.node.owner.address;
  const modelCreator = findTag(scriptTx, 'modelCreator') as string;
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
      const registrationOwner =
        (findTag(registration, 'sequencerOwner') as string) ?? registration.node.owner.address;

      if (
        await isValidRegistration(
          registration.node.id,
          opFee,
          registrationOwner,
          scriptId,
          scriptName,
          scriptCurator,
          modelCreator,
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

  const registrationOwner = (findTag(el, 'sequencerOwner') as string) ?? el.node.owner.address;
  const scriptTx = await getById(findTag(el, 'scriptTransaction') as string);
  const scriptId = scriptTx.node.id;
  const scriptCurator = findTag(scriptTx, 'sequencerOwner') ?? scriptTx.node.owner.address;
  const scriptName = findTag(scriptTx, 'scriptName') as string;
  const modelCreator = findTag(scriptTx, 'modelCreator') as string;
  const isStableDiffusion = findTag(scriptTx, 'outputConfiguration') as string;

  if (
    !(await isValidRegistration(
      el.node.id,
      opFee,
      registrationOwner,
      scriptId,
      scriptName,
      scriptCurator,
      modelCreator,
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
  const uniqueModels: IContractEdge[] = filterByUniqueModelTxId(data);
  for (const el of uniqueModels) {
    const isValid = await validateModel(el);
    if (isValid) {
      filtered.push(el);
    } else {
      // ignore
    }
  }

  return filtered;
};

export const validateModel = async (tx: IContractEdge) => {
  const modelId = findTag(tx, 'modelTransaction') as string;
  const modelOwner = findTag(tx, 'sequencerOwner') as string;
  const sequencerId = findTag(tx, 'sequencerTxId') as string;

  const isValidPayment = await isUTxValid(sequencerId);
  if (!isValidPayment) {
    logger.debug('Model payment Transaction is not valid');
    return false;
  } else if (!modelOwner || !modelId) {
    logger.debug('Missing ModelId or ModelOwner in tags');
    return false;
  } else if (await isFakeDeleted(modelId, modelOwner, 'model')) {
    logger.debug('Model transaction has been cancelled');
    return false;
  } else {
    return true;
  }
};

export const validateScript = async (tx: IContractEdge, modelId?: string) => {
  if (modelId && findTag(tx, 'modelTransaction') !== modelId) {
    logger.debug('Script is not compatible with chosen model');
    return false;
  }

  const scriptId = findTag(tx, 'scriptTransaction') as string;
  const scriptOwner = findTag(tx, 'sequencerOwner') as string;
  const sequencerId = findTag(tx, 'sequencerTxId') as string;

  const isValidPayment = await isUTxValid(sequencerId);
  if (!isValidPayment) {
    logger.debug('Script payment Transaction is not valid');
    return false;
  } else if (!scriptOwner || !scriptId) {
    logger.debug('Missing Script Id or Script Owner in tags');
    return false;
  } else if (await isFakeDeleted(scriptId, scriptOwner, 'script')) {
    logger.debug('Script transaction has been cancelled');
    return false;
  } else {
    const txs = [tx];
    await checkHasOperators(tx, txs);
    if (txs.length === 0) {
      logger.debug('Script has no valid operators');
    }
    return txs.length > 0;
  }
};

export const validateOperator = async (tx: IContractEdge, scriptId?: string) => {
  if (scriptId && findTag(tx, 'scriptTransaction') !== scriptId) {
    logger.debug('Operator is not registered for selected script');
    return false;
  }

  const sequencerId = findTag(tx, 'sequencerTxId') as string;

  const isValidPayment = await isUTxValid(sequencerId);
  if (!isValidPayment) {
    // ignore
    logger.debug('Script payment Transaction is not valid');
    return false;
  } else {
    const txs = [tx];
    await checkOpResponses(tx, txs);
    if (txs.length === 0) {
      logger.debug('Operator registration is not valid');
    }
    return txs.length > 0;
  }
};

export const scriptsFilter = async (data: IContractEdge[], validateOperators = false) => {
  const uniqueScripts = filterByUniqueScriptTxId<IContractEdge[]>(data);
  const filteredScritps = filterPreviousVersions<IContractEdge[]>(uniqueScripts);
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
    } else if (validateOperators) {
      await checkHasOperators(el, filtered);
    } else {
      filtered.push(el);
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

export const getValidOperatorProofsQuery = (
  operatorAddrs: string[],
  first = DEFAULT_PAGE_SIZE,
  after?: string,
) => {
  const tags = [
    { name: 'Protocol-Name', values: [PROTOCOL_NAME] },
    // { name: 'Protocol-Version', value: PROTOCOL_VERSION} ,
    { name: 'Operation-Name', values: ['Operator Active Proof'] },
  ];

  if (operatorAddrs.length > 0) {
    return {
      query: FIND_BY_TAGS_WITH_OWNERS,
      variables: {
        owners: operatorAddrs,
        tags,
        first,
        after,
      },
    };
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

  // check if has proof of life
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

  // check operator proofs on filtered operators
  const operatorAddrs = filtered.map((el) => findTag(el, 'sequencerOwner') as string);
  const operatorProofsQueryParams = getValidOperatorProofsQuery(operatorAddrs, 1);
  const result = await runQuery(
    operatorProofsQueryParams.query,
    operatorProofsQueryParams.variables,
  );
  const validProofs = result.transactions.edges.filter((el) => {
    try {
      const halfHourAgoSeconds = Date.now() - 32 * 60; // add 2 minutes margin
      const proofTimestamp = parseInt(findTag(el, 'unixTime') as string, 10);
      const proofOwner = el.node.owner.address;
      return (
        proofTimestamp > halfHourAgoSeconds &&
        proofTimestamp <= Date.now() / secondInMS &&
        operatorAddrs.includes(proofOwner)
      ); // return only proofs that were submitted in alst 32 minutes by operator addresses
    } catch (err) {
      logger.error((err as Error).message);
      return false;
    }
  });
  const validProofOwners = validProofs.map((el) => el.node.owner.address);

  // return only operators with valid proofs
  return filtered.filter((el) =>
    validProofOwners.includes(findTag(el, 'sequencerOwner') as string),
  );
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
  scriptOperators?: string[],
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

  if (scriptOperators && scriptOperators.length > 0) {
    return {
      query: FIND_BY_TAGS_WITH_OWNERS,
      variables: {
        owners: scriptOperators,
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const runQuery = async (query: DocumentNode, variables: any) => {
  const { data }: { data: IQueryResult } = await apolloClient.query({
    query,
    variables,
  });

  return data;
};

export const getStampsQuery = (txs: string[], first = DEFAULT_PAGE_SIZE, after?: string) => {
  return {
    query: STAMPS_QUERY,
    variables: {
      txs,
      first,
      after,
    },
  };
};
