import { StatusCodes } from '@scott-tickets/common';
import request from 'supertest';
import mongoose from 'mongoose';
import { natsWrapper } from '../../nats/nats-wrapper.js';
import { Ticket } from '../../models/ticket.js';

const { app } = await import('../../app.js');

const payload = {
  title: 'test',
  price: 20,
};

// default user in global.signin() is set as 1234
const createTicket = () => {
  return request(app)
    .post('/api/tickets')
    .set('Cookie', global.signin())
    .send(payload);
};

it('returns a 404 if the provided id does not exist', async () => {
  const id = new mongoose.Types.ObjectId().toHexString();
  await request(app)
    .put(`/api/tickets/${id}`)
    .set('Cookie', global.signin())
    .send(payload)
    .expect(StatusCodes.NOT_FOUND);
});

it('returns a 401 if the user is not authenticated', async () => {
  const id = new mongoose.Types.ObjectId().toHexString();
  await request(app)
    .put(`/api/tickets/${id}`)
    .send(payload)
    .expect(StatusCodes.UNAUTHORIZED);
});

it('returns a 401 if the user does not own the ticket', async () => {
  const response = await createTicket().expect(201);

  // pass another id in for the signin function so that you are a "different user"
  await request(app)
    .put(`/api/tickets/${response.body.id}`)
    .set('Cookie', global.signin('12345'))
    .send(payload)
    .expect(StatusCodes.UNAUTHORIZED);
});

it('returns a 400 if the user provides an invalid title or price', async () => {
  const response = await createTicket().expect(201);

  // Invalid title
  await request(app)
    .put(`/api/tickets/${response.body.id}`)
    .set('Cookie', global.signin())
    .send({ title: '', price: 20 })
    .expect(StatusCodes.BAD_REQUEST);

  // Invalid price
  await request(app)
    .put(`/api/tickets/${response.body.id}`)
    .set('Cookie', global.signin())
    .send({ title: 'new title', price: '' })
    .expect(StatusCodes.BAD_REQUEST);

  // No title or price
  // Invalid title
  await request(app)
    .put(`/api/tickets/${response.body.id}`)
    .set('Cookie', global.signin())
    .send({})
    .expect(StatusCodes.BAD_REQUEST);
});

it('updates the ticket provided valid inputs', async () => {
  const response = await createTicket().expect(201);

  expect(response.body.title).toEqual(payload.title);
  expect(response.body.price).toEqual(payload.price);

  // pass another id in for the signin function so that you are a "different user"
  const updatedPayload = {
    title: 'new',
    price: 25,
  };
  const ticket = await request(app)
    .put(`/api/tickets/${response.body.id}`)
    .set('Cookie', global.signin())
    .send(updatedPayload)
    .expect(StatusCodes.OK);

  expect(ticket.body.title).toEqual(updatedPayload.title);
  expect(ticket.body.price).toEqual(updatedPayload.price);
});

it('sends an error when the order id is set so edits can not be made', async () => {
  const response = await createTicket().expect(201);
  const currentTicket = await Ticket.findById(response.body.id);
  const orderId = new mongoose.Types.ObjectId().toHexString();

  currentTicket!.orderId = orderId;
  await currentTicket?.save();

  // pass another id in for the signin function so that you are a "different user"
  const updatedPayload = {
    title: 'new',
    price: 25,
  };
  const ticket = await request(app)
    .put(`/api/tickets/${response.body.id}`)
    .set('Cookie', global.signin())
    .send(updatedPayload)
    .expect(StatusCodes.CONFLICT);
});

it('publishes an event', async () => {
  const response = await createTicket().expect(201);

  expect(response.body.title).toEqual(payload.title);
  expect(response.body.price).toEqual(payload.price);

  // pass another id in for the signin function so that you are a "different user"
  const updatedPayload = {
    title: 'new',
    price: 25,
  };

  await request(app)
    .put(`/api/tickets/${response.body.id}`)
    .set('Cookie', global.signin())
    .send(updatedPayload)
    .expect(StatusCodes.OK);

  expect(natsWrapper.client.publish).toHaveBeenCalled();
});
