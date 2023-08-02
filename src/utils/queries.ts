import { GraphQLClient, gql } from 'graphql-request';
import { NET_ARWEAVE_URL } from './constants';
import { IContractQueryResult, IEdge, IQueryResult, ITagFilter } from '../types';

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

const QUERY_TXS_WITH_OWNERS = gql`
  query QUERY_TXS_WITH_OWNERS($owners: [String!], $tags: [TagFilter!], $first: Int!) {
    transactions(owners: $owners, tags: $tags, sort: HEIGHT_DESC, first: $first) {
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
  const data: IQueryResult = await client.request(QUERY_TXS_WITH_OWNERS, {
    tags,
    owners,
    first,
  });

  return data.transactions.edges;
};
