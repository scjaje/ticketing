import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import {
  BadRequestError,
  NotAuthorizedError,
  NotFoundError,
  requireAuth,
  StatusCodes,
  validateRequest,
} from '@scott-tickets/common';
import { Ticket } from '../models/ticket.js';
import { ticketValidators } from './validators.js';
import { TicketUpdatedPublisher } from '../events/publishers/ticket-updated-publisher.js';
import { natsWrapper } from '../nats/nats-wrapper.js';

const router = express.Router();

router.put(
  '/api/tickets/:id',
  requireAuth,
  ticketValidators,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    const { title, price } = req.body;
    const { id } = req.params;

    if (!req.currentUser) {
      return next(new NotAuthorizedError('You must be logged in.'));
    }

    const ticket = await Ticket.findById(id);

    if (!ticket) {
      return next(new NotFoundError());
    }

    if (ticket.userId !== req.currentUser.id) {
      return next(
        new NotAuthorizedError('You are not the owner of the ticket.'),
      );
    }

    if (ticket.orderId) {
      return next(
        new BadRequestError(
          'This ticket is currently reserved and can not be edited at this time.',
        ),
      );
    }

    ticket.title = title;
    ticket.price = price;

    await ticket.save();

    new TicketUpdatedPublisher(natsWrapper.client).publish({
      id: ticket.id,
      version: ticket.version,
      title: ticket.title,
      price: ticket.price,
      userId: ticket.userId,
    });

    res.status(StatusCodes.OK).send(ticket);
  },
);

export { router as updateTicketRouter };
