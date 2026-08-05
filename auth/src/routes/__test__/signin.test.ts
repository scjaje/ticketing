import request from 'supertest';
import { app } from '../../app.js';

beforeEach(async () => {
  await request(app)
    .post('/api/users/signup')
    .send({
      email: 'test@test.com',
      password: 'password',
    })
    .expect(201);
});

it('returns a 201 on successful signin', async () => {
  await request(app)
    .post('/api/users/signin')
    .send({
      email: 'test@test.com',
      password: 'password',
    })
    .expect(201);
});

it('sets a cookie after successful signin', async () => {
  const response = await request(app)
    .post('/api/users/signin')
    .send({
      email: 'test@test.com',
      password: 'password',
    })
    .expect(201);

  expect(response.get('Set-Cookie')).toBeDefined();
});

it('returns a 400 when no email is provided', async () => {
  await request(app)
    .post('/api/users/signin')
    .send({
      email: '',
      password: 'password',
    })
    .expect(400);
});

it('returns a 400 when no password is provided', async () => {
  await request(app)
    .post('/api/users/signin')
    .send({
      email: 'test@test.com',
      password: '',
    })
    .expect(400);
});

it('returns a 400 when an invalid email is provided', async () => {
  await request(app)
    .post('/api/users/signin')
    .send({
      email: 'testtest.com',
      password: 'password',
    })
    .expect(400);
});

it('returns a 401 when incorrect password is provided', async () => {
  await request(app)
    .post('/api/users/signin')
    .send({
      email: 'test@test.com',
      password: 'passwor',
    })
    .expect(401);
});
