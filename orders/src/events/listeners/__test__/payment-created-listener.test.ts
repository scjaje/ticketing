import { jest } from '@jest/globals';
import { type Message } from 'node-nats-streaming';
import mongoose from 'mongoose';
import {
  OrderStatus,
  Subjects,
  type PaymentCreatedEvent,
  type TicketCreatedEvent,
} from '@scott-tickets/common';
import { natsWrapper } from '../../../nats/nats-wrapper.js';
import { Ticket } from '../../../models/ticket.js';
import { PaymentCreatedListener } from '../payment-created-listener.js';
import { Order } from '../../../models/order.js';
import { Payment } from '../../../models/payment.js';

const setup = async () => {
  // create an instance of the listener
  const listener = new PaymentCreatedListener(natsWrapper.client);

  // Create and save a ticket
  const ticket = Ticket.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    title: 'concert',
    price: 20,
  });

  await ticket.save();

  const order = Order.build({
    status: OrderStatus.Created,
    userId: 'alskdfj',
    expiresAt: new Date(),
    ticket,
  });

  await order.save();

  // create a fake data event
  const data: PaymentCreatedEvent['data'] = {
    id: new mongoose.Types.ObjectId().toHexString(),
    orderId: order.id,
    stripeId: '5678',
  };

  // create a fake message object
  // @ts-ignore
  const msg: Message = {
    ack: jest.fn(),
  };

  return { listener, ticket, order, data, msg };
};

it('updates the status on the order and links the payment', async () => {
  const { listener, data, msg, order, ticket } = await setup();
  // call the onMessage function with the data object + message object
  await listener.onMessage(data, msg);

  expect(order).toBeDefined();
  expect(ticket).toBeDefined();
  expect(order!.id).toEqual(data.orderId);

  const updatedOrder = await Order.findById(data.orderId).populate('payment');

  // ensure that this is the same order, just the updated one in the database
  expect(updatedOrder).toBeDefined();
  expect(updatedOrder!.id).toEqual(order.id);

  // check payment information matches
  expect(updatedOrder!.payment).toBeDefined();
  expect(updatedOrder!.payment!.orderId).toEqual(data.orderId);
  expect(updatedOrder!.payment!.stripeId).toEqual(data.stripeId);

  expect(updatedOrder!.status).toEqual(OrderStatus.Complete);
});

it('acks the message', async () => {
  const { listener, data, msg } = await setup();
  // call the onMessage function with the data object + message object
  await listener.onMessage(data, msg);
  // write assertions to make sure ack function is called
  expect(msg.ack).toHaveBeenCalled();
});

it('publishes an order:updated event with the correct order data', async () => {
  const { listener, data, msg, order } = await setup();

  await listener.onMessage(data, msg);

  expect(natsWrapper.client.publish).toHaveBeenCalled();

  // client.publish(subject, JSON.stringify(data), callback) — see
  // base-publisher.ts — so calls[0][0] is the subject and calls[0][1] is
  // the JSON string of the event data.
  const publishCall = (natsWrapper.client.publish as jest.Mock).mock
    .calls[0]!;
  const subject = publishCall[0];
  const eventData = JSON.parse(publishCall[1] as string);

  expect(subject).toEqual(Subjects.OrderUpdated);
  expect(eventData.id).toEqual(order.id);
  expect(eventData.status).toEqual(OrderStatus.Complete);
  expect(eventData.ticket.id).toEqual(order.ticket!.id);

  // Confirm the published version matches what actually got saved. This
  // matters because payments' OrderUpdatedListener does
  // findOne({ _id: data.id, version: data.version - 1 }) to find its own
  // local copy of the order — if the published version ever drifted from
  // the real order.version (e.g. someone forgot to increment before
  // publishing), that lookup would silently fail. We hit exactly this bug
  // earlier in this project, so it's worth guarding against here.
  const updatedOrder = await Order.findById(order.id);
  expect(eventData.version).toEqual(updatedOrder!.version);
});

it('throws an error and does not ack if the order cannot be found', async () => {
  const { listener, msg } = await setup();

  // A payment event pointing at an orderId that doesn't exist in this
  // service's DB — should never happen in practice, but the listener
  // should fail loudly (and not ack) rather than silently doing nothing.
  const badData: PaymentCreatedEvent['data'] = {
    id: new mongoose.Types.ObjectId().toHexString(),
    orderId: new mongoose.Types.ObjectId().toHexString(),
    stripeId: 'doesnt-matter',
  };

  await expect(listener.onMessage(badData, msg)).rejects.toThrow(
    'The order was not found',
  );

  // Not acking means NATS will redeliver the message later instead of us
  // silently dropping it.
  expect(msg.ack).not.toHaveBeenCalled();
});

it('creates a standalone Payment document with the correct fields', async () => {
  const { listener, data, msg } = await setup();

  await listener.onMessage(data, msg);

  // Checked independently of Order's populate('payment') from the first
  // test above — this proves the Payment collection itself got written,
  // not just that the reference on Order resolves correctly.
  const payment = await Payment.findById(data.id);

  expect(payment).toBeDefined();
  expect(payment!.orderId).toEqual(data.orderId);
  expect(payment!.stripeId).toEqual(data.stripeId);
});

it('does not mark an already-cancelled order as Complete, but still records the payment and acks', async () => {
  const { listener, order, data, msg } = await setup();

  // Simulate the race: the order got cancelled (e.g. by expiration or the
  // user) after the charge had already succeeded on the payments side, but
  // before this PaymentCreated event was processed here.
  order.status = OrderStatus.Cancelled;
  await order.save();

  await listener.onMessage(data, msg);

  const updatedOrder = await Order.findById(order.id);

  // Status must stay Cancelled — this must never get silently flipped back
  // to Complete over a cancellation, since a real charge went through.
  expect(updatedOrder!.status).toEqual(OrderStatus.Cancelled);
  expect(updatedOrder!.payment).toBeFalsy();

  // The Payment record itself should still exist — it's the audit trail a
  // human needs to find this charge and refund it.
  const payment = await Payment.findById(data.id);
  expect(payment).toBeDefined();
  expect(payment!.orderId).toEqual(order.id);

  // We ack instead of throwing: retrying this message can't fix the
  // situation (the order stays Cancelled either way), and retrying would
  // also fail trying to re-save a Payment with the same _id.
  expect(msg.ack).toHaveBeenCalled();

  // And no order:updated event should go out, since nothing about the
  // order's real state changed.
  expect(natsWrapper.client.publish).not.toHaveBeenCalled();
});
