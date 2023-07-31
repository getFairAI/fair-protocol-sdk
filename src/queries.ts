import { gql } from 'graphql-request';

export const FIND_BY_TAGS = gql`
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

export const QUERY_TX_WITH_OWNERS = gql`
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

export const QUERY_TXS_WITH_OWNERS = gql`
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

export const QUERY_TX_BY_ID = gql`
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

export const QUERY_TX_BY_IDS = gql`
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

export const QUERY_TXS_OWNERS = gql`
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
