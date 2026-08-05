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

it('updates to cancelled', async () => {
  // Create three tickets
  const ticketOne = await buildTicket();

  // Create a user
  const userOne = global.signin('user1');

  // Create one order as user one
  const responseData = await request(app)
    .post('/api/orders')
    .set('Cookie', userOne)
    .send({ ticketId: ticketOne._id })
    .expect(StatusCodes.CREATED);

  // Cancel the ticket
  const response = await request(app)
    .delete(`/api/orders/${responseData.body.id}`)
    .set('Cookie', userOne)
    .expect(StatusCodes.OK);

  // Make sure ticket status shows cancelled
  expect(response.body.status).toEqual(OrderStatus.Cancelled);
});

it('emits an order cancelled event', async () => {
  let orders = await Order.find({});
  expect(orders.length).toEqual(0);

  // Create one tickets
  const ticketTwo = await buildTicket();

  // Create 1 users
  const userOne = global.signin('user1');

  // Create order for user 1
  const responseData = await request(app)
    .post('/api/orders')
    .set('Cookie', userOne)
    .send({ ticketId: ticketTwo._id })
    .expect(StatusCodes.CREATED);

  // Cancel the ticket
  await request(app)
    .delete(`/api/orders/${responseData.body.id}`)
    .set('Cookie', userOne)
    .expect(StatusCodes.OK);

  expect(natsWrapper.client.publish).toHaveBeenCalled();
});
