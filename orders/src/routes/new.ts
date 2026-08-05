import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import {
  BadRequestError,
  NotAuthorizedError,
  NotFoundError,
  OrderStatus,
  requireAuth,
  StatusCodes,
  validateRequest,
} from '@scott-tickets/common';
import { Order, Ticket } from '../models/index.js';
import { orderValidators } from './validators.js';
import { OrderCreatedPublisher } from '../events/publishers/order-created-publisher.js';
import { natsWrapper } from '../nats/nats-wrapper.js';

const router = express.Router();

// Sets the expiration for purchasing a ticket to 15 mins in seconds.
// const EXPIRATION_WINDOW_SECONDS = 15 * 60;

// Sets the expiration for purchasing a ticket to 1 min in seconds for testing.
const EXPIRATION_WINDOW_SECONDS = 1 * 60;

router.post(
  '/api/orders',
  requireAuth,
  orderValidators,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    // Find the ticket the user is trying to order in the database
    const { ticketId } = req.body;

    if (!req.currentUser) {
      return next(new NotAuthorizedError('You must be logged in.'));
    }

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      throw new NotFoundError();
    }

    // Make sure that this ticket is not already reserved
    // Run query to look at all orders. Find an order where the ticket
    // is the ticket we just found above and the orders status is not cancelled.
    // If we find an order from that, that means the ticket is reserved.
    const isReserved = await ticket.isReserved();
    if (isReserved) {
      throw new BadRequestError('Ticket is currently reserved.');
    }

    // Calculate an expiration date for this order
    const expiration = new Date();

    expiration.setSeconds(expiration.getSeconds() + EXPIRATION_WINDOW_SECONDS);

    // Build the order and save it to the database
    const order = Order.build({
      userId: req.currentUser.id,
      status: OrderStatus.Created,
      expiresAt: expiration,
      ticket: ticket,
    });

    await order.save();

    // Publish an event that an order was created
    new OrderCreatedPublisher(natsWrapper.client).publish({
      id: order.id,
      version: order.version,
      status: order.status,
      userId: order.userId,
      expiresAt: order.expiresAt.toISOString(),
      ticket: {
        id: ticket.id,
        price: ticket.price,
      },
    });

    res.status(StatusCodes.CREATED).send(order);
  },
);

export { router as createOrderRouter };
