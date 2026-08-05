import { jest } from '@jest/globals';
import { Payment } from '../../models/payment.js';

// Reuses the manual mock in stripe/__mocks__/stripe.ts. Jest's automatic
// __mocks__-folder pickup only applies to node_modules packages; for our
// own modules under ESM (--experimental-vm-modules) it has to be wired up
// explicitly like this. Scoped to just this file (rather than the shared
// test/setup.ts) so charge-real-stripe.test.ts can hit the real module.
jest.unstable_mockModule(
  '../../stripe/stripe',
  () => import('../../stripe/__mocks__/stripe.js'),
);

const { OrderStatus, StatusCodes } = await import('@scott-tickets/common');
const request = (await import('supertest')).default;
const mongoose = (await import('mongoose')).default;
const { Order } = await import('../../models/order.js');
const { stripe } = await import('../../stripe/stripe.js');

const { app } = await import('../../app.js');

const buildOrder = async (userId?: string) => {
  const order = Order.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    price: 55,
    version: 0,
    userId: userId ?? new mongoose.Types.ObjectId().toHexString(),
    status: OrderStatus.Created,
  });

  await order.save();

  return order;
};

it('has a route handler listening to /api/payments for post requests', async () => {
  const response = await request(app).post('/api/payments').send({});

  expect(response.status).not.toEqual(404);
});

it('can only be accessed if a user is signed in', async () => {
  await request(app)
    .post('/api/payments')
    .send({})
    .expect(StatusCodes.UNAUTHORIZED);
});

it('returns a 404 when purchasing an order that does not exist', async () => {
  await request(app)
    .post('/api/payments')
    .set('Cookie', global.signin())
    .send({
      paymentMethodId: '123',
      orderId: new mongoose.Types.ObjectId().toHexString(),
    })
    .expect(StatusCodes.NOT_FOUND);
});

it('it returns a 401 when purchasing an order that does not belong to the user', async () => {
  const order = await buildOrder();

  await request(app)
    .post('/api/payments')
    .set('Cookie', global.signin())
    .send({
      paymentMethodId: '123',
      orderId: order.id,
    })
    .expect(StatusCodes.UNAUTHORIZED);
});

it('it returns a 409 when purchasing a cancelled order', async () => {
  const userId = new mongoose.Types.ObjectId().toHexString();
  const order = await buildOrder(userId);

  order.status = OrderStatus.Cancelled;

  await order.save();

  await request(app)
    .post('/api/payments')
    .set('Cookie', global.signin(userId))
    .send({
      paymentMethodId: '123',
      orderId: order.id,
    })
    .expect(StatusCodes.CONFLICT);
});

it('it returns a 409 when purchasing a completed order', async () => {
  const userId = new mongoose.Types.ObjectId().toHexString();
  const order = await buildOrder(userId);

  order.status = OrderStatus.Complete;

  await order.save();

  await request(app)
    .post('/api/payments')
    .set('Cookie', global.signin(userId))
    .send({
      paymentMethodId: '123',
      orderId: order.id,
    })
    .expect(StatusCodes.CONFLICT);
});

it('returns a 200 with valid inputs and the payment id matches in the return', async () => {
  const userId = new mongoose.Types.ObjectId().toHexString();
  const order = await buildOrder(userId);

  const resp = await request(app)
    .post('/api/payments')
    .set('Cookie', global.signin(userId))
    .send({
      paymentMethodId: 'pm_card_visa',
      orderId: order.id,
    })
    .expect(StatusCodes.OK);

  const paymentIntentOptions = (stripe.paymentIntents.create as jest.Mock)
    .mock.calls[0]![0] as {
    payment_method: string;
    amount: number;
    currency: string;
  };

  expect(paymentIntentOptions.payment_method).toEqual('pm_card_visa');
  expect(paymentIntentOptions.amount).toEqual(order.price * 100);
  expect(paymentIntentOptions.currency).toEqual('usd');

  const payment = await Payment.findOne({
    orderId: order.id,
  });

  expect(payment).toBeDefined();
  expect(resp.body.id).toEqual(payment!.id);
});
