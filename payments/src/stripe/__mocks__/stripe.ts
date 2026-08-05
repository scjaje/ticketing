import { jest } from '@jest/globals';

export const stripe = {
  paymentIntents: {
    create: jest
      .fn<() => Promise<Record<string, unknown>>>()
      .mockResolvedValue({ id: 'test-payment-intent-id', status: 'succeeded' }),
  },
};
