import { jest } from '@jest/globals';
import { type Message } from 'node-nats-streaming';
import mongoose from 'mongoose';
import { type OrderCancelledEvent } from '@scott-tickets/common';

import { natsWrapper } from '../../../nats/nats-wrapper.js';
import { Ticket } from '../../../models/ticket.js';
import { OrderCancelledListener } from '../order-cancelled-listener.js';

const setup = async () => {
  // create an instance of the listener
  const listener = new OrderCancelledListener(natsWrapper.client);

  // Create and save ticket
  const orderId = new mongoose.Types.ObjectId().toHexString();
  const ticket = Ticket.build({
    userId: new mongoose.Types.ObjectId().toHexString(),
    title: 'concert',
    price: 12,
  });

  ticket.orderId = orderId;
  await ticket.save();

  // Calculate an expiration date for this order
  const expiration = new Date();

  expiration.setSeconds(expiration.getSeconds() + 600);

  // create a fake data event
  const data: OrderCancelledEvent['data'] = {
    id: new mongoose.Types.ObjectId().toHexString(),
    version: 0,
    ticket: {
      id: ticket.id,
    },
  };

  // create a fake message object
  // @ts-ignore
  const msg: Message = {
    ack: jest.fn(),
  };

  return { listener, data, msg, ticket, orderId };
};

it('unsets the userId of the ticket', async () => {
  const { listener, data, msg, ticket } = await setup();

  // call the onMessage function with the data object + message object
  await listener.onMessage(data, msg);

  // write assertions to make sure the ticket was created
  const existingTicket = await Ticket.findById(ticket.id);

  expect(existingTicket).toBeDefined();
  expect(existingTicket!.orderId).toEqual(undefined);
});

it('updates the ticket, publishes a ticket updated event, and acks the message', async () => {
  const { listener, data, msg, ticket } = await setup();
  // call the onMessage function with the data object + message object
  await listener.onMessage(data, msg);

  const updatedTicket = await Ticket.findById(ticket.id);

  expect(updatedTicket!.orderId).not.toBeDefined();
  expect(msg.ack).toHaveBeenCalled();
  // write assertions to make sure publish function is called
  expect(natsWrapper.client.publish).toHaveBeenCalled();
});
