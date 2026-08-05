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
import { Order, OrderStatus } from '../models/order.js';
import { orderValidators } from './validators.js';
import { natsWrapper } from '../nats/nats-wrapper.js';
import { OrderCancelledPublisher } from '../events/publishers/order-cancelled-publisher.js';

const router = express.Router();

router.delete(
  '/api/orders/:orderId',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.currentUser) {
      return next(new NotAuthorizedError('You must be logged in.'));
    }

    const order = await Order.findById(req.params.orderId).populate('ticket');

    if (!order) {
      return next(new NotFoundError());
    }
    if (order.userId !== req.currentUser.id) {
      throw new NotAuthorizedError('You are not authorized to see this ticket');
    }

    if (!order.ticket) {
      throw new Error('Order has no ticket.');
    }

    if (order.status === OrderStatus.Complete) {
      throw new BadRequestError('Cannot cancel a completed order.');
    }

    const ticketId = order.ticket.id;

    order.status = OrderStatus.Cancelled;

    const updatedOrder = await order.save();

    // Publish event that order was cancelled

    new OrderCancelledPublisher(natsWrapper.client).publish({
      id: order.id,
      version: order.version,
      ticket: {
        id: ticketId,
      },
    });

    res.status(StatusCodes.OK).send(updatedOrder);
  },
);

export { router as deleteOrderRouter };
