import { StatusCodes } from '@scott-tickets/common';
import request from 'supertest';
import mongoose from 'mongoose';

const { app } = await import('../../app.js');

const createTicket = () => {
  return request(app).post('/api/tickets').set('Cookie', global.signin()).send({
    title: 'asldkf',
    price: 20,
  });
};

it('returns a 404 if the ticket is not found', async () => {
  const id = new mongoose.Types.ObjectId().toHexString();
  await request(app).get(`/api/tickets/${id}`).expect(StatusCodes.NOT_FOUND);
});

it('returns the ticket if it is found', async () => {
  const title = 'concert';
  const price = 20;

  const response = await request(app)
    .post('/api/tickets')
    .set('Cookie', global.signin())
    .send({ title, price })
    .expect(StatusCodes.CREATED);

  const URL = `/api/tickets/${response.body.id}`;
  const ticketResponse = await request(app).get(URL).expect(StatusCodes.OK);

  expect(ticketResponse.body.title).toEqual(title);
  expect(ticketResponse.body.price).toEqual(price);
});

it('can fetch a list of tickets', async () => {
  await createTicket();
  await createTicket();
  await createTicket();

  const response = await request(app).get('/api/tickets').send().expect(200);

  expect(response.body.length).toEqual(3);
});
