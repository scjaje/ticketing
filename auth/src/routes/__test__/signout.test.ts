import request from 'supertest';
import { app } from '../../app.js';

it('cookie is expired after signing out', async () => {
  // First sign up to obtain a cookie
  const signupResponse = await request(app)
    .post('/api/users/signup')
    .send({
      email: 'test@test.com',
      password: 'password',
    })
    .expect(201);

  // Verify cookie exists
  expect(signupResponse.get('Set-Cookie')).toBeDefined;

  const signoutResponse = await request(app)
    .post('/api/users/signout')
    .expect(200);

  const cookie = signoutResponse.get('Set-Cookie');
  if (!cookie) {
    throw new Error('Expected cookie but got undefined.');
  }

  expect(cookie[0]).toEqual(
    'session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; httponly',
  );
});
