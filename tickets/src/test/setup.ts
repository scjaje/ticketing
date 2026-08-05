import { jest } from '@jest/globals';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

jest.unstable_mockModule('../nats/nats-wrapper', () => ({
  natsWrapper: {
    client: {
      publish: jest.fn(
        (_subject: string, _data: string, callback: () => void) => {
          callback();
        },
      ),
    },
  },
}));

declare global {
  var signin: (id?: string) => string[];
}

let mongo: any;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  const mongoUri = mongo.getUri();

  await mongoose.connect(mongoUri, {});
});

beforeEach(async () => {
  jest.clearAllMocks();

  if (mongoose.connection.db) {
    const collections = await mongoose.connection.db.collections();

    for (let collection of collections) {
      await collection.deleteMany({});
    }
  }
});

afterAll(async () => {
  await mongoose.connection.close();
  if (mongo) {
    await mongo.stop();
  }
}, 20000);

global.signin = (id = '1234') => {
  // Build the payload
  const payload = { id, email: 'test@test.com' };

  // Create the JWT
  const token = jwt.sign(payload, process.env.JWT_KEY!);

  // Build session Object {jwt: MY_JWT}
  const session = { jwt: token };

  // Turn that session into JSON
  const sessionJSON = JSON.stringify(session);

  // Take JSON and encode it as base64
  const base64 = Buffer.from(sessionJSON).toString('base64');

  // Return a string thats the cookie with the encoded data
  return [`session=${base64}`];
};
