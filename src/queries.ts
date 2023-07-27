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
