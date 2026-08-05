import { jest } from '@jest/globals';
import { type Message } from 'node-nats-streaming';
import mongoose from 'mongoose';
import {
  OrderStatus,
  type OrderCreatedEvent,
  type TicketCreatedEvent,
} from '@scott-tickets/common';

import { OrderCreatedListener } from '../order-created-listener.js';
import { natsWrapper } from '../../../nats/nats-wrapper.js';
import { Ticket } from '../../../models/ticket.js';

const setup = async () => {
  // create an instance of the listener
  const listener = new OrderCreatedListener(natsWrapper.client);

  // Create and save ticket
  const ticket = Ticket.build({
    userId: new mongoose.Types.ObjectId().toHexString(),
    title: 'concert',
    price: 12,
  });

  await ticket.save();

  // Calculate an expiration date for this order
  const expiration = new Date();

  expiration.setSeconds(expiration.getSeconds() + 600);

  // create a fake data event
  const data: OrderCreatedEvent['data'] = {
    id: new mongoose.Types.ObjectId().toHexString(),
    version: 0,
    status: OrderStatus.Created,
    userId: new mongoose.Types.ObjectId().toHexString(),
    expiresAt: expiration.toISOString(),
    ticket: {
      id: ticket.id,
      price: ticket.price,
    },
  };

  // create a fake message object
  // @ts-ignore
  const msg: Message = {
    ack: jest.fn(),
  };

  return { listener, data, msg, ticket };
};

it('sets the userId of the ticket', async () => {
  const { listener, data, msg, ticket } = await setup();

  // call the onMessage function with the data object + message object
  await listener.onMessage(data, msg);

  // write assertions to make sure the ticket was created
  const existingTicket = await Ticket.findById(ticket.id);

  expect(existingTicket).toBeDefined();
  expect(existingTicket!.orderId).toEqual(data.id);
});

it('acks the message', async () => {
  const { listener, data, msg } = await setup();
  // call the onMessage function with the data object + message object
  await listener.onMessage(data, msg);
  // write assertions to make sure ack function is called
  expect(msg.ack).toHaveBeenCalled();
});

it('publishes a ticket updated event', async () => {
  const { listener, data, msg } = await setup();
  // call the onMessage function with the data object + message object
  await listener.onMessage(data, msg);
  // write assertions to make sure publish function is called
  expect(natsWrapper.client.publish).toHaveBeenCalled();
  // check the data on the event
  const storedData = JSON.parse(
    (natsWrapper.client.publish as jest.Mock).mock.calls[0]![1] as string,
  );

  expect(data.id).toEqual(storedData.orderId);
});
