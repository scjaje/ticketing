import { type Message } from 'node-nats-streaming';
import {
  Subjects,
  Listener,
  type PaymentCreatedEvent,
} from '@scott-tickets/common';
import { queueGroupName } from './queue-group-name.js';
import { Order, OrderStatus } from '../../models/order.js';
import { OrderUpdatedPublisher } from '../publishers/order-updated-publisher.js';
import { natsWrapper } from '../../nats/nats-wrapper.js';
import { Payment } from '../../models/payment.js';

export class PaymentCreatedListener extends Listener<PaymentCreatedEvent> {
  subject: Subjects.PaymentCreated = Subjects.PaymentCreated;
  queueGroupName = queueGroupName;

  async onMessage(data: PaymentCreatedEvent['data'], msg: Message) {
    const { orderId, id, stripeId } = data;

    const payment = Payment.build({ orderId, id, stripeId });
    await payment.save();

    const order = await Order.findById(orderId).populate('ticket');

    if (!order || !order.ticket) {
      throw new Error('The order was not found');
    }

    if (order.status === OrderStatus.Cancelled) {
      // A charge succeeded for an order that got cancelled in the meantime
      // (race between the payment going through and the order being
      // cancelled/expired). Money already moved, so we can't silently mark
      // this order Complete over a cancellation, and we can't just skip it
      // either — the Payment record above is the audit trail, but this
      // charge still needs a human to review and issue a refund. Ack
      // (rather than throw) so this doesn't get redelivered forever —
      // retrying can't fix this on its own, and would also fail trying to
      // re-save the same Payment _id above.
      console.error(
        `PAYMENT/ORDER MISMATCH: payment ${payment.id} (stripe charge ${stripeId}) succeeded for order ${order.id}, but that order is already Cancelled. This charge needs manual refund review.`,
      );
      return msg.ack();
    }

    order.status = OrderStatus.Complete;
    order.payment = payment;

    await order.save();

    await new OrderUpdatedPublisher(natsWrapper.client).publish({
      id: order.id,
      version: order.version,
      status: order.status,
      ticket: {
        id: order.ticket.id,
      },
    });
    msg.ack();
  }
}
