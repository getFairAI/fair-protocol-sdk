import { describe, expect, test, jest } from '@jest/globals';
import { TAG_NAMES } from '../utils/constants';
import { listModels } from '../queries/model';
import { findByTags } from '../utils/queries';

const models = [
  {
    node: {
      id: '1',
      tags: [
        { name: TAG_NAMES.modelName, value: 'model1' },
        { name: TAG_NAMES.unixTime, value: '1' },
        { name: TAG_NAMES.modelTransaction, value: 'modelId1' },
        { name: TAG_NAMES.sequencerOwner, value: 'owner1' },
      ],
    },
  },
  {
    node: {
      id: '2',
      tags: [
        { name: TAG_NAMES.modelName, value: 'model2' },
        { name: TAG_NAMES.unixTime, value: '2' },
        { name: TAG_NAMES.modelTransaction, value: 'modelId2' },
        { name: TAG_NAMES.sequencerOwner, value: 'owner2' },
      ],
    },
  },
];

jest.mock('../queries', () => {
  return {
    findByTags: jest.fn().mockImplementation(() => {
      return {
        transactions: {
          edges: models,
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

describe('Models', () => {
  test('list models', async () => {
    const result = await listModels();

    expect(result.length).toBe(models.length);
  });
});
