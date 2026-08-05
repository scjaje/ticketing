import {
  BadRequestError,
  NotAuthorizedError,
  NotFoundError,
  OrderStatus,
  requireAuth,
  validateRequest,
  withAuth,
  type AuthenticatedRequest,
} from '@scott-tickets/common';
import express, { type Response } from 'express';
import { newValidators } from './validators.js';
import { Order } from '../models/order.js';
import { stripe } from '../stripe/stripe.js';
import { Payment } from '../models/payment.js';
import { PaymentCreatedPublisher } from '../events/publishers/payment-created-event.js';
import { natsWrapper } from '../nats/nats-wrapper.js';

const router = express.Router();

router.post(
  '/api/payments',
  requireAuth,
  newValidators,
  validateRequest,
  withAuth(async (req: AuthenticatedRequest, res: Response) => {
    const { paymentMethodId, orderId } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      throw new NotFoundError();
    }

    if (order.userId !== req.currentUser.id) {
      throw new NotAuthorizedError('You are not authorized.');
    }

    if (order.status === OrderStatus.Cancelled) {
      throw new BadRequestError(
        'Cannot purchase a cancelled or expired order.',
      );
    }

    if (order.status === OrderStatus.Complete) {
      throw new BadRequestError('Cannot purchase a completed order.');
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: order.price * 100,
      currency: 'usd',
      payment_method: paymentMethodId,
      payment_method_types: ['card'],
      confirm: true,
      description: 'Test ticket charges',
    });

    if (paymentIntent.status !== 'succeeded') {
      throw new BadRequestError('Payment could not be completed.');
    }

    const payment = Payment.build({
      orderId: orderId,
      stripeId: paymentIntent.id,
    });

    await payment.save();

    await new PaymentCreatedPublisher(natsWrapper.client).publish({
      id: payment.id,
      orderId: payment.orderId,
      stripeId: payment.stripeId,
    });

    res.send({ id: payment.id });
  }),
);

export { router as createChargeRouter };
