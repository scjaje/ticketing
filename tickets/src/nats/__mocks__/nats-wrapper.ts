import { jest } from '@jest/globals';

export const natsWrapper = {
  client: {
    publish: jest.fn().mockImplementation(() => {
      (subject: string, data: string, callback: () => void) => {
        callback();
      };
    }),
  },
};
