import { StatusCodes } from '@scott-tickets/common';
import request from 'supertest';
import { natsWrapper } from '../../nats/nats-wrapper.js';

const { app } = await import('../../app.js');
const { Ticket } = await import('../../models/ticket.js');

it('has a route handler listening to /api/tickets for post requests', async () => {
  const response = await request(app).post('/api/tickets').send({});

  expect(response.status).not.toEqual(404);
});

it('can only be accessed if a user is signed in', async () => {
  await request(app)
    .post('/api/tickets')
    .send({})
    .expect(StatusCodes.UNAUTHORIZED);
});

it('returns status other then 401 if user is signed in', async () => {
  const response = await request(app)
    .post('/api/tickets')
    .set('Cookie', global.signin())
    .send({});

  // console.log(response.status);

  expect(response.status).not.toEqual(StatusCodes.UNAUTHORIZED);
});

it('it returns an error if an invalid title is provided', async () => {
  await request(app)
    .post('/api/tickets')
    .set('Cookie', global.signin())
    .send({
      title: '',
      price: 5.99,
    })
    .expect(StatusCodes.BAD_REQUEST);
});

it('it returns an error if an invalid price is provided', async () => {
  await request(app)
    .post('/api/tickets')
    .set('Cookie', global.signin())
    .send({
      title: 'test@test.com',
      price: '',
    })
    .expect(StatusCodes.BAD_REQUEST);
});

it('creates a ticket with valid inputs', async () => {
  let tickets = await Ticket.find({});
  expect(tickets.length).toEqual(0);

  await request(app)
    .post('/api/tickets')
    .set('Cookie', global.signin())
    .send({
      title: 'testtest.com',
      price: 5.99,
    })
    .expect(StatusCodes.CREATED);

  tickets = await Ticket.find({});
  expect(tickets.length).toEqual(1);
  expect(tickets[0]?.price).toEqual(5.99);
  expect(tickets[0]?.title).toEqual('testtest.com');
});

it('publishes an event', async () => {
  let tickets = await Ticket.find({});
  expect(tickets.length).toEqual(0);

  await request(app)
    .post('/api/tickets')
    .set('Cookie', global.signin())
    .send({
      title: 'testtest.com',
      price: 5.99,
    })
    .expect(StatusCodes.CREATED);

  expect(natsWrapper.client.publish).toHaveBeenCalled();
});
