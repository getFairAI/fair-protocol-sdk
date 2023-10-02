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

import { IEdge, IQueryResult } from '../types/arweave';
import { runQuery, getRequestsQuery, getResponsesQuery } from '../utils/queries';

export const getResponses = async (
  requestIds: string[],
  userAddress?: string,
  scriptName?: string,
  scriptCurator?: string,
  scriptOperator?: string,
  currenctConversationId?: number,
  first?: number | 'all',
) => {
  if (first === 'all') {
    let hasNextPage = false;
    let lastPaginationCursor = undefined;
    const txs: IEdge[] = [];
    do {
      const { query, variables } = getResponsesQuery(
        requestIds,
        userAddress,
        scriptName,
        scriptCurator,
        scriptOperator,
        currenctConversationId,
      );
      variables.after = lastPaginationCursor;
      const data: IQueryResult = await runQuery(query, variables);

      hasNextPage = data.transactions.pageInfo.hasNextPage;
      lastPaginationCursor = data.transactions.edges[data.transactions.edges.length - 1].cursor;
      txs.push(...data.transactions.edges);
    } while (hasNextPage);

    return txs;
  } else {
    const { query, variables } = getResponsesQuery(
      requestIds,
      userAddress,
      scriptName,
      scriptCurator,
      scriptOperator,
      currenctConversationId,
      first,
    );
    const results = await runQuery(query, variables);

    return results.transactions.edges;
  }
};

export const getRequests = async (
  userAddr: string,
  scriptName?: string,
  scriptCurator?: string,
  scriptOperator?: string,
  currenctConversationId?: number,
  first?: number | 'all',
) => {
  if (first === 'all') {
    let hasNextPage = false;
    let lastPaginationCursor = undefined;
    const txs: IEdge[] = [];
    do {
      const { query, variables } = getRequestsQuery(
        userAddr,
        scriptName,
        scriptCurator,
        scriptOperator,
        currenctConversationId,
      );
      variables.after = lastPaginationCursor;
      const data: IQueryResult = await runQuery(query, variables);

      hasNextPage = data.transactions.pageInfo.hasNextPage;
      lastPaginationCursor = data.transactions.edges[data.transactions.edges.length - 1].cursor;
      txs.push(...data.transactions.edges);
    } while (hasNextPage);

    return txs;
  } else {
    const { query, variables } = getRequestsQuery(
      userAddr,
      scriptName,
      scriptCurator,
      scriptOperator,
      currenctConversationId,
      first,
    );
    const results = await runQuery(query, variables);

    return results.transactions.edges;
  }
};
