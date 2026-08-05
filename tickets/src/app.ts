import './config.js';
import express from 'express';
import 'express-async-errors';
import cookieSession from 'cookie-session';
import { json } from 'body-parser';
import {
  errorHandler,
  NotFoundError,
  currentUser,
} from '@scott-tickets/common';
import {
  createTicketRouter,
  showTicketRouter,
  updateTicketRouter,
} from './routes/index.js';

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

app.use(currentUser, createTicketRouter);
app.use(currentUser, updateTicketRouter);
app.use(showTicketRouter);
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
