import { jest } from '@jest/globals';
import {
  OrderStatus,
  type OrderCancelledEvent,
  type OrderCreatedEvent,
} from '@scott-tickets/common';
import { natsWrapper } from '../../../nats/nats-wrapper.js';
import { OrderCreatedListener } from '../order-created-listener.js';
import mongoose from 'mongoose';
import type { Message } from 'node-nats-streaming';
import { Order } from '../../../models/order.js';
import { OrderCancelledListener } from '../order-cancelled-listener.js';

const setup = async () => {
  const listener = new OrderCancelledListener(natsWrapper.client);

  const order = Order.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    status: OrderStatus.Created,
    price: 10,
    userId: '123',
    version: 0,
  });

  await order.save();

  const data: OrderCancelledEvent['data'] = {
    id: order.id,
    version: 1,
    ticket: {
      id: '111',
    },
  };

  // @ts-ignore
  const msg: Message = {
    ack: jest.fn(),
  };

  return { listener, data, msg, order };
};

it('the status of the order', async () => {
  const { listener, data, msg, order } = await setup();
  await listener.onMessage(data, msg);
  const updatedOrder = await Order.findById(order.id);
  expect(updatedOrder!.status).toEqual(OrderStatus.Cancelled);
});

it('acks the message', async () => {
  const { listener, data, msg } = await setup();
  await listener.onMessage(data, msg);
  expect(msg.ack).toHaveBeenCalled();
});
