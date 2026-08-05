import { jest } from '@jest/globals';
import { OrderStatus, type OrderCreatedEvent } from '@scott-tickets/common';
import { natsWrapper } from '../../../nats/nats-wrapper.js';
import { OrderCreatedListener } from '../order-created-listener.js';
import mongoose from 'mongoose';
import type { Message } from 'node-nats-streaming';
import { Order } from '../../../models/order.js';

const setup = async () => {
  const listener = new OrderCreatedListener(natsWrapper.client);

  const data: OrderCreatedEvent['data'] = {
    id: new mongoose.Types.ObjectId().toHexString(),
    version: 0,
    expiresAt: 'dddd',
    userId: 'asss',
    status: OrderStatus.Created,
    ticket: {
      id: '111',
      price: 20,
    },
  };

  // @ts-ignore
  const msg: Message = {
    ack: jest.fn(),
  };

  return { listener, data, msg };
};

it('replicates the order info', async () => {
  const { listener, data, msg } = await setup();
  await listener.onMessage(data, msg);
  const order = await Order.findById(data.id);
  expect(order!.price).toEqual(data.ticket.price);
});

it('acks the message', async () => {
  const { listener, data, msg } = await setup();
  await listener.onMessage(data, msg);
  expect(msg.ack).toHaveBeenCalled();
});
