// Every other test file in this suite hits the mocked stripe module (see
// stripe/__mocks__/stripe.ts, and new.test.ts which registers it locally),
// which proves our code *calls* stripe.paymentIntents.create with the right
// args but can't catch mistakes in how we're actually talking to Stripe's
// API (wrong field names, bad currency format, API version drift). This
// file never registers that mock, so it naturally imports the real stripe
// module and hits Stripe's real test-mode API, using the special
// pm_card_visa test payment method that always succeeds.
//
// Needs a real Stripe test secret key: run with
//   STRIPE_KEY=sk_test_... npm test
// (see test/env.ts — it only defaults STRIPE_KEY when one isn't already
// set, so this doesn't get clobbered).
import { OrderStatus, StatusCodes } from '@scott-tickets/common';
import request from 'supertest';
import mongoose from 'mongoose';
import { Order } from '../../models/order.js';
import { stripe } from '../../stripe/stripe.js';
import { Payment } from '../../models/payment.js';

const { app } = await import('../../app.js');

it('charges the users card', async () => {
  const price = Math.floor(Math.random() * 100000);
  const userId = new mongoose.Types.ObjectId().toHexString();

  const order = Order.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    userId,
    price,
    version: 0,
    status: OrderStatus.Created,
  });
  await order.save();

  await request(app)
    .post('/api/payments')
    .set('Cookie', global.signin(userId))
    .send({
      paymentMethodId: 'pm_card_visa',
      orderId: order.id,
    })
    .expect(StatusCodes.OK);

  const paymentIntents = await stripe.paymentIntents.list({ limit: 50 });
  const paymentIntent = paymentIntents.data.find(
    (intent) => intent.amount === price * 100,
  );

  expect(paymentIntent).toBeDefined();
  expect(paymentIntent!.currency).toEqual('usd');

  const payment = await Payment.findOne({
    orderId: order.id,
    stripeId: paymentIntent!.id,
  });

  expect(payment).not.toBeNull();
});
