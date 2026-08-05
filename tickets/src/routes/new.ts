import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import {
  NotAuthorizedError,
  requireAuth,
  StatusCodes,
  validateRequest,
} from '@scott-tickets/common';
import { Ticket } from '../models/ticket.js';
import { ticketValidators } from './validators.js';
import { TicketCreatedPublisher } from '../events/publishers/ticket-created-publisher.js';
import { natsWrapper } from '../nats/nats-wrapper.js';

const router = express.Router();

router.post(
  '/api/tickets',
  requireAuth,
  ticketValidators,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    const { title, price } = req.body;

    if (!req.currentUser) {
      return next(new NotAuthorizedError('You must be logged in.'));
    }

    const ticket = Ticket.build({ title, price, userId: req.currentUser.id });

    await ticket.save();

    new TicketCreatedPublisher(natsWrapper.client).publish({
      id: ticket.id,
      version: ticket.version,
      title: ticket.title,
      price: ticket.price,
      userId: ticket.userId,
    });
    res.status(StatusCodes.CREATED).send(ticket);
  },
);

export { router as createTicketRouter };
