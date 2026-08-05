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

it('fetches orders for an particular user', async () => {
  // Create three tickets
  const ticketOne = await buildTicket();
  const ticketTwo = await buildTicket();
  const ticketThree = await buildTicket();

  // Create 2 different users
  const userOne = global.signin('user1');
  const userTwo = global.signin('user2');

  // Create one order as user one
  await request(app)
    .post('/api/orders')
    .set('Cookie', userOne)
    .send({ ticketId: ticketOne._id })
    .expect(StatusCodes.CREATED);

  // Create two orders as user two
  const { body: orderOne } = await request(app)
    .post('/api/orders')
    .set('Cookie', userTwo)
    .send({ ticketId: ticketTwo._id })
    .expect(StatusCodes.CREATED);

  const { body: orderTwo } = await request(app)
    .post('/api/orders')
    .set('Cookie', userTwo)
    .send({ ticketId: ticketThree._id })
    .expect(StatusCodes.CREATED);

  // Make a request to get orders for user two
  const response = await request(app)
    .get('/api/orders')
    .set('Cookie', userTwo)
    .expect(StatusCodes.OK);

  // Make sure we only get the orders for user two

  expect(response.body).toHaveLength(2);
  expect(response.body[0].id).toEqual(orderOne.id);
  expect(response.body[1].id).toEqual(orderTwo.id);

  expect(response.body[0].ticket.id).toEqual(ticketTwo.id);
  expect(response.body[1].ticket.id).toEqual(ticketThree.id);
});

it('fetches the order', async () => {
  // Create one tickets
  const ticketTwo = await buildTicket();

  // Create user
  const userTwo = global.signin('user2');

  // Create order for user
  const { body: orderOne } = await request(app)
    .post('/api/orders')
    .set('Cookie', userTwo)
    .send({ ticketId: ticketTwo._id })
    .expect(StatusCodes.CREATED);

  // Make a request to get orders for user two
  const response = await request(app)
    .get(`/api/orders/${orderOne.id}`)
    .set('Cookie', userTwo)
    .expect(StatusCodes.OK);

  // Make sure we only get the orders for user two

  // expect(response.body).toHaveLength(1);
  expect(response.body.id).toEqual(orderOne.id);

  expect(response.body.ticket.id).toEqual(ticketTwo.id);
});

it('returns an error if one user tries to fetch another users order', async () => {
  // Create one tickets
  const ticketTwo = await buildTicket();

  // Create 2 users
  const userOne = global.signin('user1');
  const userTwo = global.signin('user2');

  // Create order for user 2
  const { body: orderOne } = await request(app)
    .post('/api/orders')
    .set('Cookie', userTwo)
    .send({ ticketId: ticketTwo._id })
    .expect(StatusCodes.CREATED);

  // Make a request to get orders for user two as user 1
  await request(app)
    .get(`/api/orders/${orderOne.id}`)
    .set('Cookie', userOne)
    .expect(StatusCodes.UNAUTHORIZED);
});
