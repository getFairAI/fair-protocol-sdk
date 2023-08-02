import { describe, expect, test, jest } from '@jest/globals';
import { TAG_NAMES } from '../utils/constants';
import { listOperators } from '../queries/operator';
import { findByTags } from '../utils/queries';

const operators = [
  {
    node: {
      id: '1',
      tags: [
        { name: TAG_NAMES.scriptName, value: 'script1' },
        { name: TAG_NAMES.scriptCurator, value: 'curator1' },
        { name: TAG_NAMES.unixTime, value: '1' },
        { name: TAG_NAMES.modelTransaction, value: 'modelId1' },
        { name: TAG_NAMES.sequencerOwner, value: 'owner1' },
        { name: TAG_NAMES.scriptTransaction, value: 'scriptId1' },
        { name: TAG_NAMES.operatorName, value: 'operator1' },
        { name: TAG_NAMES.operatorFee, value: '0.1' },
      ],
    },
  },
  {
    node: {
      id: '2',
      tags: [
        { name: TAG_NAMES.scriptName, value: 'script2' },
        { name: TAG_NAMES.scriptCurator, value: 'curator2' },
        { name: TAG_NAMES.unixTime, value: '2' },
        { name: TAG_NAMES.modelTransaction, value: 'modelId2' },
        { name: TAG_NAMES.sequencerOwner, value: 'owner2' },
        { name: TAG_NAMES.scriptTransaction, value: 'scriptId2' },
        { name: TAG_NAMES.operatorName, value: 'operator2' },
        { name: TAG_NAMES.operatorFee, value: '0.2' },
      ],
    },
  },
];

jest.mock('../queries', () => {
  return {
    findByTags: jest.fn().mockImplementation(() => {
      return {
        transactions: {
          edges: operators,
          pageInfo: {
            hasNextPage: false,
          },
        },
      };
    }) as jest.MockedFunction<typeof findByTags>,
    getTxWithOwners: jest.fn().mockImplementation(() => {
      return {
        transactions: {
          edges: [],
          pageInfo: {
            hasNextPage: false,
          },
        },
      };
    }) as jest.MockedFunction<typeof findByTags>,
  };
});

describe('Operators', () => {
  test('list all operators', async () => {
    const result = await listOperators();

    expect(result.length).toBe(operators.length);
  });
});
