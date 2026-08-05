import { jest } from '@jest/globals';
import { type Message } from 'node-nats-streaming';
import mongoose from 'mongoose';
import { type TicketUpdatedEvent } from '@scott-tickets/common';
import { natsWrapper } from '../../../nats/nats-wrapper.js';
import { Ticket } from '../../../models/ticket.js';
import { TicketUpdatedListener } from '../ticket-updated-listener.js';

const setup = async () => {
  // create a listener
  const listener = new TicketUpdatedListener(natsWrapper.client);

  // create and save a ticket
  const ticket = Ticket.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    title: 'concert',
    price: 20,
  });

  await ticket.save();
  // create a fake data object
  const data: TicketUpdatedEvent['data'] = {
    id: ticket.id,
    version: ticket.version + 1,
    title: 'new concert',
    price: 999,
    userId: new mongoose.Types.ObjectId().toHexString(),
  };

  // create a fake message object
  // @ts-ignore
  const msg: Message = {
    ack: jest.fn(),
  };

  return { listener, data, msg, ticket };
};

it('creates and saves a ticket', async () => {
  const { listener, data, msg, ticket } = await setup();
  // call the onMessage function with the data object + message object
  await listener.onMessage(data, msg);

  // write assertions to make sure the ticket was created
  const updatedTicket = await Ticket.findById(ticket.id);

  expect(ticket).toBeDefined();
  expect(updatedTicket!.title).toEqual(data.title);
  expect(updatedTicket!.price).toEqual(data.price);
  expect(updatedTicket!.version).toEqual(data.version);
});

it('acks the message', async () => {
  const { listener, data, msg } = await setup();
  // call the onMessage function with the data object + message object
  await listener.onMessage(data, msg);
  // write assertions to make sure ack function is called
  expect(msg.ack).toHaveBeenCalled();
});

it('does not call ack if the event is not the expected order', async () => {
  const { listener, data, msg, ticket } = await setup();

  // set the version to a future version
  data.version = 10;

  try {
    // call the onMessage function with the data object + message object
    await listener.onMessage(data, msg);
  } catch (err) {}
  // write assertions to make sure ack function is called
  expect(msg.ack).not.toHaveBeenCalled();
});
