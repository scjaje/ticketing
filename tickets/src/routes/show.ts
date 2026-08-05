import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import {
  NotAuthorizedError,
  NotFoundError,
  requireAuth,
  StatusCodes,
  validateRequest,
} from '@scott-tickets/common';
import { body } from 'express-validator';
import { Ticket } from '../models/ticket.js';

const router = express.Router();

router.get(
  '/api/tickets/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const ticket = await Ticket.findById(id);

    if (!ticket) {
      return next(new NotFoundError());
    }

    res.status(StatusCodes.OK).send(ticket);
  },
);

router.get(
  '/api/tickets',
  async (req: Request, res: Response, next: NextFunction) => {
    const tickets = await Ticket.find({ orderId: { $exists: false } });

    res.status(StatusCodes.OK).send(tickets);
  },
);

export { router as showTicketRouter };
