import request from 'supertest';
import { app } from '../../app.js';

it('returns a 201 on successful signup', async () => {
  return request(app)
    .post('/api/users/signup')
    .send({
      email: 'test@test.com',
      password: 'password',
    })
    .expect(201);
});

it('returns a 400 status code when an invalid email is used', async () => {
  return request(app)
    .post('/api/users/signup')
    .send({ email: 'invalid', password: 'password' })
    .expect(400);
});

it('returns a 400 status code when an invalid password is used', async () => {
  return request(app)
    .post('/api/users/signup')
    .send({ email: 'test2@test.com', password: 'pas' })
    .expect(400);
});

it('returns a 409 status code when an email is already registered', async () => {
  // Register the email first
  await request(app)
    .post('/api/users/signup')
    .send({ email: 'test@test.com', password: 'password' })
    .expect(201);

  // Test again with the email
  await request(app)
    .post('/api/users/signup')
    .send({ email: 'test@test.com', password: 'password' })
    .expect(409);
});

it('sets a cookie after successful signup', async () => {
  const resposne = await request(app)
    .post('/api/users/signup')
    .send({ email: 'test@test.com', password: 'password' })
    .expect(201);

  expect(resposne.get('Set-Cookie')).toBeDefined();
});
