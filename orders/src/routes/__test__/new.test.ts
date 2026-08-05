import { OrderStatus, StatusCodes } from '@scott-tickets/common';
import request from 'supertest';
import { natsWrapper } from '../../nats/nats-wrapper.js';
import mongoose from 'mongoose';
import { Order } from '../../models/order.js';

const { app } = await import('../../app.js');
const { Ticket } = await import('../../models/ticket.js');

const buildTicket = async () => {
  const ticket = Ticket.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    title: 'Title',
    price: 55,
  });

  await ticket.save();

  return ticket;
};

it('it returns an error if the ticket does not exist', async () => {
  const ticketId = new mongoose.Types.ObjectId();

  await request(app)
    .post('/api/orders')
    .set('Cookie', global.signin())
    .send({ ticketId })
    .expect(StatusCodes.NOT_FOUND);
});

it('returns an error if the ticket is already reserved', async () => {
  const ticket = Ticket.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    title: 'Title',
    price: 55,
  });

  await ticket.save();

  const expiration = new Date();

  expiration.setSeconds(expiration.getSeconds() + 15 * 60);

  const order = Order.build({
    userId: '123',
    status: OrderStatus.AwaitingPayment,
    expiresAt: expiration,
    ticket: ticket,
  });

  await order.save();

  await request(app)
    .post('/api/orders')
    .set('Cookie', global.signin())
    .send({ ticketId: ticket._id })
    .expect(StatusCodes.CONFLICT);
});

it('reserves a ticket', async () => {
  const ticket = Ticket.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    title: 'Title',
    price: 55,
  });

  await ticket.save();

  await request(app)
    .post('/api/orders')
    .set('Cookie', global.signin())
    .send({ ticketId: ticket._id })
    .expect(StatusCodes.CREATED);
});

it('emits an order created event', async () => {
  let orders = await Order.find({});
  expect(orders.length).toEqual(0);

  // Create one tickets
  const ticketTwo = await buildTicket();

  // Create 1 users
  const userOne = global.signin('user1');

  // Create order for user 1
  await request(app)
    .post('/api/orders')
    .set('Cookie', userOne)
    .send({ ticketId: ticketTwo._id })
    .expect(StatusCodes.CREATED);

  expect(natsWrapper.client.publish).toHaveBeenCalled();
});
