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
import { Order } from '../models/order.js';

const router = express.Router();

router.get(
  '/api/orders',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.currentUser) {
      return next(new NotAuthorizedError('You must be logged in.'));
    }

    const order = await Order.find({
      userId: req.currentUser.id,
    }).populate('ticket');

    if (!order) {
      return next(new NotFoundError());
    }

    res.status(StatusCodes.OK).send(order);
  },
);

router.get(
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

    res.status(StatusCodes.OK).send(order);
  },
);

export { router as showOrderRouter };
