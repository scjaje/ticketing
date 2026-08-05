import './config.js';
import express from 'express';
import 'express-async-errors';
import cookieSession from 'cookie-session';
import { json } from 'body-parser';
import {
  signInRouter,
  signOutRouter,
  signUpRouter,
  currentUserRouter,
} from './routes/index.js';
import { errorHandler, NotFoundError } from '@scott-tickets/common';

const app = express();
// make express aware its behind a proxy in nginx
// tells it to still trust the traffic coming in through it
app.set('trust proxy', true);
app.use(json());

app.use(
  cookieSession({
    signed: false,
    // When we are in a test, jest sets this to test
    secure: process.env.NODE_ENV !== 'test',
    maxAge: 30 * 60 * 1000,
  }),
);

app.use(signInRouter);
app.use(signOutRouter);
app.use(signUpRouter);
app.use(currentUserRouter);

// We installed a package called express-async-errors
// This stops the requirement of using  the next function in express.
// This is how you need to do async errors if you are not using that package:

// app.all('*', (_req, _res, next) => {
//   next(new NotFoundError());
// });
app.all('*', async (_req, _res) => {
  throw new NotFoundError();
});

app.use(errorHandler);

export { app };
